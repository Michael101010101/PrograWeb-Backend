import * as servicio from '../services/adminTrabajos.service.js';

// HU-7 · Solo traduce HTTP ↔ servicio. No accede a datos.

export async function listar(req, res) {
  const { estado, lineaId, asesorId, carrera, periodoId, q, page, limit } = req.query;
  res.json(await servicio.listar({ estado, lineaId, asesorId, carrera, periodoId, q, page, limit }));
}

export async function filtros(_req, res) {
  res.json(await servicio.filtros());
}

export async function detalle(req, res) {
  res.json({ trabajo: await servicio.detalle(req.params.id) });
}
