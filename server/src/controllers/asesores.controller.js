import * as servicio from '../services/asesores.service.js';

// HU-3 · Controlador de asesores: solo traduce HTTP (req/res) ↔ servicio.

export async function listar(req, res) {
  res.json(await servicio.listarDirectorio(req.query));
}

export async function destacados(_req, res) {
  res.json({ asesores: await servicio.destacados() });
}

export async function alternativas(req, res) {
  res.json(await servicio.alternativas(req.params.id, req.query.linea));
}

export async function miFicha(req, res) {
  res.json(await servicio.miFicha(req.usuario.id));
}

export async function actualizarFicha(req, res) {
  const asesor = await servicio.actualizarFicha(req.usuario.id, req.body);
  res.json({ asesor, mensaje: 'Ficha actualizada.' });
}

export async function misAsesorados(req, res) {
  res.json(await servicio.misAsesorados(req.usuario.id));
}

export async function asesorado(req, res) {
  res.json(await servicio.asesorado(req.usuario.id, req.params.codigo));
}

export async function terminarAsesoria(req, res) {
  const resultado = await servicio.terminarAsesoria(req.usuario.id, req.params.codigo, req.body?.motivo);
  res.json({ ...resultado, mensaje: 'Asesoría terminada.' });
}
