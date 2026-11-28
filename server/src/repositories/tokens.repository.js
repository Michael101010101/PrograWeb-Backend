import { models } from '../config/database.js';
import RepositoryBase from './RepositoryBase.js';
import { generarToken } from '../utils/aleatorio.js';

// Tokens de un solo uso: verificación de correo y recuperación de contraseña.

export const VIGENCIA_MS = {
  verificacion: 24 * 60 * 60 * 1000,
  recuperacion: 60 * 60 * 1000,
};

class TokenRepository extends RepositoryBase {
  constructor() {
    super(models.Token);
  }

  /** Crea un token nuevo e invalida los anteriores del mismo tipo para ese usuario. */
  async emitir(tipo, usuarioId) {
    await this.actualizarDonde({ usado: true }, { usuarioId, tipo, usado: false });
    const registro = await this.crear({
      token: generarToken(),
      tipo,
      usuarioId,
      venceEn: new Date(Date.now() + VIGENCIA_MS[tipo]),
    });
    return { token: registro.token, venceEn: registro.venceEn };
  }

  /** Devuelve { estado: 'valido' | 'usado' | 'vencido' | 'inexistente', usuarioId } */
  async consultar(token, tipo) {
    const registro = await this.buscarUno({ token, tipo });
    if (!registro) return { estado: 'inexistente' };
    if (registro.usado) return { estado: 'usado', usuarioId: registro.usuarioId };
    if (new Date(registro.venceEn) < new Date()) return { estado: 'vencido', usuarioId: registro.usuarioId };
    return { estado: 'valido', usuarioId: registro.usuarioId };
  }
}

const repo = new TokenRepository();

export const emitir = (tipo, usuarioId) => repo.emitir(tipo, usuarioId);
export const consultar = (token, tipo) => repo.consultar(token, tipo);
export const marcarUsado = (token) => repo.actualizarDonde({ usado: true }, { token });
