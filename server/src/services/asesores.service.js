import * as asesores from '../repositories/asesores.repository.js';
import * as trabajos from '../repositories/trabajos.repository.js';
import * as solicitudes from '../repositories/solicitudes.repository.js';
import * as historial from '../repositories/historial.repository.js';
import { enTransaccion } from '../repositories/transaccion.js';
import { CATALOGOS } from '../config/catalogos.js';
import HttpError from '../utils/HttpError.js';
import { hoyEnLima } from '../utils/fechas.js';

// Lógica de negocio de la HU-3 · Asesores (directorio, ficha y asesorados).
// No conoce Express (req/res) ni Sequelize: usa repositorios y lanza HttpError.

const TITULOS = { Ingeniero: 'Ing.', Magíster: 'Mg.', Doctor: 'Dr.' };
const MAX_LINEAS = 3;
const MAX_EXPERIENCIA = 800;

export const cupoDisponible = (asesor) => asesor.cupoMaximo - asesor.cupoOcupado;

/** Asesor con los datos calculados que muestra el front (nombre completo, iniciales y cupo disponible). */
export function aPublico(asesor) {
  if (!asesor) return null;
  return {
    ...asesor,
    nombre: `${asesor.titulo} ${asesor.nombres} ${asesor.apellidos}`,
    iniciales: `${asesor.nombres[0]}${asesor.apellidos[0]}`.toUpperCase(),
    cupoDisponible: cupoDisponible(asesor),
  };
}

/** Número entero de la query (?pagina=2) con valor por defecto y límites. */
function entero(valor, porDefecto, minimo, maximo) {
  const n = Number.parseInt(valor, 10);
  if (Number.isNaN(n)) return porDefecto;
  return Math.min(Math.max(n, minimo), maximo);
}

/** Ficha del asesor que inició sesión, o 404 si la coordinación aún no la registró. */
export async function asesorDelUsuario(usuarioId) {
  const asesor = await asesores.buscarPorUsuarioId(usuarioId);
  if (!asesor) throw new HttpError(404, 'Tu ficha de asesor aún no está registrada.');
  return asesor;
}

/* ─────────── Directorio (público) ─────────── */

export async function listarDirectorio(query = {}) {
  const texto = String(query.texto ?? '').trim().slice(0, 60);
  const linea = String(query.linea ?? '').trim();
  const departamento = String(query.departamento ?? '').trim();
  const soloConCupo = query.soloConCupo === 'true';
  const orden = ['cupo', 'experiencia', 'nombre'].includes(query.orden) ? query.orden : 'cupo';
  const porPagina = entero(query.porPagina, 6, 1, 50);
  const pagina = entero(query.pagina, 1, 1, 1000);

  const errores = {};
  if (linea && !CATALOGOS.lineas.includes(linea)) errores.linea = 'La línea de investigación no existe';
  if (departamento && !CATALOGOS.departamentos.includes(departamento)) errores.departamento = 'El departamento no existe';
  if (Object.keys(errores).length > 0) throw new HttpError(400, 'Revisa los filtros.', { campos: errores });

  // Las tres consultas son independientes: se lanzan a la vez con Promise.all
  const [{ filas, total }, totalAsesores, conCupo] = await Promise.all([
    asesores.listar({ texto, linea, departamento, soloConCupo }, { orden, limite: porPagina, desplazamiento: (pagina - 1) * porPagina }),
    asesores.contar(),
    asesores.contarConCupo(),
  ]);

  return {
    asesores: filas.map(aPublico),
    total,
    pagina,
    porPagina,
    totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
    totalAsesores,
    conCupo,
  };
}

/** Los 3 asesores con más cupo, en el formato de la landing (integración con la HU-1). */
export async function destacados() {
  const lista = await asesores.conMasCupo(3);
  return lista.map((a) => ({
    id: a.id,
    iniciales: aPublico(a).iniciales,
    nombre: aPublico(a).nombre,
    departamento: a.departamento.replace('Ingeniería', 'Ing.'),
    linea: a.lineas[0],
    cupo: `${cupoDisponible(a)} de ${a.cupoMaximo}`,
  }));
}

/** Otros 2 asesores de la misma línea con cupo (modal "Este asesor no tiene cupo"). */
export async function alternativas(asesorId, lineaPedida) {
  const asesor = await asesores.buscarPorId(asesorId);
  if (!asesor) throw new HttpError(404, 'El asesor no existe.');
  const linea = CATALOGOS.lineas.includes(lineaPedida) ? lineaPedida : asesor.lineas[0];
  const lista = await asesores.alternativas(linea, asesor.id, 2);
  return { linea, asesores: lista.map(aPublico) };
}

/* ─────────── Mi ficha (asesor) ─────────── */

export async function miFicha(usuarioId) {
  const asesor = await asesorDelUsuario(usuarioId);
  const [aCargo, pendientes] = await Promise.all([
    trabajos.listarDeAsesor(asesor.id),
    solicitudes.contarPendientesDeAsesor(asesor.id),
  ]);
  return {
    asesor: aPublico(asesor),
    resumen: {
      trabajosACargo: aCargo.length,
      solicitudesPendientes: pendientes,
      avancesPorRevisar: aCargo.reduce((suma, t) => suma + t.porRevisar, 0),
      planesSinDefinir: aCargo.filter((t) => t.nota?.texto === 'Plan de entregables por definir').length,
    },
  };
}

export async function actualizarFicha(usuarioId, datos = {}) {
  const asesor = await asesorDelUsuario(usuarioId);

  const gradoAcademico = String(datos.gradoAcademico ?? '').trim();
  const departamento = String(datos.departamento ?? '').trim();
  const lineas = Array.isArray(datos.lineas) ? [...new Set(datos.lineas.map((l) => String(l).trim()))] : [];
  const experiencia = String(datos.experiencia ?? '').trim();
  const cupoMaximo = Number(datos.cupoMaximo);

  // Se juntan todos los errores para marcarlos a la vez en el formulario
  const errores = {};
  if (!TITULOS[gradoAcademico]) errores.gradoAcademico = 'Elige un grado académico válido';
  if (!CATALOGOS.departamentos.includes(departamento)) errores.departamento = 'Elige un departamento válido';
  if (lineas.length === 0) errores.lineas = 'Agrega al menos una línea de investigación.';
  else if (lineas.length > MAX_LINEAS) errores.lineas = `Puedes declarar hasta ${MAX_LINEAS} líneas.`;
  else if (lineas.some((l) => !CATALOGOS.lineas.includes(l))) errores.lineas = 'Hay una línea de investigación que no existe.';
  if (experiencia.length > MAX_EXPERIENCIA) errores.experiencia = `La experiencia no puede superar los ${MAX_EXPERIENCIA} caracteres.`;
  if (!Number.isInteger(cupoMaximo) || cupoMaximo < 1) errores.cupoMaximo = 'El cupo máximo debe ser un número entero mayor a 0.';
  else if (cupoMaximo < asesor.cupoOcupado) {
    errores.cupoMaximo = `El cupo máximo no puede ser menor a los ${asesor.cupoOcupado} trabajos a cargo.`;
  }
  if (Object.keys(errores).length > 0) {
    throw new HttpError(400, Object.values(errores)[0], { campos: errores });
  }

  // Si cambió el grado, cambia también el título que se muestra (Dr., Mg., Ing.)
  const titulo = gradoAcademico === asesor.gradoAcademico ? asesor.titulo : TITULOS[gradoAcademico];
  const sinCupoDesde = cupoMaximo === asesor.cupoOcupado ? (asesor.sinCupoDesde ?? hoyEnLima()) : null;

  const actualizado = await asesores.actualizar(asesor.id, {
    gradoAcademico, titulo, departamento, lineas, experiencia, cupoMaximo, sinCupoDesde,
  });
  return aPublico(actualizado);
}

/* ─────────── Mis asesorados (asesor) ─────────── */

export async function misAsesorados(usuarioId) {
  const asesor = await asesorDelUsuario(usuarioId);
  const lista = await trabajos.listarDeAsesor(asesor.id);
  return {
    trabajos: lista,
    avancesPorRevisar: lista.reduce((suma, t) => suma + t.porRevisar, 0),
    // HU-4: los entregables con fecha límite llegarán cuando exista su tabla
    vencimientos: [],
  };
}

export async function asesorado(usuarioId, codigo) {
  const asesor = await asesorDelUsuario(usuarioId);
  const trabajo = await trabajos.buscarPorCodigo(codigo);
  // Un asesor solo puede ver los trabajos que tiene a cargo
  if (!trabajo || trabajo.asesorId !== asesor.id) throw new HttpError(404, `El trabajo ${codigo} no está a tu cargo.`);
  return { trabajo, vencimientos: [] };
}

export async function terminarAsesoria(usuarioId, codigo, motivoIngresado) {
  const motivo = String(motivoIngresado ?? '').trim();
  if (motivo.length < 10) {
    throw new HttpError(400, 'Escribe un motivo de al menos 10 caracteres.', { campos: { motivo: 'Mínimo 10 caracteres' } });
  }
  const asesor = await asesorDelUsuario(usuarioId);

  // Tres cambios que van juntos: liberar el cupo, dejar el trabajo sin asesor y registrar el motivo
  return enTransaccion(async (opciones) => {
    const trabajo = await trabajos.buscarPorCodigo(codigo, opciones);
    if (!trabajo || trabajo.asesorId !== asesor.id) throw new HttpError(404, `El trabajo ${codigo} no está a tu cargo.`);
    if (trabajo.estado === 'concluido') throw new HttpError(409, 'El trabajo ya concluyó; no se puede terminar la asesoría.');

    const actual = await asesores.buscarParaActualizar(asesor.id, opciones);
    const actualizado = await asesores.actualizar(asesor.id, { cupoOcupado: actual.cupoOcupado - 1, sinCupoDesde: null }, opciones);
    await trabajos.actualizar(codigo, { asesorId: null, nota: null }, opciones);
    await historial.registrar({ trabajoCodigo: codigo, asesorId: asesor.id, motivo, fecha: hoyEnLima() }, opciones);

    return { asesor: aPublico(actualizado) };
  });
}
