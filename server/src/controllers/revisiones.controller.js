import * as servicio from '../services/revisiones.service.js';

// HU-5 · Controladores: leen la petición (usuario del JWT, parámetros y cuerpo), llaman al servicio y responden JSON.
// Las reglas y validaciones están en el servicio.

export async function misDatos(req, res) {
  res.json(await servicio.misDatos(req.usuario));
}

export async function bandeja(req, res) {
  res.json(await servicio.bandeja(req.usuario));
}

export async function detalle(req, res) {
  res.json(await servicio.detalle(req.usuario, req.params.id));
}

export async function aprobar(req, res) {
  res.json({ ...(await servicio.aprobar(req.usuario, req.params.id, req.body)), mensaje: 'Avance aprobado.' });
}

export async function observar(req, res) {
  res.json({ ...(await servicio.observar(req.usuario, req.params.id, req.body)), mensaje: 'Avance observado.' });
}

export async function comentar(req, res) {
  res.status(201).json({ ...(await servicio.comentar(req.usuario, req.params.id, req.body)), mensaje: 'Comentario enviado.' });
}

export async function consolidado(req, res) {
  res.json(await servicio.consolidado(req.usuario, req.params.trabajoId));
}
