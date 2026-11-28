import { models } from '../config/database.js';
import RepositoryBase from './RepositoryBase.js';

// Intentos fallidos de inicio de sesión (bloqueo temporal).

class IntentoLoginRepository extends RepositoryBase {
  constructor() {
    super(models.IntentoLogin);
  }

  async obtener(correo) {
    const registro = await this.buscarPorId(correo);
    return { fallidos: registro?.fallidos ?? 0, bloqueadoHasta: registro?.bloqueadoHasta ?? null };
  }
}

const repo = new IntentoLoginRepository();

export const obtener = (correo) => repo.obtener(correo);
export const guardar = (correo, { fallidos, bloqueadoHasta }) => repo.crearOActualizar({ correo, fallidos, bloqueadoHasta });
export const limpiar = (correo) => repo.eliminarDonde({ correo });
