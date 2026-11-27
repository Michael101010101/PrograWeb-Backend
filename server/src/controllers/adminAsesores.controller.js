import * as servicio from '../services/adminAsesores.service.js';

// HU-7 · Solo traduce HTTP ↔ servicio. No accede a datos.

export async function listar(req, res) {
  const { estado, q, page, limit } = req.query;
  res.json(await servicio.listar({ estado, q, page, limit }));
}

export async function detalle(req, res) {
  res.json({ asesor: await servicio.detalle(req.params.id) });
}

export async function ampliarCupo(req, res) {
  const { asesor, cupo } = await servicio.ampliarCupo(req.params.id, req.body ?? {}, req.usuario.id);
  res.json({ asesor, cupo, mensaje: 'Cupo ampliado.' });
}

export async function escribir(req, res) {
  const registro = await servicio.escribir(req.params.id, req.body ?? {}, req.usuario.id);
  res.status(201).json({ registro, mensaje: 'Mensaje guardado.' });
}
