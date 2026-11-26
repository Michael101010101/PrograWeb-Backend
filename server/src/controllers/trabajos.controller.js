import * as servicio from '../services/trabajos.service.js';

export async function catalogos(_req, res) {
  res.json(await servicio.obtenerCatalogos());
}

export async function miTrabajo(req, res) {
  res.json(await servicio.obtenerMiTrabajo(req.usuario.id));
}

export async function misTrabajos(req, res) {
  res.json({ trabajos: await servicio.listarMisTrabajos(req.usuario.id, req.query.estado) });
}

export async function resumen(req, res) {
  res.json({ trabajo: await servicio.resumenTrabajoVigente(req.usuario.id) });
}

export async function buscarEstudiantes(req, res) {
  res.json({ estudiantes: await servicio.buscarEstudiantes(req.query.q, req.query.trabajoId) });
}

export async function obtener(req, res) {
  res.json({ trabajo: await servicio.obtenerFicha(req.params.id, req.usuario) });
}

export async function crear(req, res) {
  const trabajo = await servicio.registrarTrabajo(req.usuario, req.body);
  res.status(201).location(`/api/trabajos/${trabajo.id}`).json({ trabajo, mensaje: 'Trabajo registrado.' });
}

export async function actualizar(req, res) {
  res.json({ trabajo: await servicio.actualizarFicha(req.usuario, req.params.id, req.body), mensaje: 'Ficha actualizada.' });
}

export async function guardarEquipo(req, res) {
  res.json({ trabajo: await servicio.guardarEquipo(req.usuario, req.params.id, req.body?.integrantes), mensaje: 'Equipo actualizado.' });
}

export async function cambiarEstado(req, res) {
  const { estado, motivo } = req.body ?? {};
  res.json(await servicio.cambiarEstado(req.usuario, req.params.id, estado, motivo));
}