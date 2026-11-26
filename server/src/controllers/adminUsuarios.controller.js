import * as servicio from '../services/adminUsuarios.service.js';

// HU-7 · Solo traduce HTTP ↔ servicio. No accede a datos.

export async function listar(req, res) {
  const { rol, estado, q, page, limit } = req.query;
  res.json(await servicio.listar({ rol, estado, q, page, limit }));
}

export async function bloquear(req, res) {
  const usuario = await servicio.bloquear(req.params.id, req.body ?? {}, req.usuario.id);
  res.json({ usuario, mensaje: 'Usuario bloqueado.' });
}

export async function desbloquear(req, res) {
  const usuario = await servicio.desbloquear(req.params.id);
  res.json({ usuario, mensaje: 'Usuario desbloqueado.' });
}

export async function validar(req, res) {
  const { usuario, cupo, mensaje } = await servicio.validarAsesor(req.params.id, req.body ?? {}, req.usuario.id);
  res.json({ usuario, cupo, mensaje });
}
