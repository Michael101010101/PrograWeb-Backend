import { Op } from 'sequelize';
import db from '../db/models/index.cjs';

// Patrón Repository sobre el modelo Usuario (Sequelize).
// Es el único lugar que lee y escribe la tabla usuarios; los servicios no conocen Sequelize.

const { Usuario } = db;

/** Convierte la instancia de Sequelize en un objeto simple del contrato de datos. */
function aObjeto(instancia) {
  if (!instancia) return null;
  // eslint-disable-next-line no-unused-vars
  const { actualizadoEn, ...datos } = instancia.get({ plain: true });
  return datos;
}

export async function buscarPorId(id) {
  return aObjeto(await Usuario.findByPk(id));
}

export async function buscarPorCorreo(correo) {
  return aObjeto(await Usuario.findOne({ where: { correo: String(correo ?? '').trim().toLowerCase() } }));
}

export async function buscarPorCodigoAlumno(codigoAlumno) {
  return aObjeto(await Usuario.findOne({ where: { codigoAlumno } }));
}

export async function crear(datos) {
  return aObjeto(await Usuario.create(datos));
}

export async function actualizar(id, cambios) {
  const usuario = await Usuario.findByPk(id);
  if (!usuario) return null;
  await usuario.update(cambios);
  return aObjeto(usuario);
}

/** Para la HU-7: listado con filtros simples (rol, estado, búsqueda por nombre o correo). */
export async function listar({ rol, estado, buscar } = {}) {
  const where = {};
  if (rol) where.rol = rol;
  if (estado) where.estado = estado;
  if (buscar) {
    where[Op.or] = ['nombres', 'apellidos', 'correo'].map((campo) => ({ [campo]: { [Op.iLike]: `%${buscar}%` } }));
  }
  const filas = await Usuario.findAll({ where, order: [['apellidos', 'ASC']] });
  return filas.map(aObjeto);
}

/** Versión pública del usuario: nunca devuelve el hash de la contraseña. */
export function sinSecretos(usuario) {
  if (!usuario) return null;
  // eslint-disable-next-line no-unused-vars
  const { passwordHash, ...resto } = usuario;
  return resto;
}
