import { Op, fn, col } from 'sequelize';
import db from '../db/models/index.cjs';

// HU-7 · Repositorio de Tablero y Distribución (solo lectura, Sequelize).
// Lee periodos (HU-1), trabajos y lineas_investigacion (HU-2). Lo de HU-4/HU-6 está en adminFuentes.
// Todas las consultas son agrupadas: nunca una por trabajo. Los servicios no conocen Sequelize.

const { Trabajo, LineaInvestigacion, Periodo } = db;

function plano(instancia) {
  return instancia ? instancia.get({ plain: true }) : null;
}

/* ─────────── Periodo ─────────── */

export async function buscarPeriodo(id) {
  return plano(await Periodo.findByPk(id, { attributes: ['id', 'semestre'] }));
}

/* ─────────── Tablero ─────────── */

/** [{ estado, total }] de trabajos del periodo. */
export async function conteoPorEstado(periodoId) {
  const filas = await Trabajo.findAll({
    where: { periodoId },
    attributes: ['estado', [fn('COUNT', col('id')), 'total']],
    group: ['estado'],
    raw: true,
  });
  return filas.map((f) => ({ estado: f.estado, total: Number(f.total) }));
}

/** Ids de los trabajos del periodo con el estado dado. */
export async function idsPorEstado(periodoId, estado) {
  const filas = await Trabajo.findAll({ where: { periodoId, estado }, attributes: ['id'], raw: true });
  return filas.map((f) => f.id);
}

/* ─────────── Distribución ─────────── */

/** Todas las líneas del catálogo, por nombre. */
export async function todasLasLineas() {
  const filas = await LineaInvestigacion.findAll({ attributes: ['id', 'nombre'], order: [['nombre', 'ASC']] });
  return filas.map(plano);
}

/**
 * [{ lineaId, carrera, total }] en una sola consulta agrupada.
 * @param {{ inicio?: Date, finExclusivo?: Date, periodoId?: number }} filtros
 */
export async function conteoPorLineaYCarrera({ inicio, finExclusivo, periodoId }) {
  const where = {};
  if (periodoId) where.periodoId = periodoId;
  if (inicio || finExclusivo) {
    where.fechaRegistro = {};
    if (inicio) where.fechaRegistro[Op.gte] = inicio;
    if (finExclusivo) where.fechaRegistro[Op.lt] = finExclusivo;
  }
  const filas = await Trabajo.findAll({
    where,
    attributes: ['lineaId', 'carrera', [fn('COUNT', col('id')), 'total']],
    group: ['lineaId', 'carrera'],
    raw: true,
  });
  return filas.map((f) => ({ lineaId: f.lineaId, carrera: f.carrera, total: Number(f.total) }));
}
