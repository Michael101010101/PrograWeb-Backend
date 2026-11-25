import * as auth from '../services/auth.service.js';

// Los controladores solo traducen HTTP ↔ servicio. No acceden a datos.

export async function login(req, res) {
  res.json(await auth.iniciarSesion(req.body));
}

export async function registrarEstudiante(req, res) {
  res.status(201).json(await auth.registrarEstudiante(req.body));
}

export async function registrarAsesor(req, res) {
  res.status(201).json(await auth.registrarAsesor(req.body));
}

export async function consultarInvitacion(req, res) {
  res.json(await auth.consultarInvitacion(req.params.codigo));
}

export async function registrarCoordinador(req, res) {
  res.status(201).json(await auth.registrarCoordinador(req.body));
}

export async function verificarCorreo(req, res) {
  res.json({ usuario: await auth.verificarCorreo(req.params.token) });
}

export async function reenviarVerificacion(req, res) {
  res.json(await auth.reenviarVerificacion(req.body));
}

export async function solicitarRecuperacion(req, res) {
  res.json(await auth.solicitarRecuperacion(req.body));
}

export async function validarEnlaceRecuperacion(req, res) {
  const { correo } = await auth.validarEnlaceRecuperacion(req.params.token);
  res.json({ correo });
}

export async function restablecerPassword(req, res) {
  await auth.restablecerPassword(req.params.token, req.body);
  res.status(204).end();
}
