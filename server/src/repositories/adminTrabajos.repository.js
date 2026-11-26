import { Op, fn, col, literal } from 'sequelize';
import db from '../db/models/index.cjs';

// HU-7 · Repositorio del tramo "Trabajos" (solo lectura, Sequelize).
// Lee las tablas provisionales de HU-2 a HU-6 sin modificarlas. Los servicios no conocen Sequelize.

const {
  Trabajo,
  IntegranteTrabajo,
  Asesoria,
  Entregable,
  Avance,
  Sustentacion,
  JuradoSustentacion,
  LineaInvestigacion,
  Periodo,
  Usuario,
  sequelize,
} = db;

/** Asesoría vigente = aceptada y sin fecha de fin (alias de tabla `a`). */
const SQL_VIGENTE = `a."estado" = 'aceptada' AND a."fechaFin" IS NULL`;
const WHERE_VIGENTE = { estado: 'aceptada', fechaFin: null };
const ESTADOS_ASESORIA_HISTORICA = ['aceptada', 'finalizada'];

const ATRIBUTOS_PERSONA = ['id', 'nombres', 'apellidos'];

function plano(instancia) {
  return instancia ? instancia.get({ plain: true }) : null;
}

/** Escapa los comodines de LIKE para que la búsqueda sea literal. */
function escaparLike(texto) {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Condición SQL de búsqueda libre sobre el trabajo (alias "Trabajo"). */
function condicionBusqueda(q) {
  const p = sequelize.escape(`%${escaparLike(q)}%`);
  return literal(`(
    "Trabajo"."titulo" ILIKE ${p}
    OR "Trabajo"."id" ILIKE ${p}
    OR EXISTS (
      SELECT 1 FROM "periodos" p
      WHERE p."id" = "Trabajo"."periodoId"
        AND ('TFC-' || p."semestre" || '-' || UPPER(CASE WHEN "Trabajo"."id" LIKE 't-%'
             THEN SUBSTRING("Trabajo"."id" FROM 3) ELSE "Trabajo"."id" END)) ILIKE ${p}
    )
    OR EXISTS (
      SELECT 1 FROM "integrantes_trabajo" it JOIN "usuarios" u ON u."id" = it."estudianteId"
      WHERE it."trabajoId" = "Trabajo"."id" AND (u."nombres" ILIKE ${p} OR u."apellidos" ILIKE ${p})
    )
    OR EXISTS (
      SELECT 1 FROM "asesorias" a JOIN "usuarios" u ON u."id" = a."asesorId"
      WHERE a."trabajoId" = "Trabajo"."id" AND ${SQL_VIGENTE} AND u."apellidos" ILIKE ${p}
    )
  )`);
}

/* ─────────── Listado ─────────── */

/**
 * Página de trabajos con filtros. Devuelve { filas, total }; cada fila trae linea y periodo.
 * @param {{ estado?, lineaId?, asesorId?, sinAsesor?: boolean, carrera?, periodoId?: number, q?,
 *           limite: number, desplazamiento: number }} opciones
 */
export async function listarPaginado({ estado, lineaId, asesorId, sinAsesor, carrera, periodoId, q, limite, desplazamiento }) {
  const where = {};
  if (estado) where.estado = estado;
  if (lineaId) where.lineaId = lineaId;
  if (carrera) where.carrera = carrera;
  if (periodoId) where.periodoId = periodoId;

  const condiciones = [];
  if (sinAsesor) {
    condiciones.push(literal(`NOT EXISTS (SELECT 1 FROM "asesorias" a WHERE a."trabajoId" = "Trabajo"."id" AND ${SQL_VIGENTE})`));
  } else if (asesorId) {
    condiciones.push(
      literal(
        `EXISTS (SELECT 1 FROM "asesorias" a WHERE a."trabajoId" = "Trabajo"."id" AND ${SQL_VIGENTE} AND a."asesorId" = ${sequelize.escape(asesorId)})`
      )
    );
  }
  if (q) condiciones.push(condicionBusqueda(q));
  if (condiciones.length) where[Op.and] = condiciones;

  const { rows, count } = await Trabajo.findAndCountAll({
    where,
    attributes: ['id', 'titulo', 'estado', 'carrera', 'fechaRegistro'],
    include: [
      { model: LineaInvestigacion, as: 'linea', attributes: ['id', 'nombre'] },
      { model: Periodo, as: 'periodo', attributes: ['id', 'semestre'] },
    ],
    order: [
      ['fechaRegistro', 'DESC'],
      ['id', 'ASC'],
    ],
    limit: limite,
    offset: desplazamiento,
    distinct: true,
  });
  return { filas: rows.map(plano), total: count };
}

/* ─────────── Consultas por lote (una por lista de ids, nunca por fila) ─────────── */

/** Integrantes de varios trabajos con datos del estudiante. */
export async function integrantesDeTrabajos(ids) {
  if (!ids.length) return [];
  const filas = await IntegranteTrabajo.findAll({
    where: { trabajoId: ids },
    attributes: ['trabajoId', 'esResponsable'],
    include: [{ model: Usuario, as: 'estudiante', attributes: [...ATRIBUTOS_PERSONA, 'codigoAlumno', 'carrera'] }],
  });
  return filas.map(plano);
}

/** Asesorías vigentes de varios trabajos con datos del asesor. */
export async function asesoriasVigentes(ids) {
  if (!ids.length) return [];
  const filas = await Asesoria.findAll({
    where: { trabajoId: ids, ...WHERE_VIGENTE },
    attributes: ['id', 'trabajoId', 'asesorId'],
    include: [{ model: Usuario, as: 'asesor', attributes: [...ATRIBUTOS_PERSONA, 'gradoAcademico', 'correo'] }],
  });
  return filas.map(plano);
}

/** Pesos por trabajo en una consulta agrupada: [{ trabajoId, pesoAprobado, pesoTotal }]. */
export async function pesosPorTrabajo(ids) {
  if (!ids.length) return [];
  const filas = await Entregable.findAll({
    where: { trabajoId: ids },
    attributes: [
      'trabajoId',
      [fn('COALESCE', fn('SUM', col('peso')), 0), 'pesoTotal'],
      [literal(`COALESCE(SUM(CASE WHEN "estado" = 'aprobado' THEN "peso" ELSE 0 END), 0)`), 'pesoAprobado'],
    ],
    group: ['trabajoId'],
    raw: true,
  });
  return filas.map((f) => ({ trabajoId: f.trabajoId, pesoAprobado: Number(f.pesoAprobado), pesoTotal: Number(f.pesoTotal) }));
}

/* ─────────── Ficha ─────────── */

export async function buscarTrabajo(id) {
  const trabajo = await Trabajo.findByPk(id, {
    attributes: { exclude: ['creadoEn', 'actualizadoEn'] },
    include: [
      { model: LineaInvestigacion, as: 'linea', attributes: ['id', 'nombre'] },
      { model: Periodo, as: 'periodo', attributes: ['id', 'semestre'] },
    ],
  });
  return plano(trabajo);
}

/** Historial completo de asesorías del trabajo, de la más reciente a la más antigua. */
export async function historialAsesorias(trabajoId) {
  const filas = await Asesoria.findAll({
    where: { trabajoId },
    attributes: ['id', 'estado', 'fechaSolicitud', 'fechaInicio', 'fechaFin', 'motivoRechazo', 'motivoFin'],
    include: [{ model: Usuario, as: 'asesor', attributes: ATRIBUTOS_PERSONA }],
    order: [
      ['fechaSolicitud', 'DESC'],
      ['id', 'ASC'],
    ],
  });
  return filas.map(plano);
}

/** Entregables por fecha límite, cada uno con sus avances de la versión mayor a la menor. */
export async function entregablesConAvances(trabajoId) {
  const filas = await Entregable.findAll({
    where: { trabajoId },
    attributes: ['id', 'nombre', 'peso', 'estado', 'fechaLimite', 'obligatorio'],
    include: [{ model: Avance, as: 'avances', attributes: ['id', 'version', 'fechaEntrega', 'fechaRevision', 'resultado'] }],
    order: [
      ['fechaLimite', 'ASC'],
      ['id', 'ASC'],
      [{ model: Avance, as: 'avances' }, 'version', 'DESC'],
    ],
  });
  return filas.map(plano);
}

/** Sustentación más reciente (fecha y hora) con su jurado, o null. */
export async function ultimaSustentacion(trabajoId) {
  const sustentacion = await Sustentacion.findOne({
    where: { trabajoId },
    attributes: ['id', 'fecha', 'hora', 'sala', 'modalidad', 'calificacion', 'estado'],
    include: [
      {
        model: JuradoSustentacion,
        as: 'jurados',
        separate: true,
        attributes: ['sustentacionId', 'cargo'],
        include: [{ model: Usuario, as: 'jurado', attributes: ATRIBUTOS_PERSONA }],
        order: [['cargo', 'ASC']],
      },
    ],
    order: [
      ['fecha', 'DESC'],
      ['hora', 'DESC'],
    ],
  });
  return plano(sustentacion);
}

/* ─────────── Filtros ─────────── */

export async function lineasActivas() {
  const filas = await LineaInvestigacion.findAll({
    where: { activa: true },
    attributes: ['id', 'nombre'],
    order: [['nombre', 'ASC']],
  });
  return filas.map(plano);
}

/** Asesores con alguna asesoría aceptada o finalizada. */
export async function asesoresConAsesorias() {
  const estados = ESTADOS_ASESORIA_HISTORICA.map((e) => sequelize.escape(e)).join(', ');
  const filas = await Usuario.findAll({
    where: { id: { [Op.in]: literal(`(SELECT DISTINCT "asesorId" FROM "asesorias" WHERE "estado" IN (${estados}))`) } },
    attributes: ATRIBUTOS_PERSONA,
    order: [
      ['apellidos', 'ASC'],
      ['nombres', 'ASC'],
      ['id', 'ASC'],
    ],
  });
  return filas.map(plano);
}

export async function listarPeriodos() {
  const filas = await Periodo.findAll({ attributes: ['id', 'semestre', 'activo'], order: [['semestre', 'DESC']] });
  return filas.map(plano);
}
