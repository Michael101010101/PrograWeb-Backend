import * as repo from '../repositories/adminAsesores.repository.js';
import * as periodos from '../repositories/periodos.repository.js';
import { pesosPorTrabajo } from '../repositories/adminTrabajos.repository.js';
import { codigo, porcentaje } from './adminTrabajos.service.js';
import HttpError from '../utils/HttpError.js';

// HU-7 · Carga por asesor (coordinación). No conoce Express ni Sequelize.

const ESTADOS = ['activo', 'pendiente_validacion', 'bloqueado'];

const LIMITE_DEFECTO = 10;
const LIMITE_MAXIMO = 50;
const PAGINA_MAXIMA = 10000;
const Q_MAXIMO = 100;
const ID_MAXIMO = 20;
const CUPO_MAX = 10;
const MOTIVO_MIN = 10;
const MOTIVO_MAX = 300;
const ASUNTO_MIN = 3;
const ASUNTO_MAX = 120;
const CONTENIDO_MIN = 10;
const CONTENIDO_MAX = 1000;
const SEGUNDOS_POR_DIA = 86400;

/* ─────────── Utilidades ─────────── */

/** Entero positivo opcional de la query: undefined → valor por defecto; inválido → { error }. */
function leerEntero(valor, porDefecto) {
  if (valor === undefined || valor === '') return { valor: porDefecto };
  if (typeof valor !== 'string' || !/^\d+$/.test(valor)) return { error: true };
  return { valor: Number(valor) };
}

/** Texto obligatorio con largo mínimo y máximo (tras recortar). Devuelve { texto, error }. */
function leerTexto(valor, { min, max, vacio }) {
  const texto = typeof valor === 'string' ? valor.trim() : '';
  if (!texto) return { error: vacio };
  if (texto.length < min) return { error: `Escribe al menos ${min} caracteres (llevas ${texto.length}).` };
  if (texto.length > max) return { error: `Admite hasta ${max} caracteres (llevas ${texto.length}).` };
  return { texto };
}

const nombreCompleto = (u) => `${u.nombres} ${u.apellidos}`.trim();
const redondear1 = (n) => Math.round(n * 10) / 10;

async function obtenerAsesor(id) {
  const asesor = typeof id === 'string' && id.length <= ID_MAXIMO ? await repo.buscarAsesor(id) : null;
  if (!asesor) throw new HttpError(404, 'No existe el asesor.');
  return asesor;
}

/** Lanza las consultas por lote y devuelve mapas por asesorId. */
async function cargarMetricas(ids, periodoId) {
  const [lineas, cargas, cupos, porRevisar, tiempos] = await Promise.all([
    repo.lineasDeAsesores(ids),
    repo.trabajosACargo(ids),
    repo.cuposVigentes(ids, periodoId),
    repo.avancesPorRevisar(ids),
    repo.tiemposRevision(ids),
  ]);

  const lineasPorAsesor = new Map();
  for (const { asesorId, nombre } of lineas) {
    if (!lineasPorAsesor.has(asesorId)) lineasPorAsesor.set(asesorId, []);
    lineasPorAsesor.get(asesorId).push(nombre);
  }
  for (const lista of lineasPorAsesor.values()) lista.sort((a, b) => a.localeCompare(b, 'es'));

  return {
    lineas: lineasPorAsesor,
    cargas: new Map(cargas.map((c) => [c.asesorId, c.total])),
    cuposPeriodo: new Map(cupos.periodo.map((c) => [c.asesorId, c.cupoMaximo])),
    cuposPerfil: new Map(cupos.perfil.map((c) => [c.asesorId, c.cupoMaximo])),
    porRevisar: new Map(porRevisar.map((p) => [p.asesorId, p.total])),
    tiempos: new Map(tiempos.map((t) => [t.asesorId, t])),
  };
}

/** Cupo vigente: fila del periodo activo; si no hay, el del perfil; si tampoco, null. */
function cupoVigente(id, m) {
  if (m.cuposPeriodo.has(id)) return { cupoMaximo: m.cuposPeriodo.get(id), cupoOrigen: 'periodo' };
  if (m.cuposPerfil.has(id)) return { cupoMaximo: m.cuposPerfil.get(id), cupoOrigen: 'perfil' };
  return { cupoMaximo: null, cupoOrigen: null };
}

function resumen(u, m) {
  const trabajosACargo = m.cargas.get(u.id) ?? 0;
  const { cupoMaximo, cupoOrigen } = cupoVigente(u.id, m);
  const tiempo = m.tiempos.get(u.id);
  return {
    id: u.id,
    nombreCompleto: nombreCompleto(u),
    gradoAcademico: u.gradoAcademico ?? null,
    departamento: u.departamento ?? null,
    correo: u.correo,
    estado: u.estado,
    lineas: m.lineas.get(u.id) ?? [],
    trabajosACargo,
    cupoMaximo,
    cupoOrigen,
    cupoDisponible: cupoMaximo === null ? null : Math.max(0, cupoMaximo - trabajosACargo),
    avancesPorRevisar: m.porRevisar.get(u.id) ?? 0,
    tiempoRevisionPromedioDias:
      tiempo && tiempo.revisados > 0 ? redondear1(tiempo.segundos / tiempo.revisados / SEGUNDOS_POR_DIA) : null,
  };
}

const vistaPeriodo = (p) => (p ? { id: p.id, semestre: p.semestre } : null);

/* ─────────── Listado ─────────── */

export async function listar({ estado, q, page, limit } = {}) {
  const campos = {};

  if (estado !== undefined && estado !== '' && !ESTADOS.includes(estado)) campos.estado = 'Estado no válido.';

  let texto = '';
  if (q !== undefined) {
    if (typeof q !== 'string') campos.q = 'La búsqueda no es válida.';
    else {
      texto = q.trim();
      if (texto.length > Q_MAXIMO) campos.q = `La búsqueda admite hasta ${Q_MAXIMO} caracteres.`;
    }
  }

  const pagina = leerEntero(page, 1);
  if (pagina.error || pagina.valor < 1 || pagina.valor > PAGINA_MAXIMA) {
    campos.page = `La página debe ser un entero de 1 a ${PAGINA_MAXIMA}.`;
  }

  const limite = leerEntero(limit, LIMITE_DEFECTO);
  if (limite.error || limite.valor < 1 || limite.valor > LIMITE_MAXIMO) {
    campos.limit = `El límite debe ser un entero de 1 a ${LIMITE_MAXIMO}.`;
  }

  if (Object.keys(campos).length) throw new HttpError(400, 'Revisa los filtros del listado.', { campos });

  const [{ filas, total }, periodo] = await Promise.all([
    repo.listarPaginado({
      estado: estado || undefined,
      q: texto || undefined,
      limite: limite.valor,
      desplazamiento: (pagina.valor - 1) * limite.valor,
    }),
    periodos.buscarActivo(),
  ]);

  const metricas = await cargarMetricas(
    filas.map((u) => u.id),
    periodo?.id
  );

  return {
    asesores: filas.map((u) => resumen(u, metricas)),
    paginacion: {
      pagina: pagina.valor,
      limite: limite.valor,
      total,
      totalPaginas: Math.ceil(total / limite.valor),
    },
    periodo: vistaPeriodo(periodo),
  };
}

/* ─────────── Ficha ─────────── */

export async function detalle(id) {
  const asesor = await obtenerAsesor(id);
  const [periodo, trabajos] = await Promise.all([periodos.buscarActivo(), repo.trabajosVigentes(id)]);
  const [metricas, pesos] = await Promise.all([
    cargarMetricas([id], periodo?.id),
    pesosPorTrabajo(trabajos.map((t) => t.id)),
  ]);
  const avances = new Map(pesos.map((p) => [p.trabajoId, porcentaje(p)]));

  return {
    ...resumen(asesor, metricas),
    experiencia: asesor.experiencia,
    periodo: vistaPeriodo(periodo),
    trabajos: trabajos.map((t) => ({
      id: t.id,
      codigo: codigo(t),
      titulo: t.titulo,
      estado: t.estado,
      avance: avances.get(t.id) ?? 0,
    })),
  };
}

/* ─────────── Ampliar cupo ─────────── */

export async function ampliarCupo(id, { cupoMaximo, motivo } = {}, coordinadorId) {
  const campos = {};
  if (!Number.isInteger(cupoMaximo) || cupoMaximo < 1 || cupoMaximo > CUPO_MAX) {
    campos.cupoMaximo = `Ingresa un número entero de 1 a ${CUPO_MAX}.`;
  }
  const m = leerTexto(motivo, { min: MOTIVO_MIN, max: MOTIVO_MAX, vacio: 'Indica el motivo de la ampliación.' });
  if (m.error) campos.motivo = m.error;
  if (Object.keys(campos).length) throw new HttpError(400, 'Corrige los datos de la ampliación.', { campos });

  const asesor = await obtenerAsesor(id);
  if (asesor.estado !== 'activo') {
    throw new HttpError(409, 'Solo se amplía el cupo de asesores activos.', { datos: { estado: asesor.estado } });
  }

  const periodo = await periodos.buscarActivo();
  if (!periodo) throw new HttpError(409, 'No hay un periodo activo para registrar el cupo.');

  const resultado = await repo.registrarAmpliacion({
    asesorId: id,
    periodoId: periodo.id,
    cupoMaximo,
    motivo: m.texto,
    modificadoPor: coordinadorId,
  });

  if (resultado.conflicto === 'estado') throw new HttpError(409, 'Solo se amplía el cupo de asesores activos.');
  if (resultado.conflicto === 'sin_cupo') throw new HttpError(409, 'El asesor no tiene un cupo registrado.');
  if (resultado.conflicto === 'cupo') {
    throw new HttpError(409, `El nuevo cupo debe ser mayor al actual (${resultado.cupoActual}).`, {
      campos: { cupoMaximo: `Debe ser mayor a ${resultado.cupoActual}.` },
      datos: { cupoActual: resultado.cupoActual },
    });
  }

  const metricas = await cargarMetricas([id], periodo.id);
  const { cupo, cupoAnterior } = resultado;
  return {
    asesor: resumen(asesor, metricas),
    cupo: {
      id: cupo.id,
      cupoAnterior,
      cupoMaximo: cupo.cupoMaximo,
      motivo: cupo.motivo,
      periodoId: cupo.periodoId,
      modificadoPor: cupo.modificadoPor,
      creadoEn: cupo.creadoEn,
    },
  };
}

/* ─────────── Escribir al asesor ─────────── */

export async function escribir(id, { asunto, contenido } = {}, coordinadorId) {
  const campos = {};
  const a = leerTexto(asunto, { min: ASUNTO_MIN, max: ASUNTO_MAX, vacio: 'Indica el asunto.' });
  if (a.error) campos.asunto = a.error;
  const c = leerTexto(contenido, { min: CONTENIDO_MIN, max: CONTENIDO_MAX, vacio: 'Escribe el mensaje.' });
  if (c.error) campos.contenido = c.error;
  if (Object.keys(campos).length) throw new HttpError(400, 'Corrige los datos del mensaje.', { campos });

  const asesor = await obtenerAsesor(id);
  if (asesor.estado === 'bloqueado') {
    throw new HttpError(409, 'No se puede escribir a un asesor bloqueado.', { datos: { estado: asesor.estado } });
  }

  const mensaje = await repo.crearMensaje({
    remitenteId: coordinadorId,
    destinatarioId: id,
    asunto: a.texto,
    cuerpo: c.texto,
  });

  return {
    id: mensaje.id,
    remitenteId: mensaje.remitenteId,
    destinatarioId: mensaje.destinatarioId,
    asunto: mensaje.asunto,
    contenido: mensaje.cuerpo,
    leido: mensaje.leido,
    creadoEn: mensaje.creadoEn,
  };
}
