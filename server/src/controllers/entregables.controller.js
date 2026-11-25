import * as servicio from '../services/entregables.service.js';

// HU-4 · Controladores: leen la petición (usuario del JWT, parámetros y cuerpo),
// llaman al servicio y responden JSON. Las reglas y validaciones están en el servicio.

// ─────────── Estudiante ───────────

export async function miPlan(req, res) {
  res.json(await servicio.planDelEstudiante(req.usuario));
}

export async function registrarAvance(req, res) {
  const plan = await servicio.registrarAvance(req.usuario, req.params.id, req.body);
  res.status(201).json({ plan, mensaje: 'Avance registrado.' });
}

export async function solicitarAmpliacion(req, res) {
  const plan = await servicio.solicitarAmpliacion(req.usuario, req.params.id, req.body);
  res.status(201).json({ plan, mensaje: 'Solicitud de ampliación enviada.' });
}

// ─────────── Asesor ───────────

export async function listarPlanes(req, res) {
  res.json({ planes: await servicio.planesDelAsesor(req.usuario) });
}

export async function obtenerPlan(req, res) {
  res.json(await servicio.planDelAsesor(req.usuario, req.params.codigo));
}

export async function crearEntregable(req, res) {
  const plan = await servicio.guardarEntregable(req.usuario, req.params.codigo, req.body);
  res.status(201).json({ plan, mensaje: 'Entregable agregado al plan.' });
}

export async function editarEntregable(req, res) {
  const plan = await servicio.guardarEntregable(req.usuario, req.params.codigo, req.body, req.params.id);
  res.json({ plan, mensaje: 'Entregable actualizado.' });
}

export async function eliminarEntregable(req, res) {
  const plan = await servicio.eliminarEntregable(req.usuario, req.params.codigo, req.params.id);
  res.json({ plan, mensaje: 'Entregable eliminado.' });
}

export async function aplicarPlantilla(req, res) {
  const plan = await servicio.aplicarPlantilla(req.usuario, req.params.codigo);
  res.status(201).json({ plan, mensaje: 'Se cargó la plantilla del ciclo.' });
}

export async function responderAmpliacion(req, res) {
  const plan = await servicio.responderAmpliacion(req.usuario, req.params.codigo, req.params.id, req.body);
  res.json({ plan, mensaje: req.body.aceptar ? 'Ampliación aceptada.' : 'Ampliación rechazada.' });
}
