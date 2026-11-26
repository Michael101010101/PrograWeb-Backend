import { pool, transaccion } from './db.js';
import * as repo from './repositories/sustentacionesRepository.js';
import * as dominio from './domain/sustentacionesService.js';
import { siguienteIdSustentacion } from './domain/ids.js';

function errorHttp(error, status = 400) { error.status = status; throw error; }
function validar(fn) {
  try { return fn(); } catch (error) {
    if (error instanceof Error && !error.status) error.status = 400;
    throw error;
  }
}
function obtener(s, id) {
  const item = s.sustentaciones.find((x) => x.id === id);
  if (!item) errorHttp(new Error('Sustentación no encontrada.'), 404);
  return item;
}
const admin = (u) => u.rol === 'coordinador' || u.rol === 'administrador';

export async function datos(req, res) { res.json(await repo.obtenerDatos(pool, { usuarioId: req.usuario.id, rol: req.usuario.rol })); }
export async function listado(req, res) { const d = await repo.obtenerDatos(pool, { usuarioId: req.usuario.id, rol: req.usuario.rol }); res.json(d.sustentaciones); }
export async function trabajosConcluidos(req, res) {
  const d = await repo.obtenerDatos(pool, { usuarioId: req.usuario.id, rol: req.usuario.rol });
  res.json(dominio.trabajosPorProgramar(d).filter((t) => t.estado === 'concluido'));
}
export async function detalle(req, res) {
  const d = await repo.obtenerDatos(pool, { usuarioId: req.usuario.id, rol: req.usuario.rol });
  res.json(obtener(d, req.params.id));
}
export async function propia(req,res) {
  const d = await repo.obtenerDatos(pool, { usuarioId: req.usuario.id, rol: req.usuario.rol });
  const t = dominio.trabajoDeEstudiante(d, req.usuario.id);
  res.json({ trabajo: t, sustentacion: t ? dominio.sustentacionDeTrabajo(d, t.codigo) : null });
}
export async function acta(req,res) {
  const d = await repo.obtenerDatos(pool, { usuarioId: req.usuario.id, rol: req.usuario.rol });
  const s = obtener(d, req.params.id);
  if (!s.acta || (!admin(req.usuario) && !s.acta.registrada)) errorHttp(new Error('Acta no disponible.'), 404);
  res.json(s.acta);
}
export async function programar(req,res) {
  const s = await transaccion(async (db) => {
    const d = await repo.obtenerDatos(db);
    const t = d.trabajos.find((x) => x.codigo === req.body?.trabajoCodigo);
    if (!t || t.estado !== 'concluido' || !t.entregables.total || t.entregables.aprobados !== t.entregables.total) errorHttp(new Error('El trabajo debe estar concluido y con entregables aprobados.'));
    // Dentro de la transacción con la tabla bloqueada: dos coordinadores no pueden obtener el mismo número.
    const id = siguienteIdSustentacion(d.sustentaciones.map((x) => x.id));
    const nuevos = validar(() => dominio.programarSustentacion(d, { ...req.body, id }));
    const nueva = obtener(nuevos, id);
    nueva.programadaEl = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    await repo.insertarProgramacion(db, nueva);
    return nueva;
  }, { bloqueo: true });
  res.status(201).json(s);
}
export async function reprogramar(req,res) {
  const s = await transaccion(async (db) => {
    const d = await repo.obtenerDatos(db);
    const antes = obtener(d, req.params.id);
    if (typeof req.body?.motivo !== 'string') errorHttp(new Error('Escribe el motivo de la reprogramación.'));
    const nuevos = validar(() => dominio.reprogramarSustentacion(d, req.params.id, req.body));
    const despues = obtener(nuevos, req.params.id);
    await repo.actualizarProgramacion(db, despues, antes);
    return despues;
  }, { bloqueo: true });
  res.json(s);
}
export async function jurado(req,res) {
  const s = await transaccion(async (db) => {
    const d = await repo.obtenerDatos(db);
    obtener(d, req.params.id);
    if (!Array.isArray(req.body?.jurado) || req.body.jurado.some((m) => !m || typeof m.docenteId !== 'string' || typeof m.presidente !== 'boolean')) errorHttp(new Error('El jurado debe contener docentes válidos y un presidente definido.'));
    const nuevos = validar(() => dominio.guardarJurado(d, req.params.id, req.body.jurado));
    const despues = obtener(nuevos, req.params.id);
    await repo.reemplazarJurado(db, despues);
    return despues;
  }, { bloqueo: true });
  res.json(s);
}
export async function borrador(req,res) {
  const s = await transaccion(async (db) => {
    const d = await repo.obtenerDatos(db);
    obtener(d, req.params.id);
    const nuevos = validar(() => dominio.guardarBorradorActa(d, req.params.id, req.body));
    const despues = obtener(nuevos, req.params.id);
    await repo.guardarActa(db, despues);
    return despues;
  }, { bloqueo: true });
  res.json(s);
}
export async function registrar(req,res) {
  const s = await transaccion(async (db) => {
    const d = await repo.obtenerDatos(db);
    obtener(d, req.params.id);
    const nuevos = validar(() => dominio.registrarActa(d, req.params.id, req.body));
    const despues = obtener(nuevos, req.params.id);
    const ahora = new Date();
    const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).formatToParts(ahora);
    const valor = (k) => partes.find((x) => x.type === k).value;
    despues.acta.registradaEl = `${valor('year')}-${valor('month')}-${valor('day')}`;
    despues.acta.registradaHora = `${valor('hour')}:${valor('minute')}`;
    await repo.guardarActa(db, despues);
    return despues;
  }, { bloqueo: true });
  res.json(s);
}
