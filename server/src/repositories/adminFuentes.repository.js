import { QueryTypes, fn, col, literal } from 'sequelize';
import db from '../db/models/index.cjs';
import { hoyEnLima } from '../utils/fechas.js';

// HU-7 · Capa de lectura aislada: es el ÚNICO lugar de HU-7 que lee las tablas de HU-4 y HU-6.
//   HU-4: entregables, avances (modelos Entregable y Avance).
//   HU-6: public.sustentaciones, hu6.salas, hu6.jurados, hu6.docentes (sin modelo Sequelize: SQL con replacements).
// Cada función devuelve una forma normalizada, así los servicios no saben de dónde viene el dato.
// Solo lectura. Las consultas son por lote o con límite: nunca una por fila.

const { Entregable, Avance, sequelize } = db;

/** Un entregable está vencido si sigue pendiente y su fecha límite (día de calendario) ya pasó en Lima. */
export const ESTADO_VENCIBLE = 'pendiente';

const esVencido = (estado, fechaLimite, hoy) => estado === ESTADO_VENCIBLE && String(fechaLimite) < hoy;

const select = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

/* ─────────── HU-4 · Entregables y avances ─────────── */

/** Pesos por trabajo en una consulta agrupada: [{ trabajoId, pesoAprobado, pesoTotal }]. Sin plan → no aparece. */
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

/** Plan del trabajo por orden, cada entregable con su última versión entregada (o null). */
export async function entregablesDeTrabajo(trabajoId) {
  const filas = await Entregable.findAll({
    where: { trabajoId },
    attributes: ['id', 'orden', 'nombre', 'peso', 'obligatorio', 'estado', 'fechaLimite'],
    include: [
      { model: Avance, as: 'avances', attributes: ['id', 'version', 'fechaEntrega', 'fechaRevision', 'resultado'] },
    ],
    order: [
      ['orden', 'ASC'],
      ['id', 'ASC'],
      [{ model: Avance, as: 'avances' }, 'version', 'DESC'],
    ],
  });
  const hoy = hoyEnLima();
  return filas.map((instancia) => {
    const e = instancia.get({ plain: true });
    const ultimo = e.avances?.[0] ?? null;
    return {
      id: e.id,
      nombre: e.nombre,
      peso: Number(e.peso),
      obligatorio: e.obligatorio,
      estado: e.estado,
      fechaLimite: e.fechaLimite,
      vencido: esVencido(e.estado, e.fechaLimite, hoy),
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
  });
}

/**
 * Entregables vencidos de los trabajos en desarrollo del periodo, del más vencido al menos.
 * Devuelve { total, filas: [{ id, nombre, fechaLimite, trabajo: { id, codigo, titulo } }] } con `limite` filas.
 */
export async function entregablesVencidos({ periodoId, limite }) {
  const condicion = `e."estado" = :estado AND e."fechaLimite" < :hoy
    AND t."periodoId" = :periodoId AND t."estado" = 'en_desarrollo'`;
  const reemplazos = { estado: ESTADO_VENCIBLE, hoy: hoyEnLima(), periodoId };
  const [[{ total }], filas] = await Promise.all([
    select(`SELECT COUNT(*)::int AS total FROM "entregables" e JOIN "trabajos" t ON t."id" = e."trabajoId" WHERE ${condicion}`, reemplazos),
    select(
      `SELECT e."id", e."nombre", e."fechaLimite", t."id" AS "trabajoId", t."codigo", t."titulo"
       FROM "entregables" e JOIN "trabajos" t ON t."id" = e."trabajoId"
       WHERE ${condicion}
       ORDER BY e."fechaLimite" ASC, e."id" ASC
       LIMIT :limite`,
      { ...reemplazos, limite }
    ),
  ]);
  return {
    total,
    filas: filas.map((f) => ({
      id: f.id,
      nombre: f.nombre,
      fechaLimite: f.fechaLimite,
      trabajo: { id: f.trabajoId, codigo: f.codigo, titulo: f.titulo },
    })),
  };
}

/**
 * [{ asesorId, total }] de avances por revisar.
 * Por ahora sale de trabajos.porRevisar (HU-3), igual que la ficha del asesor de HU-3.
 * Cuando HU-5 revise sobre avances, se cambia por avances con resultado IS NULL sin tocar los servicios.
 */
export async function avancesPorRevisar(asesorIds) {
  if (!asesorIds.length) return [];
  return select(
    `SELECT t."asesorId", COALESCE(SUM(t."porRevisar"), 0)::int AS total
     FROM "trabajos" t
     WHERE t."asesorId" IN (:asesorIds)
     GROUP BY t."asesorId"`,
    { asesorIds }
  );
}

/* ─────────── HU-6 · Sustentación ─────────── */

/** "Presencial" → "presencial" (el front compara en minúsculas). */
const normalizarModalidad = (m) => (m ? String(m).toLowerCase() : null);

/** "A-402 · Pabellón A, cuarto piso"; null si la sustentación es virtual (sin sala). */
const textoSala = (salaId, ubicacion) => (salaId ? [salaId, ubicacion].filter(Boolean).join(' · ') : null);

/** Sustentación del trabajo (HU-6 permite una por trabajo) con sala y jurado (presidente primero), o null. */
export async function sustentacionDeTrabajo(trabajoId) {
  const [s] = await select(
    `SELECT s."id", s."fecha", s."hora", s."modalidad", s."estado", s."calificacion", s."salaId", sa."ubicacion"
     FROM public."sustentaciones" s
     LEFT JOIN hu6."salas" sa ON sa."id" = s."salaId"
     WHERE s."trabajoId" = :trabajoId
     ORDER BY s."fecha" DESC, s."hora" DESC
     LIMIT 1`,
    { trabajoId }
  );
  if (!s) return null;

  const jurado = await select(
    `SELECT d."id", d."nombres", d."apellidos", j."presidente"
     FROM hu6."jurados" j
     JOIN hu6."docentes" d ON d."id" = j."docente_id"
     WHERE j."sustentacion_id" = :sustentacionId
     ORDER BY j."presidente" DESC, d."apellidos" ASC, d."nombres" ASC`,
    { sustentacionId: s.id }
  );

  return {
    id: s.id,
    fecha: s.fecha,
    hora: s.hora,
    modalidad: normalizarModalidad(s.modalidad),
    sala: textoSala(s.salaId, s.ubicacion),
    estado: s.estado,
    calificacion: s.calificacion === null || s.calificacion === undefined ? null : Number(s.calificacion),
    jurado: jurado.map((d) => ({
      id: d.id,
      nombre: `${d.nombres} ${d.apellidos}`.trim(),
      apellidos: d.apellidos,
      cargo: d.presidente ? 'presidente' : 'miembro',
    })),
  };
}
