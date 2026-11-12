import * as invitaciones from '../services/invitaciones.service.js';

export async function listar(_req, res) {
  res.json(await invitaciones.listar());
}

export async function crear(req, res) {
  res.status(201).json(await invitaciones.crear(req.usuario, req.body));
}

export async function anular(req, res) {
  await invitaciones.anular(req.params.codigo);
  res.status(204).end();
}
