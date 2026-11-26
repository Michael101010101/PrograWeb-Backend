import * as servicio from '../services/solicitudes.service.js';

// HU-3 · Controlador de solicitudes: solo traduce HTTP (req/res) ↔ servicio.

export async function mia(req, res) {
  res.json(await servicio.estadoDelEstudiante(req.usuario.id));
}

export async function crear(req, res) {
  const solicitud = await servicio.crearSolicitud(req.usuario.id, req.body);
  res.status(201).json({ solicitud, mensaje: 'Solicitud enviada.' });
}

export async function retirar(req, res) {
  const solicitud = await servicio.retirarSolicitud(req.usuario.id, req.params.id);
  res.json({ solicitud, mensaje: 'Solicitud retirada.' });
}

export async function bandeja(req, res) {
  res.json(await servicio.bandejaDelAsesor(req.usuario.id, req.query.estado));
}

export async function aceptar(req, res) {
  const resultado = await servicio.aceptarSolicitud(req.usuario.id, req.params.id);
  res.json({ ...resultado, mensaje: 'Asesoría aceptada.' });
}

export async function rechazar(req, res) {
  const solicitud = await servicio.rechazarSolicitud(req.usuario.id, req.params.id, req.body?.motivo);
  res.json({ solicitud, mensaje: 'Solicitud rechazada.' });
}
