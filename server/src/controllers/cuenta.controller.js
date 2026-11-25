import * as cuenta from '../services/cuenta.service.js';

export async function obtener(req, res) {
  res.json({ usuario: await cuenta.obtenerCuenta(req.usuario.id) });
}

export async function actualizar(req, res) {
  res.json(await cuenta.actualizarCuenta(req.usuario.id, req.body));
}
