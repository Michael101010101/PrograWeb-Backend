import * as repo from '../repositories/adminAsesores.repository.js';
import * as fuentes from '../repositories/adminFuentes.repository.js';
import * as asesores from '../repositories/asesores.repository.js';
import * as periodos from '../repositories/periodos.repository.js';
import { enTransaccion } from '../repositories/transaccion.js';
import { porcentaje } from './adminTrabajos.service.js';
import HttpError from '../utils/HttpError.js';

// HU-7 · Carga por asesor (coordinación). No conoce Express ni Sequelize.
// El asesor es la ficha de HU-3 (tabla asesores, id a-xx). Su cupo vigente es asesores.cupoMaximo;
// HU-7 guarda el historial de cambios en cupos_asesor.

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

const SOLO_ACTIVOS = 'Solo se amplía el cupo de asesores activos.';

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

const nombreCompleto = (a) => `${a.nombres} ${a.apellidos}`.trim();

async function obtenerAsesor(id) {
  const asesor = typeof id === 'string' && id.length <= ID_MAXIMO ? await repo.buscarAsesor(id) : null;
  if (!asesor) throw new HttpError(404, 'No existe el asesor.');
  return asesor;
}

/** Lanza las consultas por lote y devuelve mapas por asesorId. */
async function cargarMetricas(lista, periodoId) {
  const ids = lista.map((a) => a.id);
  const [porRevisar, conCupoEnPeriodo, tiempos] = await Promise.all([
    fuentes.avancesPorRevisar(ids),
    repo.asesoresConCupoEnPeriodo(ids, periodoId),
    fuentes.tiemposRevision(lista),
  ]);
  return {
    porRevisar: new Map(porRevisar.map((p) => [p.asesorId, p.total])),
    conCupoEnPeriodo: new Set(conCupoEnPeriodo),
    tiempos: new Map(tiempos.map((t) => [t.asesorId, t.dias])),
  };
}

/** Misma forma que la rama ariana-h7-api. trabajosACargo = cupoOcupado (contador oficial de HU-3). */
function resumen(a, m) {
  return {
    id: a.id,
    nombreCompleto: nombreCompleto(a),
    gradoAcademico: a.gradoAcademico ?? null,
    departamento: a.departamento ?? null,
    correo: a.correo,
    estado: a.estado,
    lineas: [...(a.lineas ?? [])].sort((x, y) => x.localeCompare(y, 'es')),
    trabajosACargo: a.cupoOcupado,
    cupoMaximo: a.cupoMaximo,
    cupoOrigen: m.conCupoEnPeriodo.has(a.id) ? 'periodo' : 'perfil',
    cupoDisponible: a.cupoMaximo - a.cupoOcupado,
    avancesPorRevisar: m.porRevisar.get(a.id) ?? 0,
    tiempoRevisionPromedioDias: m.tiempos.get(a.id) ?? null,
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

  const metricas = await cargarMetricas(filas, periodo?.id);

  return {
    asesores: filas.map((a) => resumen(a, metricas)),
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
  const [periodo, trabajos] = await Promise.all([periodos.buscarActivo(), repo.trabajosDeAsesor(id)]);
  const [metricas, pesos] = await Promise.all([
    cargarMetricas([asesor], periodo?.id),
    fuentes.pesosPorTrabajo(trabajos.map((t) => t.id)),
  ]);
  const avances = new Map(pesos.map((p) => [p.trabajoId, porcentaje(p)]));

  return {
    ...resumen(asesor, metricas),
    experiencia: asesor.experiencia ?? null,
    periodo: vistaPeriodo(periodo),
    trabajos: trabajos.map((t) => ({
      id: t.id,
      codigo: t.codigo,
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
    throw new HttpError(409, SOLO_ACTIVOS, { datos: { estado: asesor.estado } });
  }

  const periodo = await periodos.buscarActivo();
  if (!periodo) throw new HttpError(409, 'No hay un periodo activo para registrar el cupo.');

  // Dos cambios que van juntos: el cupo vigente (asesores, HU-3) y su historial (cupos_asesor, HU-7)
  const { cupo, cupoAnterior } = await enTransaccion(async (opciones) => {
    // Bloquea la fila del asesor (SELECT … FOR UPDATE) y vuelve a verificar estado y cupo
    const actual = await asesores.buscarParaActualizar(id, opciones);
    if (!actual) throw new HttpError(404, 'No existe el asesor.');
    const vigente = await repo.buscarAsesor(id, opciones);
    if (vigente.estado !== 'activo') throw new HttpError(409, SOLO_ACTIVOS, { datos: { estado: vigente.estado } });

    if (cupoMaximo <= actual.cupoMaximo) {
      throw new HttpError(409, `El nuevo cupo debe ser mayor al actual (${actual.cupoMaximo}).`, {
        campos: { cupoMaximo: `Debe ser mayor a ${actual.cupoMaximo}.` },
        datos: { cupoActual: actual.cupoMaximo },
      });
    }

    await asesores.actualizar(id, { cupoMaximo, sinCupoDesde: null }, opciones);
    const registro = await repo.registrarCupo(
      { asesorId: id, periodoId: periodo.id, cupoAnterior: actual.cupoMaximo, cupoMaximo, motivo: m.texto, modificadoPor: coordinadorId },
      opciones
    );
    return { cupo: registro, cupoAnterior: actual.cupoMaximo };
  });

  const actualizado = await repo.buscarAsesor(id);
  const metricas = await cargarMetricas([actualizado], periodo.id);
  return {
    asesor: resumen(actualizado, metricas),
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
    asesorId: asesor.id,
    asunto: a.texto,
    cuerpo: c.texto,
  });

  return {
    id: mensaje.id,
    remitenteId: mensaje.remitenteId,
    destinatarioId: mensaje.asesorId,
    asunto: mensaje.asunto,
    contenido: mensaje.cuerpo,
    leido: mensaje.leido,
    creadoEn: mensaje.creadoEn,
  };
}
