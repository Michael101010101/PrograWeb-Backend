import { Op } from 'sequelize';
import db from '../db/models/index.cjs';

// HU-7 · Repositorio de administración de usuarios (Sequelize).
// Complementa a usuarios.repository.js (HU-1) con la consulta paginada y la validación
// de asesor en transacción. Los servicios no conocen Sequelize.

const { Usuario, CupoAsesor, sequelize } = db;

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

/**
 * Activa un asesor pendiente y registra su cupo del periodo en una sola transacción.
 * Devuelve { usuario, cupo } o null si el asesor ya no estaba pendiente (otra petición lo cambió).
 */
export async function validarAsesorConCupo({ asesorId, periodoId, cupoMaximo, modificadoPor, motivo }) {
  return sequelize.transaction(async (transaction) => {
    const [afectados] = await Usuario.update(
      { estado: 'activo' },
      { where: { id: asesorId, rol: 'asesor', estado: 'pendiente_validacion' }, transaction }
    );
    if (afectados === 0) return null;

    const cupo = await CupoAsesor.create({ asesorId, periodoId, cupoMaximo, modificadoPor, motivo }, { transaction });
    const usuario = await Usuario.findByPk(asesorId, { attributes: { exclude: ['passwordHash'] }, transaction });
    return { usuario: aObjeto(usuario), cupo: cupo.get({ plain: true }) };
  });
}
