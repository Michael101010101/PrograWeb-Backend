import { Op } from 'sequelize';
import db from '../db/models/index.cjs';
import { generarCodigoInvitacion } from '../utils/aleatorio.js';

const { Invitacion } = db;
const VIGENCIA_DIAS = 7;

const aObjeto = (instancia) => (instancia ? instancia.get({ plain: true }) : null);

export function estadoDe(inv) {
  if (inv.revocada) return 'revocada';
  if (inv.usada) return 'usada';
  if (new Date(inv.venceEn) < new Date()) return 'vencida';
  return 'vigente';
}

export async function listar() {
  const filas = await Invitacion.findAll({ order: [['creadaEn', 'DESC']] });
  return filas.map(aObjeto);
}

export async function buscarPorCodigo(codigo) {
  return aObjeto(await Invitacion.findByPk(String(codigo ?? '').trim().toUpperCase()));
}

export async function buscarVigentePorCorreo(correo) {
  return aObjeto(
    await Invitacion.findOne({
      where: { correo, usada: false, revocada: false, venceEn: { [Op.gt]: new Date() } },
    })
  );
}

export async function crear({ correo, invitadoPor }) {
  return aObjeto(
    await Invitacion.create({
      codigo: generarCodigoInvitacion(),
      correo,
      invitadoPor,
      venceEn: new Date(Date.now() + VIGENCIA_DIAS * 86400000),
    })
  );
}

export async function marcarUsada(codigo, usuarioId) {
  await Invitacion.update({ usada: true, usadaPor: usuarioId, usadaEn: new Date() }, { where: { codigo } });
}

export async function revocar(codigo) {
  await Invitacion.update({ revocada: true }, { where: { codigo } });
}
