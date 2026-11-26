import { Op, QueryTypes, Transaction, where as condicion, fn, col } from 'sequelize';
import db from '../db/models/index.cjs';

// HU-7 · Repositorio del tramo "Asesores" (Sequelize).
// Lee las tablas provisionales de HU-3 a HU-5 sin modificarlas y escribe solo en cupos_asesor y mensajes (HU-7).
// Los servicios no conocen Sequelize.

const { Usuario, PerfilAsesor, LineaAsesor, LineaInvestigacion, Asesoria, Trabajo, Periodo, CupoAsesor, Mensaje, sequelize } =
  db;

/** Asesoría vigente = aceptada y sin fecha de fin (alias de tabla `a`). */
const SQL_VIGENTE = `a."estado" = 'aceptada' AND a."fechaFin" IS NULL`;
const WHERE_VIGENTE = { estado: 'aceptada', fechaFin: null };

const ATRIBUTOS_ASESOR = ['id', 'nombres', 'apellidos', 'correo', 'estado', 'gradoAcademico', 'departamento'];

function plano(instancia) {
  return instancia ? instancia.get({ plain: true }) : null;
}

/** Escapa los comodines de LIKE para que la búsqueda sea literal. */
function escaparLike(texto) {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/* ─────────── Listado ─────────── */

/**
 * Página de asesores. Devuelve { filas, total }.
 * @param {{ estado?: string, q?: string, limite: number, desplazamiento: number }} opciones
 */
export async function listarPaginado({ estado, q, limite, desplazamiento }) {
  const where = { rol: 'asesor' };
  if (estado) where.estado = estado;
  if (q) {
    const patron = `%${escaparLike(q)}%`;
    where[Op.or] = [
      { nombres: { [Op.iLike]: patron } },
      { apellidos: { [Op.iLike]: patron } },
      { correo: { [Op.iLike]: patron } },
      condicion(fn('concat', col('nombres'), ' ', col('apellidos')), { [Op.iLike]: patron }),
    ];
  }

  const { rows, count } = await Usuario.findAndCountAll({
    where,
    attributes: ATRIBUTOS_ASESOR,
    order: [
      ['apellidos', 'ASC'],
      ['nombres', 'ASC'],
      ['id', 'ASC'],
    ],
    limit: limite,
    offset: desplazamiento,
  });
  return { filas: rows.map(plano), total: count };
}

/* ─────────── Consultas por lote (una por lista de ids, nunca por asesor) ─────────── */

/** [{ asesorId, nombre }] de las líneas de varios asesores. */
export async function lineasDeAsesores(ids) {
  if (!ids.length) return [];
  const filas = await LineaAsesor.findAll({
    where: { asesorId: ids },
    attributes: ['asesorId'],
    include: [{ model: LineaInvestigacion, as: 'linea', attributes: ['nombre'] }],
  });
  return filas.map((f) => ({ asesorId: f.asesorId, nombre: f.linea?.nombre })).filter((f) => f.nombre);
}

/** [{ asesorId, total }] de asesorías vigentes. */
export async function trabajosACargo(ids) {
  if (!ids.length) return [];
  return sequelize.query(
    `SELECT a."asesorId", COUNT(*)::int AS total
     FROM "asesorias" a
     WHERE a."asesorId" IN (:ids) AND ${SQL_VIGENTE}
     GROUP BY a."asesorId"`,
    { replacements: { ids }, type: QueryTypes.SELECT }
  );
}

/**
 * Cupos de varios asesores: { periodo: [{ asesorId, cupoMaximo }], perfil: [{ asesorId, cupoMaximo }] }.
 * `periodo` = fila más reciente de cupos_asesor en el periodo dado; `perfil` = perfiles_asesor.cupoMaximo.
 */
export async function cuposVigentes(ids, periodoId, transaction) {
  if (!ids.length) return { periodo: [], perfil: [] };
  const [periodo, perfil] = await Promise.all([
    periodoId
      ? sequelize.query(
          `SELECT DISTINCT ON (c."asesorId") c."asesorId", c."cupoMaximo"
           FROM "cupos_asesor" c
           WHERE c."asesorId" IN (:ids) AND c."periodoId" = :periodoId
           ORDER BY c."asesorId", c."creadoEn" DESC, c."id" DESC`,
          { replacements: { ids, periodoId }, type: QueryTypes.SELECT, transaction }
        )
      : [],
    PerfilAsesor.findAll({ where: { asesorId: ids }, attributes: ['asesorId', 'cupoMaximo'], raw: true, transaction }),
  ]);
  return { periodo, perfil };
}

/** [{ asesorId, total }] de avances sin revisar en trabajos con asesoría vigente del asesor. */
export async function avancesPorRevisar(ids) {
  if (!ids.length) return [];
  return sequelize.query(
    `SELECT a."asesorId", COUNT(av."id")::int AS total
     FROM "avances" av
     JOIN "entregables" e ON e."id" = av."entregableId"
     JOIN "asesorias" a ON a."trabajoId" = e."trabajoId" AND ${SQL_VIGENTE}
     WHERE a."asesorId" IN (:ids) AND av."resultado" IS NULL
     GROUP BY a."asesorId"`,
    { replacements: { ids }, type: QueryTypes.SELECT }
  );
}

/** [{ asesorId, revisados, segundos }] de avances ya revisados por cada asesor. El promedio lo calcula el servicio. */
export async function tiemposRevision(ids) {
  if (!ids.length) return [];
  const filas = await sequelize.query(
    `SELECT av."revisadoPor" AS "asesorId", COUNT(*)::int AS revisados,
            SUM(EXTRACT(EPOCH FROM (av."fechaRevision" - av."fechaEntrega"))) AS segundos
     FROM "avances" av
     WHERE av."revisadoPor" IN (:ids)
       AND av."resultado" IS NOT NULL
       AND av."fechaRevision" IS NOT NULL
       AND av."fechaRevision" >= av."fechaEntrega"
     GROUP BY av."revisadoPor"`,
    { replacements: { ids }, type: QueryTypes.SELECT }
  );
  return filas.map((f) => ({ asesorId: f.asesorId, revisados: f.revisados, segundos: Number(f.segundos) }));
}

/* ─────────── Ficha ─────────── */

/** Usuario con rol asesor (con experiencia del perfil), o null. */
export async function buscarAsesor(id) {
  const [usuario, perfil] = await Promise.all([
    Usuario.findOne({ where: { id, rol: 'asesor' }, attributes: ATRIBUTOS_ASESOR }),
    PerfilAsesor.findByPk(id, { attributes: ['experiencia'] }),
  ]);
  if (!usuario) return null;
  return { ...plano(usuario), experiencia: perfil?.experiencia ?? null };
}

/** Trabajos con asesoría vigente del asesor (con periodo para armar el código). */
export async function trabajosVigentes(asesorId) {
  const filas = await Asesoria.findAll({
    where: { asesorId, ...WHERE_VIGENTE },
    attributes: ['id'],
    include: [
      {
        model: Trabajo,
        as: 'trabajo',
        attributes: ['id', 'titulo', 'estado', 'fechaRegistro'],
        include: [{ model: Periodo, as: 'periodo', attributes: ['id', 'semestre'] }],
      },
    ],
    order: [
      [{ model: Trabajo, as: 'trabajo' }, 'fechaRegistro', 'DESC'],
      [{ model: Trabajo, as: 'trabajo' }, 'id', 'ASC'],
    ],
  });
  return filas.map((f) => plano(f.trabajo)).filter(Boolean);
}

/* ─────────── Escritura ─────────── */

/**
 * Inserta una ampliación de cupo (fila nueva = historial) en una transacción.
 * Bloquea la fila del asesor y vuelve a verificar estado y cupo para evitar carreras.
 * Devuelve { cupo, cupoAnterior } o { conflicto: 'estado' | 'sin_cupo' | 'cupo', cupoActual? }.
 */
export async function registrarAmpliacion({ asesorId, periodoId, cupoMaximo, motivo, modificadoPor }) {
  return sequelize.transaction(async (transaction) => {
    const asesor = await Usuario.findOne({
      where: { id: asesorId, rol: 'asesor', estado: 'activo' },
      attributes: ['id'],
      lock: Transaction.LOCK.UPDATE,
      transaction,
    });
    if (!asesor) return { conflicto: 'estado' };

    const { periodo, perfil } = await cuposVigentes([asesorId], periodoId, transaction);
    const cupoActual = periodo[0]?.cupoMaximo ?? perfil[0]?.cupoMaximo ?? null;
    if (cupoActual === null) return { conflicto: 'sin_cupo' };
    if (cupoMaximo <= cupoActual) return { conflicto: 'cupo', cupoActual };

    const cupo = await CupoAsesor.create({ asesorId, periodoId, cupoMaximo, motivo, modificadoPor }, { transaction });
    return { cupo: plano(cupo), cupoAnterior: cupoActual };
  });
}

export async function crearMensaje({ remitenteId, destinatarioId, asunto, cuerpo }) {
  return plano(await Mensaje.create({ remitenteId, destinatarioId, asunto, cuerpo }));
}
