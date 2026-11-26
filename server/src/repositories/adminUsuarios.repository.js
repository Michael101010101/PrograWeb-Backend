import { Op } from 'sequelize';
import db from '../db/models/index.cjs';

// HU-7 · Repositorio de administración de usuarios (Sequelize).
// Complementa a usuarios.repository.js (HU-1) con la consulta paginada y la validación
// de asesor en transacción. Los servicios no conocen Sequelize.

const { Usuario, CupoAsesor } = db;

const CAMPOS_BUSQUEDA = ['nombres', 'apellidos', 'correo', 'codigoAlumno'];

/** Mismo contrato que usuarios.repository.js: objeto plano sin actualizadoEn. */
function aObjeto(instancia) {
  if (!instancia) return null;
  // eslint-disable-next-line no-unused-vars
  const { actualizadoEn, ...datos } = instancia.get({ plain: true });
  return datos;
}

/** Escapa los comodines de LIKE para que la búsqueda sea literal. */
function escaparLike(texto) {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Listado paginado con filtros. Devuelve { filas, total }.
 * @param {{ rol?: string, estado?: string, q?: string, limite: number, desplazamiento: number }} opciones
 */
export async function listarPaginado({ rol, estado, q, limite, desplazamiento }) {
  const where = {};
  if (rol) where.rol = rol;
  if (estado) where.estado = estado;
  if (q) {
    const patron = `%${escaparLike(q)}%`;
    where[Op.or] = CAMPOS_BUSQUEDA.map((campo) => ({ [campo]: { [Op.iLike]: patron } }));
  }

  const { rows, count } = await Usuario.findAndCountAll({
    where,
    attributes: { exclude: ['passwordHash'] },
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

/* ─────────── Validar asesor (cada función recibe { transaction } del servicio) ─────────── */

/**
 * UPDATE condicional: activa la cuenta solo si sigue siendo un asesor pendiente de validación.
 * Devuelve el usuario actualizado (sin passwordHash) o null si otra petición ya lo cambió.
 */
export async function activarAsesorPendiente(usuarioId, opciones = {}) {
  const [afectados] = await Usuario.update(
    { estado: 'activo' },
    { where: { id: usuarioId, rol: 'asesor', estado: 'pendiente_validacion' }, ...opciones }
  );
  if (afectados === 0) return null;
  return aObjeto(await Usuario.findByPk(usuarioId, { attributes: { exclude: ['passwordHash'] }, ...opciones }));
}

/** Registra un cambio de cupo en el historial cupos_asesor (HU-7). */
export async function registrarCupo({ asesorId, periodoId, cupoAnterior, cupoMaximo, motivo, modificadoPor }, opciones = {}) {
  const cupo = await CupoAsesor.create({ asesorId, periodoId, cupoAnterior, cupoMaximo, motivo, modificadoPor }, opciones);
  return cupo.get({ plain: true });
}
