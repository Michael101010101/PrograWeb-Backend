import * as servicio from '../services/usuarios.service.js';

export async function listar(req, res) {
  const { rol, estado, buscar } = req.query;
  res.json({ usuarios: await servicio.listarUsuarios({ rol, estado, buscar }) });
}

export async function obtener(req, res) {
  res.json({ usuario: await servicio.obtenerUsuario(req.params.id) });
}

export async function cambiarEstado(req, res) {
  const usuario = await servicio.cambiarEstado(req.params.id, req.body, req.usuario.id);
  res.json({ usuario, mensaje: 'Estado actualizado.' });
}
