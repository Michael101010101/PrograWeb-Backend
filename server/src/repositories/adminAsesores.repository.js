import { Op, literal, where as condicion, fn, col } from 'sequelize';
import db from '../db/models/index.cjs';

// HU-7 · Repositorio del tramo "Asesores" (Sequelize).
// Lee asesores (HU-3) y trabajos (HU-2) sin modificarlos; escribe solo en cupos_asesor y mensajes (HU-7).
// Los cambios de asesores.cupoMaximo se hacen con el repositorio de HU-3 (asesores.repository.js).
// Los servicios no conocen Sequelize.

const { Asesor, Usuario, Trabajo, CupoAsesor, Mensaje, sequelize } = db;

/** Estado del asesor: el de su cuenta si la tiene; si no tiene cuenta, la ficha registrada cuenta como activa. */
const SQL_ESTADO = `COALESCE("usuario"."estado", 'activo')`;

const ATRIBUTOS_ASESOR = [
  'id',
  'nombres',
  'apellidos',
  'correo',
  'gradoAcademico',
  'departamento',
  'lineas',
  'experiencia',
  'tiempoRevision',
  'cupoMaximo',
  'cupoOcupado',
];
const INCLUDE_USUARIO = { model: Usuario, as: 'usuario', attributes: ['estado'], required: false };

function plano(instancia) {
  return instancia ? instancia.get({ plain: true }) : null;
}

/** Asesor plano con `estado` ya derivado y sin el include de la cuenta. */
function aObjeto(instancia) {
  const a = plano(instancia);
  if (!a) return null;
  const { usuario, ...datos } = a;
  return { ...datos, estado: usuario?.estado ?? 'activo' };
}

/** Escapa los comodines de LIKE para que la búsqueda sea literal. */
function escaparLike(texto) {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/* ─────────── Listado ─────────── */

/**
 * Página de asesores (tabla asesores). Devuelve { filas, total }.
 * @param {{ estado?: string, q?: string, limite: number, desplazamiento: number }} opciones
 */
export async function listarPaginado({ estado, q, limite, desplazamiento }) {
  const condiciones = [];
  if (estado) condiciones.push(literal(`${SQL_ESTADO} = ${sequelize.escape(estado)}`));
  if (q) {
    const patron = `%${escaparLike(q)}%`;
    condiciones.push({
      [Op.or]: [
        { nombres: { [Op.iLike]: patron } },
        { apellidos: { [Op.iLike]: patron } },
        { correo: { [Op.iLike]: patron } },
        condicion(fn('concat', col('Asesor.nombres'), ' ', col('Asesor.apellidos')), { [Op.iLike]: patron }),
      ],
    });
  }

  const { rows, count } = await Asesor.findAndCountAll({
    where: { [Op.and]: condiciones },
    attributes: ATRIBUTOS_ASESOR,
    include: [INCLUDE_USUARIO],
    order: [
      ['apellidos', 'ASC'],
      ['nombres', 'ASC'],
      ['id', 'ASC'],
    ],
    limit: limite,
    offset: desplazamiento,
  });
  return { filas: rows.map(aObjeto), total: count };
}

/* ─────────── Ficha ─────────── */

/** Asesor con estado derivado, o null. Acepta { transaction } para releerlo dentro de una transacción. */
export async function buscarAsesor(id, opciones = {}) {
  return aObjeto(await Asesor.findByPk(id, { attributes: ATRIBUTOS_ASESOR, include: [INCLUDE_USUARIO], ...opciones }));
}

/** Ids (de la lista dada) que tienen al menos un cambio de cupo registrado en el periodo. */
export async function asesoresConCupoEnPeriodo(ids, periodoId) {
  if (!ids.length || !periodoId) return [];
  const filas = await CupoAsesor.findAll({
    where: { asesorId: ids, periodoId },
    attributes: [[fn('DISTINCT', col('asesorId')), 'asesorId']],
    raw: true,
  });
  return filas.map((f) => f.asesorId);
}

/** Trabajos asignados al asesor (sin los desistidos), del más reciente al más antiguo. */
export async function trabajosDeAsesor(asesorId) {
  const filas = await Trabajo.findAll({
    where: { asesorId, estado: { [Op.ne]: 'desistido' } },
    attributes: ['id', 'codigo', 'titulo', 'estado'],
    order: [
      ['fechaRegistro', 'DESC'],
      ['id', 'ASC'],
    ],
  });
  return filas.map(plano);
}

/* ─────────── Escritura (tablas de HU-7) ─────────── */

/** Registra un cambio de cupo en el historial cupos_asesor. */
export async function registrarCupo({ asesorId, periodoId, cupoAnterior, cupoMaximo, motivo, modificadoPor }, opciones = {}) {
  const cupo = await CupoAsesor.create({ asesorId, periodoId, cupoAnterior, cupoMaximo, motivo, modificadoPor }, opciones);
  return cupo.get({ plain: true });
}

/** Guarda un mensaje de la coordinación a un asesor (tenga o no cuenta). No envía correo. */
export async function crearMensaje({ remitenteId, asesorId, trabajoId = null, asunto, cuerpo }) {
  return plano(await Mensaje.create({ remitenteId, asesorId, trabajoId, asunto, cuerpo }));
}
