import { Op } from 'sequelize';
import { models } from '../config/database.js';
import RepositoryBase from './RepositoryBase.js';

// Patrón Repository sobre el modelo Usuario (Sequelize).
// Es el único lugar que lee y escribe la tabla usuarios; los servicios no conocen Sequelize.

class UsuarioRepository extends RepositoryBase {
  constructor() {
    super(models.Usuario);
  }

  /** No expone la columna técnica actualizadoEn. */
  aObjeto(instancia) {
    if (!instancia) return null;
    // eslint-disable-next-line no-unused-vars
    const { actualizadoEn, ...datos } = instancia.get({ plain: true });
    return datos;
  }

  buscarPorCorreo(correo) {
    return this.buscarUno({ correo: String(correo ?? '').trim().toLowerCase() });
  }

  buscarPorCodigoAlumno(codigoAlumno) {
    return this.buscarUno({ codigoAlumno });
  }

  /** Para la HU-7: listado con filtros simples (rol, estado, búsqueda por nombre o correo). */
  listar({ rol, estado, buscar } = {}) {
    const where = {};
    if (rol) where.rol = rol;
    if (estado) where.estado = estado;
    if (buscar) {
      where[Op.or] = ['nombres', 'apellidos', 'correo'].map((campo) => ({ [campo]: { [Op.iLike]: `%${buscar}%` } }));
    }
    return this.buscarTodos({ where, order: [['apellidos', 'ASC']] });
  }
}

const repo = new UsuarioRepository();

export const buscarPorId = (id, opciones) => repo.buscarPorId(id, opciones);
export const buscarPorCorreo = (correo) => repo.buscarPorCorreo(correo);
export const buscarPorCodigoAlumno = (codigo) => repo.buscarPorCodigoAlumno(codigo);
export const crear = (datos, opciones) => repo.crear(datos, opciones);
export const actualizar = (id, cambios, opciones) => repo.actualizar(id, cambios, opciones);
export const listar = (filtros) => repo.listar(filtros);

/** Versión pública del usuario: nunca devuelve el hash de la contraseña. */
export function sinSecretos(usuario) {
  if (!usuario) return null;
  // eslint-disable-next-line no-unused-vars
  const { passwordHash, ...resto } = usuario;
  return resto;
}
