import { Op } from 'sequelize';
import { models } from '../config/database.js';
import RepositoryBase from './RepositoryBase.js';
import { generarCodigoInvitacion } from '../utils/aleatorio.js';

// Invitaciones para crear cuentas de coordinación.

const VIGENCIA_DIAS = 7;

export function estadoDe(inv) {
  if (inv.revocada) return 'revocada';
  if (inv.usada) return 'usada';
  if (new Date(inv.venceEn) < new Date()) return 'vencida';
  return 'vigente';
}

class InvitacionRepository extends RepositoryBase {
  constructor() {
    super(models.Invitacion);
  }

  listar() {
    return this.buscarTodos({ order: [['creadaEn', 'DESC']] });
  }

  buscarPorCodigo(codigo) {
    return this.buscarPorId(String(codigo ?? '').trim().toUpperCase());
  }

  buscarVigentePorCorreo(correo) {
    return this.buscarUno({ correo, usada: false, revocada: false, venceEn: { [Op.gt]: new Date() } });
  }

  crearNueva({ correo, invitadoPor }) {
    return this.crear({
      codigo: generarCodigoInvitacion(),
      correo,
      invitadoPor,
      venceEn: new Date(Date.now() + VIGENCIA_DIAS * 86400000),
    });
  }
}

const repo = new InvitacionRepository();

export const listar = () => repo.listar();
export const buscarPorCodigo = (codigo) => repo.buscarPorCodigo(codigo);
export const buscarVigentePorCorreo = (correo) => repo.buscarVigentePorCorreo(correo);
export const crear = (datos) => repo.crearNueva(datos);
export const marcarUsada = (codigo, usuarioId) =>
  repo.actualizarDonde({ usada: true, usadaPor: usuarioId, usadaEn: new Date() }, { codigo });
export const revocar = (codigo) => repo.actualizarDonde({ revocada: true }, { codigo });
