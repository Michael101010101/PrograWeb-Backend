import HttpError from '../utils/HttpError.js';
import * as usuarios from '../repositories/usuarios.repository.js';
import * as invitaciones from '../repositories/invitaciones.repository.js';
import { enviarCorreo } from './correo.service.js';
import { env } from '../config/env.js';
import { validarCorreo, DOMINIO_DOCENTE } from '../utils/validators.js';

// El permiso (solo coordinación) lo controla el middleware autorizar() en la ruta.

export async function listar() {
  const lista = await invitaciones.listar();
  return lista.map((i) => ({ ...i, estado: invitaciones.estadoDe(i) }));
}

export async function crear(solicitante, { correo: correoIngresado }) {
  const correo = String(correoIngresado ?? '').trim().toLowerCase();
  const error = validarCorreo(correo, DOMINIO_DOCENTE);
  if (error) throw new HttpError(400, 'Revisa el correo.', { campos: { correo: error } });
  if (await usuarios.buscarPorCorreo(correo)) {
    throw new HttpError(409, 'Ya existe una cuenta con ese correo.', { campos: { correo: 'Ya existe una cuenta con este correo' } });
  }
  if (await invitaciones.buscarVigentePorCorreo(correo)) {
    throw new HttpError(409, 'Ese correo ya tiene una invitación vigente.', { campos: { correo: 'Ya tiene una invitación vigente' } });
  }

  const inv = await invitaciones.crear({ correo, invitadoPor: solicitante.id });
  const ruta = `/registro/coordinador?invitacion=${inv.codigo}`;
  const envio = await enviarCorreo({
    para: correo,
    asunto: 'Invitación a la coordinación TFC',
    mensaje: `${solicitante.nombres.split(' ')[0]} ${solicitante.apellidos} te invitó a crear una cuenta de coordinación en Trabajos de Fin de Carrera. Tu código es ${inv.codigo}; vence en 7 días y solo puede usarse una vez.`,
    enlace: ruta,
    textoEnlace: 'Crear mi cuenta',
  });
  return { ...inv, estado: 'vigente', correoEnviado: envio.enviado, enlaceDemo: env.exponerEnlaces ? ruta : null };
}

export async function anular(codigo) {
  const inv = await invitaciones.buscarPorCodigo(codigo);
  if (!inv) throw new HttpError(404, 'La invitación no existe.');
  if (invitaciones.estadoDe(inv) !== 'vigente') throw new HttpError(409, 'Solo se pueden anular invitaciones vigentes.');
  await invitaciones.revocar(inv.codigo);
}
