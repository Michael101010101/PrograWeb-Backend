import * as servicio from '../services/adminTablero.service.js';

// HU-7 · Solo traduce HTTP ↔ servicio. No accede a datos.

export async function tablero(req, res) {
  const { periodoId } = req.query;
  res.json(await servicio.tablero({ periodoId }));
}

export async function distribucion(req, res) {
  const { desde, hasta, periodoId } = req.query;
  res.json(await servicio.distribucion({ desde, hasta, periodoId }));
}
