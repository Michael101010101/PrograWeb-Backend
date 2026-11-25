import * as servicio from '../services/periodo.service.js';

export async function obtenerActivo(_req, res) {
  res.json(await servicio.obtenerPeriodoActivo());
}
