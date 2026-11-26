import { Op, QueryTypes, fn, col } from 'sequelize';
import db from '../db/models/index.cjs';

// HU-7 · Repositorio de Tablero y Distribución (solo lectura, Sequelize).
// Todas las consultas son agrupadas o con límite fijo: nunca una por trabajo. Los servicios no conocen Sequelize.

const { Trabajo, Entregable, Sustentacion, LineaInvestigacion, Periodo, sequelize } = db;

const INCLUDE_PERIODO = { model: Periodo, as: 'periodo', attributes: ['id', 'semestre'] };

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

/**
 * Entregables vencidos (fechaLimite < ahora y estado en `estados`) de trabajos del periodo con `estadoTrabajo`.
 * Devuelve { total, filas } con las primeras `limite` filas, de la más vencida a la menos.
 */
export async function entregablesVencidos({ periodoId, estadoTrabajo, ahora, estados, limite }) {
  const { rows, count } = await Entregable.findAndCountAll({
    where: { fechaLimite: { [Op.lt]: ahora }, estado: estados },
    attributes: ['id', 'nombre', 'fechaLimite'],
    include: [
      {
        model: Trabajo,
        as: 'trabajo',
        attributes: ['id', 'titulo'],
        where: { periodoId, estado: estadoTrabajo },
        required: true,
        include: [INCLUDE_PERIODO],
      },
    ],
    order: [
      ['fechaLimite', 'ASC'],
      ['id', 'ASC'],
    ],
    limit: limite,
    distinct: true,
  });
  return { total: count, filas: rows.map(plano) };
}

/** [{ estado, total }] de sustentaciones de trabajos del periodo. */
export async function sustentacionesPorEstado(periodoId) {
  return sequelize.query(
    `SELECT s."estado", COUNT(*)::int AS total
     FROM "sustentaciones" s
     JOIN "trabajos" t ON t."id" = s."trabajoId"
     WHERE t."periodoId" = :periodoId
     GROUP BY s."estado"`,
    { replacements: { periodoId }, type: QueryTypes.SELECT }
  );
}

/** Próximas sustentaciones del periodo (fecha >= hoy, estado en `estados`), por fecha y hora. */
export async function proximasSustentaciones({ periodoId, hoy, estados, limite }) {
  const filas = await Sustentacion.findAll({
    where: { estado: estados, fecha: { [Op.gte]: hoy } },
    attributes: ['id', 'fecha', 'hora', 'modalidad', 'sala', 'estado'],
    include: [
      {
        model: Trabajo,
        as: 'trabajo',
        attributes: ['id', 'titulo'],
        where: { periodoId },
        required: true,
        include: [INCLUDE_PERIODO],
      },
    ],
    order: [
      ['fecha', 'ASC'],
      ['hora', 'ASC'],
      ['id', 'ASC'],
    ],
    limit: limite,
  });
  return filas.map(plano);
}

/* ─────────── Distribución ─────────── */

/** Todas las líneas del catálogo (activas o no), por nombre. */
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
