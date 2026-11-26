import * as repo from '../repositories/adminTrabajos.repository.js';
import { CATALOGOS } from '../config/catalogos.js';
import HttpError from '../utils/HttpError.js';

// HU-7 · Supervisión de trabajos (coordinación). Solo lectura. No conoce Express ni Sequelize.

const ESTADOS = [
  { valor: 'propuesta', etiqueta: 'Propuesta' },
  { valor: 'en_desarrollo', etiqueta: 'En desarrollo' },
  { valor: 'concluido', etiqueta: 'Concluido' },
  { valor: 'desistido', etiqueta: 'Desistido' },
];
const VALORES_ESTADO = ESTADOS.map((e) => e.valor);
const ESTADOS_VENCIBLES = ['pendiente', 'observado'];
const SIN_ASESOR = 'sin_asesor';

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

/** TFC-<semestre>-<número del id>; si el id no es t-<n>, el sufijo va en mayúsculas. */
export function codigo(trabajo) {
  const sufijo = trabajo.id.startsWith('t-') ? trabajo.id.slice(2) : trabajo.id;
  return `TFC-${trabajo.periodo?.semestre ?? ''}-${sufijo.toUpperCase()}`;
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

const numeroONulo = (v) => (v === null || v === undefined ? null : Number(v));

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
  const [integrantes, vigentes, pesos] = await Promise.all([
    repo.integrantesDeTrabajos(ids),
    repo.asesoriasVigentes(ids),
    repo.pesosPorTrabajo(ids),
  ]);

  const equipos = agrupar(integrantes, 'trabajoId');
  const asesores = new Map(vigentes.map((a) => [a.trabajoId, a.asesor]));
  const avances = new Map(pesos.map((p) => [p.trabajoId, porcentaje(p)]));

  return {
    trabajos: filas.map((t) => ({
      id: t.id,
      codigo: codigo(t),
      titulo: t.titulo,
      estado: t.estado,
      carrera: t.carrera,
      linea: t.linea,
      periodo: t.periodo,
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
    repo.lineasActivas(),
    repo.asesoresConAsesorias(),
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

  const [integrantes, vigentes, historial, entregables, pesos, sustentacion] = await Promise.all([
    repo.integrantesDeTrabajos([id]),
    repo.asesoriasVigentes([id]),
    repo.historialAsesorias(id),
    repo.entregablesConAvances(id),
    repo.pesosPorTrabajo([id]),
    repo.ultimaSustentacion(id),
  ]);

  const ahora = new Date();
  const vigente = vigentes[0]?.asesor ?? null;

  return {
    id: trabajo.id,
    codigo: codigo(trabajo),
    titulo: trabajo.titulo,
    resumen: trabajo.resumen,
    objetivos: trabajo.objetivos,
    palabrasClave: trabajo.palabrasClave ?? [],
    estado: trabajo.estado,
    motivoEstado: trabajo.motivoEstado ?? null,
    carrera: trabajo.carrera,
    linea: trabajo.linea,
    periodo: trabajo.periodo,
    fechaRegistro: trabajo.fechaRegistro,
    equipo: ordenarEquipo(integrantes).map(({ estudiante, esResponsable }) => ({
      id: estudiante.id,
      nombreCompleto: nombreCompleto(estudiante),
      codigo: estudiante.codigoAlumno ?? null,
      carrera: estudiante.carrera ?? null,
      esResponsable,
    })),
    asesor: vigente
      ? { ...persona(vigente), gradoAcademico: vigente.gradoAcademico ?? null, correo: vigente.correo }
      : null,
    asesorias: historial.map((a) => ({
      id: a.id,
      asesor: persona(a.asesor),
      estado: a.estado,
      fechaSolicitud: a.fechaSolicitud,
      fechaInicio: a.fechaInicio,
      fechaFin: a.fechaFin,
      motivoRechazo: a.motivoRechazo,
      motivoFin: a.motivoFin,
    })),
    entregables: entregables.map((e) => {
      const ultimo = e.avances?.[0] ?? null;
      return {
        id: e.id,
        nombre: e.nombre,
        peso: Number(e.peso),
        obligatorio: e.obligatorio,
        estado: e.estado,
        fechaLimite: e.fechaLimite,
        vencido: new Date(e.fechaLimite) < ahora && ESTADOS_VENCIBLES.includes(e.estado),
        ultimoAvance: ultimo
          ? {
              id: ultimo.id,
              version: ultimo.version,
              fechaEntrega: ultimo.fechaEntrega,
              fechaRevision: ultimo.fechaRevision,
              resultado: ultimo.resultado ?? null,
            }
          : null,
      };
    }),
    avance: pesos[0] ? porcentaje(pesos[0]) : 0,
    sustentacion: sustentacion
      ? {
          id: sustentacion.id,
          fecha: sustentacion.fecha,
          hora: sustentacion.hora,
          modalidad: sustentacion.modalidad,
          sala: sustentacion.sala ?? null,
          estado: sustentacion.estado,
          calificacion: numeroONulo(sustentacion.calificacion),
          jurado: (sustentacion.jurados ?? []).map((j) => ({ ...persona(j.jurado), cargo: j.cargo ?? null })),
        }
      : null,
  };
}
