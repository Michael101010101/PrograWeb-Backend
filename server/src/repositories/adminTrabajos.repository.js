import { Op, literal } from 'sequelize';
import db from '../db/models/index.cjs';

// HU-7 · Repositorio del tramo "Trabajos" (solo lectura, Sequelize).
// Lee las tablas de HU-2 (trabajos, integrantes_trabajo, trabajo_historial, lineas_investigacion) y de
// HU-3 (asesores, solicitudes, historial_asesorias) sin modificarlas. Lo de HU-4/HU-6 está en adminFuentes.
// Los servicios no conocen Sequelize.

const {
  Trabajo,
  TrabajoIntegrante,
  TrabajoHistorial,
  LineaInvestigacion,
  Asesor,
  Solicitud,
  HistorialAsesoria,
  Periodo,
  Usuario,
  sequelize,
} = db;

const ATRIBUTOS_ESTUDIANTE = ['id', 'nombres', 'apellidos', 'codigoAlumno', 'carrera'];
const ATRIBUTOS_ASESOR = ['id', 'nombres', 'apellidos', 'gradoAcademico', 'correo'];
const INCLUDE_LINEA = { model: LineaInvestigacion, as: 'lineaInvestigacion', attributes: ['id', 'nombre'] };

function plano(instancia) {
  return instancia ? instancia.get({ plain: true }) : null;
}

/** Trabajo plano con la línea bajo la clave `linea` (forma que usa el servicio). */
function conLinea(instancia) {
  const t = plano(instancia);
  if (!t) return null;
  const { lineaInvestigacion, ...resto } = t;
  return { ...resto, linea: lineaInvestigacion ?? null };
}

/** Escapa los comodines de LIKE para que la búsqueda sea literal. */
function escaparLike(texto) {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Condición SQL de búsqueda libre: título, código, integrantes (nombres o apellidos) y apellidos del asesor. */
function condicionBusqueda(q) {
  const p = sequelize.escape(`%${escaparLike(q)}%`);
  return literal(`(
    "Trabajo"."titulo" ILIKE ${p}
    OR "Trabajo"."codigo" ILIKE ${p}
    OR EXISTS (
      SELECT 1 FROM "integrantes_trabajo" it JOIN "usuarios" u ON u."id" = it."estudianteId"
      WHERE it."trabajoId" = "Trabajo"."id" AND (u."nombres" ILIKE ${p} OR u."apellidos" ILIKE ${p})
    )
    OR EXISTS (
      SELECT 1 FROM "asesores" a
      WHERE a."id" = "Trabajo"."asesorId" AND a."apellidos" ILIKE ${p}
    )
  )`);
}

/* ─────────── Listado ─────────── */

/**
 * Página de trabajos con filtros. Devuelve { filas, total }; cada fila trae `linea`.
 * @param {{ estado?, lineaId?, asesorId?, sinAsesor?: boolean, carrera?, periodoId?: number, q?,
 *           limite: number, desplazamiento: number }} opciones
 */
export async function listarPaginado({ estado, lineaId, asesorId, sinAsesor, carrera, periodoId, q, limite, desplazamiento }) {
  const where = {};
  if (estado) where.estado = estado;
  if (lineaId) where.lineaId = lineaId;
  if (carrera) where.carrera = carrera;
  if (periodoId) where.periodoId = periodoId;
  if (sinAsesor) where.asesorId = null;
  else if (asesorId) where.asesorId = asesorId;
  if (q) where[Op.and] = [condicionBusqueda(q)];

  const { rows, count } = await Trabajo.findAndCountAll({
    where,
    attributes: ['id', 'codigo', 'titulo', 'estado', 'carrera', 'periodoId', 'fechaRegistro'],
    include: [INCLUDE_LINEA],
    order: [
      ['fechaRegistro', 'DESC'],
      ['id', 'ASC'],
    ],
    limit: limite,
    offset: desplazamiento,
    distinct: true,
  });
  return { filas: rows.map(conLinea), total: count };
}

/* ─────────── Consultas por lote (una por lista de ids, nunca por fila) ─────────── */

/** [{ id, semestre }] de varios periodos (Trabajo no tiene asociación con Periodo en main). */
export async function periodosPorIds(ids) {
  if (!ids.length) return [];
  const filas = await Periodo.findAll({ where: { id: ids }, attributes: ['id', 'semestre'] });
  return filas.map(plano);
}

/** [{ trabajoId, esResponsable, estudiante }] de varios trabajos. */
export async function integrantesDeTrabajos(ids) {
  if (!ids.length) return [];
  const filas = await TrabajoIntegrante.findAll({
    where: { trabajoId: ids },
    attributes: ['trabajoId', 'esResponsable'],
    include: [{ model: Usuario, as: 'usuario', attributes: ATRIBUTOS_ESTUDIANTE }],
  });
  return filas
    .map(plano)
    .filter((i) => i.usuario)
    .map(({ trabajoId, esResponsable, usuario }) => ({ trabajoId, esResponsable, estudiante: usuario }));
}

/** [{ trabajoId, asesor }] del asesor asignado (trabajos.asesorId → asesores) de varios trabajos. */
export async function asesoresDeTrabajos(ids) {
  if (!ids.length) return [];
  const filas = await Trabajo.findAll({
    where: { id: ids, asesorId: { [Op.ne]: null } },
    attributes: ['id'],
    include: [{ model: Asesor, as: 'asesorAsignado', attributes: ATRIBUTOS_ASESOR, required: true }],
  });
  return filas.map(plano).map((t) => ({ trabajoId: t.id, asesor: t.asesorAsignado }));
}

/* ─────────── Ficha ─────────── */

export async function buscarTrabajo(id) {
  const trabajo = await Trabajo.findByPk(id, {
    attributes: { exclude: ['actualizadoEn'] },
    include: [INCLUDE_LINEA],
  });
  return conLinea(trabajo);
}

/** Motivo del último cambio de estado del trabajo (trabajo_historial), o null. */
export async function ultimoMotivoEstado(trabajoId) {
  const fila = await TrabajoHistorial.findOne({
    where: { trabajoId },
    attributes: ['motivo'],
    order: [
      ['fecha', 'DESC'],
      ['id', 'DESC'],
    ],
  });
  return fila?.motivo ?? null;
}

/** Solicitudes de asesoría del trabajo (HU-3) con el asesor, de la más reciente a la más antigua. */
export async function solicitudesDeTrabajo(codigo) {
  const filas = await Solicitud.findAll({
    where: { trabajoCodigo: codigo },
    attributes: ['id', 'asesorId', 'estado', 'fecha', 'motivo', 'resueltaEl'],
    include: [{ model: Asesor, as: 'asesor', attributes: ['id', 'nombres', 'apellidos'] }],
    order: [
      ['fecha', 'DESC'],
      ['id', 'ASC'],
    ],
  });
  return filas.map(plano);
}

/** Asesorías terminadas del trabajo (historial_asesorias de HU-3) con el asesor. */
export async function asesoriasTerminadas(codigo) {
  const filas = await HistorialAsesoria.findAll({
    where: { trabajoCodigo: codigo },
    attributes: ['id', 'asesorId', 'motivo', 'fecha'],
    include: [{ model: Asesor, as: 'asesor', attributes: ['id', 'nombres', 'apellidos'] }],
    order: [
      ['fecha', 'DESC'],
      ['id', 'DESC'],
    ],
  });
  return filas.map(plano);
}

/* ─────────── Filtros ─────────── */

export async function listarLineas() {
  const filas = await LineaInvestigacion.findAll({ attributes: ['id', 'nombre'], order: [['nombre', 'ASC']] });
  return filas.map(plano);
}

/** Asesores (tabla asesores) que tienen al menos un trabajo asignado. */
export async function asesoresConTrabajos() {
  const filas = await Asesor.findAll({
    where: { id: { [Op.in]: literal(`(SELECT DISTINCT "asesorId" FROM "trabajos" WHERE "asesorId" IS NOT NULL)`) } },
    attributes: ['id', 'nombres', 'apellidos'],
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
