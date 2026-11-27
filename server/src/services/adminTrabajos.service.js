import * as repo from '../repositories/adminTrabajos.repository.js';
import * as fuentes from '../repositories/adminFuentes.repository.js';
import { CATALOGOS } from '../config/catalogos.js';
import HttpError from '../utils/HttpError.js';

// HU-7 · Supervisión de trabajos (coordinación). Solo lectura. No conoce Express ni Sequelize.
// Datos de HU-2/HU-3 desde adminTrabajos.repository; entregables y sustentación (HU-4/HU-6) desde adminFuentes.

export const ESTADOS = [
  { valor: 'propuesta', etiqueta: 'Propuesta' },
  { valor: 'en_desarrollo', etiqueta: 'En desarrollo' },
  { valor: 'concluido', etiqueta: 'Concluido' },
  { valor: 'desistido', etiqueta: 'Desistido' },
];
const VALORES_ESTADO = ESTADOS.map((e) => e.valor);
/** Igual que HU-4: vencido = entregable 'pendiente' con fecha límite pasada. */
export const ESTADOS_VENCIBLES = [fuentes.ESTADO_VENCIBLE];
const SIN_ASESOR = 'sin_asesor';
/** Estado con que se muestra una asesoría aceptada que luego el asesor terminó (historial_asesorias). */
const ASESORIA_FINALIZADA = 'finalizada';

const LIMITE_DEFECTO = 20;
const LIMITE_MAXIMO = 100;
const Q_MAXIMO = 100;
const ID_MAXIMO = 20;

/* ─────────── Utilidades ─────────── */

/** Entero positivo opcional de la query: undefined → valor por defecto; inválido → { error }. */
function leerEntero(valor, porDefecto) {
  if (valor === undefined || valor === '') return { valor: porDefecto };
  if (typeof valor !== 'string' || !/^\d+$/.test(valor)) return { error: true };
  return { valor: Number(valor) };
}

/** Id de texto opcional: undefined → sin filtro; inválido → { error }. */
function leerId(valor) {
  if (valor === undefined || valor === '') return {};
  if (typeof valor !== 'string' || valor.length > ID_MAXIMO) return { error: true };
  return { valor };
}

const nombreCompleto = (u) => `${u.nombres} ${u.apellidos}`.trim();

function persona(u) {
  return u ? { id: u.id, nombre: nombreCompleto(u), apellidos: u.apellidos } : null;
}

/** Avance = peso aprobado / peso total, entero 0–100; 0 si no hay entregables. */
export function porcentaje({ pesoAprobado, pesoTotal }) {
  return pesoTotal > 0 ? Math.round((100 * pesoAprobado) / pesoTotal) : 0;
}

/** Responsable primero; luego por apellidos y nombres. */
function ordenarEquipo(integrantes) {
  return [...integrantes].sort(
    (a, b) =>
      Number(b.esResponsable) - Number(a.esResponsable) ||
      a.estudiante.apellidos.localeCompare(b.estudiante.apellidos, 'es') ||
      a.estudiante.nombres.localeCompare(b.estudiante.nombres, 'es')
  );
}

function agrupar(filas, clave) {
  const mapa = new Map();
  for (const fila of filas) {
    if (!mapa.has(fila[clave])) mapa.set(fila[clave], []);
    mapa.get(fila[clave]).push(fila);
  }
  return mapa;
}

/** HU-3 guarda '' cuando el trabajo no tiene carrera: se devuelve null. */
const carreraONulo = (c) => (c ? c : null);

const vistaPeriodo = (p) => (p ? { id: p.id, semestre: p.semestre } : null);

/**
 * asesorias[] de la ficha a partir de solicitudes + historial_asesorias (HU-3).
 * Una solicitud aceptada con su fila en el historial (mismo asesor) se muestra finalizada con fecha y motivo de fin;
 * las filas del historial sin solicitud se agregan como finalizadas.
 */
function armarAsesorias(solicitudes, terminadas) {
  const pendientesDeUsar = [...terminadas];
  const tomarFin = (asesorId) => {
    const i = pendientesDeUsar.findIndex((h) => h.asesorId === asesorId);
    return i === -1 ? null : pendientesDeUsar.splice(i, 1)[0];
  };

  const desdeSolicitudes = solicitudes.map((s) => {
    const fin = s.estado === 'aceptada' ? tomarFin(s.asesorId) : null;
    return {
      id: s.id,
      asesor: persona(s.asesor),
      estado: fin ? ASESORIA_FINALIZADA : s.estado,
      fechaSolicitud: s.fecha,
      fechaInicio: s.estado === 'aceptada' ? (s.resueltaEl ?? null) : null,
      fechaFin: fin?.fecha ?? null,
      motivoRechazo: s.estado === 'rechazada' ? (s.motivo ?? null) : null,
      motivoFin: fin?.motivo ?? null,
    };
  });

  const sinSolicitud = pendientesDeUsar.map((h) => ({
    id: `ha-${h.id}`,
    asesor: persona(h.asesor),
    estado: ASESORIA_FINALIZADA,
    fechaSolicitud: null,
    fechaInicio: null,
    fechaFin: h.fecha,
    motivoRechazo: null,
    motivoFin: h.motivo,
  }));

  const fechaOrden = (a) => String(a.fechaSolicitud ?? a.fechaFin ?? '');
  return [...desdeSolicitudes, ...sinSolicitud].sort((a, b) => fechaOrden(b).localeCompare(fechaOrden(a)));
}

/* ─────────── Listado ─────────── */

export async function listar({ estado, lineaId, asesorId, carrera, periodoId, q, page, limit } = {}) {
  const campos = {};

  if (estado !== undefined && estado !== '' && !VALORES_ESTADO.includes(estado)) campos.estado = 'Estado no válido.';

  const linea = leerId(lineaId);
  if (linea.error) campos.lineaId = 'Línea no válida.';

  const asesor = leerId(asesorId);
  if (asesor.error) campos.asesorId = 'Asesor no válido.';

  if (carrera !== undefined && carrera !== '' && !CATALOGOS.carreras.includes(carrera)) campos.carrera = 'Carrera no válida.';

  const periodo = leerEntero(periodoId, undefined);
  if (periodo.error || (periodo.valor !== undefined && periodo.valor < 1)) campos.periodoId = 'Periodo no válido.';

  let texto = '';
  if (q !== undefined) {
    if (typeof q !== 'string') campos.q = 'La búsqueda no es válida.';
    else {
      texto = q.trim();
      if (texto.length > Q_MAXIMO) campos.q = `La búsqueda admite hasta ${Q_MAXIMO} caracteres.`;
    }
  }

  const pagina = leerEntero(page, 1);
  if (pagina.error || pagina.valor < 1) campos.page = 'La página debe ser un entero mayor o igual a 1.';

  const limite = leerEntero(limit, LIMITE_DEFECTO);
  if (limite.error || limite.valor < 1 || limite.valor > LIMITE_MAXIMO) {
    campos.limit = `El límite debe ser un entero de 1 a ${LIMITE_MAXIMO}.`;
  }

  if (Object.keys(campos).length) throw new HttpError(400, 'Revisa los filtros del listado.', { campos });

  const { filas, total } = await repo.listarPaginado({
    estado: estado || undefined,
    lineaId: linea.valor,
    asesorId: asesor.valor === SIN_ASESOR ? undefined : asesor.valor,
    sinAsesor: asesor.valor === SIN_ASESOR,
    carrera: carrera || undefined,
    periodoId: periodo.valor,
    q: texto || undefined,
    limite: limite.valor,
    desplazamiento: (pagina.valor - 1) * limite.valor,
  });

  const ids = filas.map((t) => t.id);
  const [integrantes, asignados, pesos, periodos] = await Promise.all([
    repo.integrantesDeTrabajos(ids),
    repo.asesoresDeTrabajos(ids),
    fuentes.pesosPorTrabajo(ids),
    repo.periodosPorIds([...new Set(filas.map((t) => t.periodoId))]),
  ]);

  const equipos = agrupar(integrantes, 'trabajoId');
  const asesores = new Map(asignados.map((a) => [a.trabajoId, a.asesor]));
  const avances = new Map(pesos.map((p) => [p.trabajoId, porcentaje(p)]));
  const periodosPorId = new Map(periodos.map((p) => [p.id, p]));

  return {
    trabajos: filas.map((t) => ({
      id: t.id,
      codigo: t.codigo,
      titulo: t.titulo,
      estado: t.estado,
      carrera: carreraONulo(t.carrera),
      linea: t.linea,
      periodo: vistaPeriodo(periodosPorId.get(t.periodoId)),
      fechaRegistro: t.fechaRegistro,
      equipo: ordenarEquipo(equipos.get(t.id) ?? []).map((i) => i.estudiante.apellidos),
      asesor: persona(asesores.get(t.id)),
      avance: avances.get(t.id) ?? 0,
    })),
    paginacion: {
      pagina: pagina.valor,
      limite: limite.valor,
      total,
      totalPaginas: Math.ceil(total / limite.valor),
    },
  };
}

/* ─────────── Filtros ─────────── */

export async function filtros() {
  const [lineas, asesores, periodos] = await Promise.all([
    repo.listarLineas(),
    repo.asesoresConTrabajos(),
    repo.listarPeriodos(),
  ]);
  return {
    lineas,
    asesores: asesores.map(persona),
    carreras: CATALOGOS.carreras,
    estados: ESTADOS,
    periodos,
  };
}

/* ─────────── Ficha de detalle ─────────── */

export async function detalle(id) {
  const trabajo = typeof id === 'string' && id.length <= ID_MAXIMO ? await repo.buscarTrabajo(id) : null;
  if (!trabajo) throw new HttpError(404, 'No existe el trabajo.');

  const [integrantes, asignados, periodos, motivoEstado, solicitudes, terminadas, entregables, pesos, sustentacion] =
    await Promise.all([
      repo.integrantesDeTrabajos([id]),
      repo.asesoresDeTrabajos([id]),
      repo.periodosPorIds([trabajo.periodoId]),
      repo.ultimoMotivoEstado(id),
      repo.solicitudesDeTrabajo(trabajo.codigo),
      repo.asesoriasTerminadas(trabajo.codigo),
      fuentes.entregablesDeTrabajo(id),
      fuentes.pesosPorTrabajo([id]),
      fuentes.sustentacionDeTrabajo(id),
    ]);

  const asesor = asignados[0]?.asesor ?? null;

  return {
    id: trabajo.id,
    codigo: trabajo.codigo,
    titulo: trabajo.titulo,
    resumen: trabajo.resumen,
    objetivos: trabajo.objetivos,
    palabrasClave: trabajo.palabrasClave ?? [],
    estado: trabajo.estado,
    motivoEstado,
    carrera: carreraONulo(trabajo.carrera),
    linea: trabajo.linea,
    periodo: vistaPeriodo(periodos[0]),
    fechaRegistro: trabajo.fechaRegistro,
    equipo: ordenarEquipo(integrantes).map(({ estudiante, esResponsable }) => ({
      id: estudiante.id,
      nombreCompleto: nombreCompleto(estudiante),
      codigo: estudiante.codigoAlumno ?? null,
      carrera: estudiante.carrera ?? null,
      esResponsable,
    })),
    asesor: asesor ? { ...persona(asesor), gradoAcademico: asesor.gradoAcademico ?? null, correo: asesor.correo } : null,
    asesorias: armarAsesorias(solicitudes, terminadas),
    entregables,
    avance: pesos[0] ? porcentaje(pesos[0]) : 0,
    sustentacion: sustentacion
      ? {
          id: sustentacion.id,
          fecha: sustentacion.fecha,
          hora: sustentacion.hora,
          modalidad: sustentacion.modalidad,
          sala: sustentacion.sala,
          estado: sustentacion.estado,
          calificacion: sustentacion.calificacion,
          jurado: sustentacion.jurado.map((j) => ({ id: j.id, nombre: j.nombre, apellidos: j.apellidos, cargo: j.cargo })),
        }
      : null,
  };
}
