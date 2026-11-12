import db from '../db/models/index.cjs';
import { generarToken } from '../utils/aleatorio.js';

const { Token } = db;

export const VIGENCIA_MS = {
  verificacion: 24 * 60 * 60 * 1000,
  recuperacion: 60 * 60 * 1000,
};

/** Crea un token nuevo e invalida los anteriores del mismo tipo para ese usuario. */
export async function emitir(tipo, usuarioId) {
  await Token.update({ usado: true }, { where: { usuarioId, tipo, usado: false } });
  const registro = await Token.create({
    token: generarToken(),
    tipo,
    usuarioId,
    venceEn: new Date(Date.now() + VIGENCIA_MS[tipo]),
  });
  return { token: registro.token, venceEn: registro.venceEn };
}

/** Devuelve { estado: 'valido' | 'usado' | 'vencido' | 'inexistente', usuarioId } */
export async function consultar(token, tipo) {
  const registro = await Token.findOne({ where: { token, tipo } });
  if (!registro) return { estado: 'inexistente' };
  if (registro.usado) return { estado: 'usado', usuarioId: registro.usuarioId };
  if (registro.venceEn < new Date()) return { estado: 'vencido', usuarioId: registro.usuarioId };
  return { estado: 'valido', usuarioId: registro.usuarioId };
}

export async function marcarUsado(token) {
  await Token.update({ usado: true }, { where: { token } });
}
