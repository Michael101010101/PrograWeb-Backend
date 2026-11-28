import * as revisiones from '../repositories/revisiones.repository.js';
import * as planes from '../repositories/entregables.repository.js'; // HU-4 (solo lectura)
import * as trabajosHu2 from '../repositories/trabajos.repository.js'; // HU-2 (solo lectura)
import { sincronizarEstado } from './entregables.service.js'; // HU-4: recalcula el estado del entregable
import HttpError from '../utils/HttpError.js';

// Servicio de la HU-5 · Revisión y retroalimentación de avances.
//  - quien revisa debe ser el asesor del trabajo (HU-2/HU-3);
//  - solo se revisa la versión que está en revisión (la última del entregable);
//  - al observar el comentario es obligatorio;
//  - el estado del entregable lo recalcula la HU-4 (sincronizarEstado); el porcentaje NO se guarda.

export const COMENTARIO_MIN = 30; // al observar (igual que la pantalla)
export const COMENTARIO_MAX = 800;

const hoyEnLima = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
const texto = (valor) => String(valor ?? '').trim();

// ─────────── Permisos ───────────

const esAsesorDe = (datos, usuario) => datos.trabajo.asesor?.usuarioId === usuario.id;
const esIntegrante = (datos, usuario) => datos.trabajo.integrantes.includes(usuario.id);

/** Carga el avance con su entregable y su trabajo, y decide qué papel tiene el usuario (asesor | estudiante). */
async function cargarAvance(usuario, avanceId) {
  const avance = await revisiones.buscarAvance(avanceId);
  if (!avance) throw new HttpError(404, 'El avance no existe.');
  const entregable = await planes.buscarEntregable(avance.entregableId);
  const datos = entregable ? await planes.cargarPlan(entregable.trabajoId) : null;
  if (!datos) throw new HttpError(404, 'El avance no existe.');

  let rol = null;
  if (usuario.rol === 'asesor' && esAsesorDe(datos, usuario)) rol = 'asesor';
  else if (usuario.rol === 'estudiante' && esIntegrante(datos, usuario)) rol = 'estudiante';
  // Si no es de su trabajo se responde 404: no se revela que existe.
  if (!rol) throw new HttpError(404, 'El avance no existe.');
  return { datos, entregable, rol, avance: datos.avances.find((a) => a.id === avance.id) };
}

// ─────────── Vistas ───────────

function itemAvance(datos, avance) {
  const entregable = datos.entregables.find((e) => e.id === avance.entregableId);
  return {
    id: avance.id,
    version: avance.version,
    fecha: avance.fecha,
    diasRetraso: avance.diasRetraso,
    estado: avance.estado, // en_revision | observado | aprobado
    enlace: avance.enlace,
    descripcion: avance.descripcion,
    revision: avance.revision,
    entregable: { id: entregable.id, nombre: entregable.nombre, orden: entregable.orden, peso: entregable.peso },
    trabajo: { id: datos.trabajo.id, codigo: datos.trabajo.codigo, titulo: datos.trabajo.titulo },
  };
}

/** Avance del trabajo = suma de pesos de los entregables obligatorios aprobados (no se guarda). */
function porcentajeAvance(datos) {
  return datos.entregables.filter((e) => e.obligatorio && e.estado === 'aprobado').reduce((suma, e) => suma + e.peso, 0);
}

// ─────────── Asesor: bandeja ───────────

/** GET /api/revision/bandeja — avances de todos sus asesorados, los pendientes primero. */
export async function bandeja(usuario) {
  const trabajos = await planes.trabajosDeAsesor(usuario.id);
  const items = [];
  for (const t of trabajos) {
    const datos = await planes.cargarPlan(t.id);
    for (const a of datos.avances) items.push(itemAvance(datos, a));
  }
  const orden = { en_revision: 0, observado: 1, aprobado: 2 };
  items.sort((x, y) => orden[x.estado] - orden[y.estado] || String(x.fecha).localeCompare(String(y.fecha)));
  const conteo = (estado) => items.filter((i) => i.estado === estado).length;
  return {
    avances: items,
    conteos: { pendientes: conteo('en_revision'), observados: conteo('observado'), aprobados: conteo('aprobado'), total: items.length },
  };
}

// ─────────── Detalle e historial de versiones ───────────

/** GET /api/revision/avances/:id — el avance, todas las versiones del entregable y la conversación. */
export async function detalle(usuario, avanceId) {
  const { datos, entregable, rol, avance } = await cargarAvance(usuario, avanceId);
  const versiones = datos.avances.filter((a) => a.entregableId === entregable.id).sort((a, b) => a.version - b.version);
  const ultima = versiones.at(-1);
  const comentarios = {};
  for (const v of versiones) comentarios[v.id] = await revisiones.comentariosDe(v.id);
  return {
    rol,
    avance: itemAvance(datos, avance),
    versiones: versiones.map((v) => itemAvance(datos, v)),
    comentarios, // por id de avance (el comentario de la revisión viaja dentro de `revision`)
    puedeRevisar: rol === 'asesor' && avance.id === ultima.id && avance.estado === 'en_revision' && datos.trabajo.estado === 'en_desarrollo',
    trabajo: { ...itemAvance(datos, avance).trabajo, estado: datos.trabajo.estado, asesor: datos.trabajo.asesor },
    avanceDelTrabajo: porcentajeAvance(datos),
  };
}

// ─────────── Aprobar u observar ───────────

async function revisar(usuario, avanceId, resultado, comentarioCrudo) {
  const { datos, rol, avance } = await cargarAvance(usuario, avanceId);
  if (rol !== 'asesor') throw new HttpError(403, 'Solo el asesor del trabajo puede revisar avances.');
  if (datos.trabajo.estado !== 'en_desarrollo') throw new HttpError(409, 'El trabajo no está en desarrollo: no se puede revisar.');
  if (avance.estado !== 'en_revision') throw new HttpError(409, 'Este avance ya fue revisado.');
  const ultima = datos.avances.filter((a) => a.entregableId === avance.entregableId).sort((a, b) => a.version - b.version).at(-1);
  if (ultima.id !== avance.id) throw new HttpError(409, 'Hay una versión más reciente de este entregable.');

  const comentario = texto(comentarioCrudo);
  if (resultado === 'observado' && !comentario) {
    throw new HttpError(400, 'Escribe el comentario de la observación.', { campos: { comentario: 'El comentario es obligatorio al observar.' } });
  }
  if (resultado === 'observado' && comentario.length < COMENTARIO_MIN) {
    throw new HttpError(400, `Explica la observación en al menos ${COMENTARIO_MIN} caracteres.`, {
      campos: { comentario: `Mínimo ${COMENTARIO_MIN} caracteres.` },
    });
  }
  if (comentario.length > COMENTARIO_MAX) {
    throw new HttpError(400, `El comentario no puede superar los ${COMENTARIO_MAX} caracteres.`, {
      campos: { comentario: `Máximo ${COMENTARIO_MAX} caracteres.` },
    });
  }

  await revisiones.guardarRevision(avance.id, { resultado, comentario, revisorId: usuario.id, fechaRevision: hoyEnLima() });
  await sincronizarEstado(avance.entregableId); // HU-4 guarda el nuevo estado del entregable
  return detalle(usuario, avance.id);
}

/** POST /api/revision/avances/:id/aprobar   body: { comentario? } */
export const aprobar = (usuario, avanceId, body = {}) => revisar(usuario, avanceId, 'aprobado', body.comentario);

/** POST /api/revision/avances/:id/observar   body: { comentario } (obligatorio) */
export const observar = (usuario, avanceId, body = {}) => revisar(usuario, avanceId, 'observado', body.comentario);

// ─────────── Conversación ───────────

/** POST /api/revision/avances/:id/comentarios   body: { texto, respuestaAId? } — asesor o estudiante del trabajo. */
export async function comentar(usuario, avanceId, body = {}) {
  const { rol, avance } = await cargarAvance(usuario, avanceId);
  const mensaje = texto(body.texto);
  if (!mensaje) throw new HttpError(400, 'Escribe tu comentario.', { campos: { texto: 'El comentario es obligatorio.' } });
  if (mensaje.length > COMENTARIO_MAX) {
    throw new HttpError(400, `El comentario no puede superar los ${COMENTARIO_MAX} caracteres.`, { campos: { texto: `Máximo ${COMENTARIO_MAX} caracteres.` } });
  }
  let respuestaAId = null;
  if (body.respuestaAId) {
    const original = await revisiones.buscarComentario(body.respuestaAId);
    if (!original || original.avanceId !== avance.id) throw new HttpError(400, 'El comentario al que respondes no existe.');
    respuestaAId = original.id;
  }
  await revisiones.crearComentario({ avanceId: avance.id, autorId: usuario.id, rol, texto: mensaje, respuestaAId });
  return { comentarios: await revisiones.comentariosDe(avance.id) };
}

// ─────────── Vista consolidada del trabajo ───────────

/** GET /api/revision/trabajos/:trabajoId/consolidado — plan completo con la última versión de cada entregable. */
export async function consolidado(usuario, trabajoId) {
  const datos = await planes.cargarPlan(trabajoId);
  const permitido = datos && ((usuario.rol === 'asesor' && esAsesorDe(datos, usuario)) || (usuario.rol === 'estudiante' && esIntegrante(datos, usuario)));
  if (!permitido) throw new HttpError(404, 'Trabajo no encontrado.');
  return {
    trabajo: { id: datos.trabajo.id, codigo: datos.trabajo.codigo, titulo: datos.trabajo.titulo, estado: datos.trabajo.estado, asesor: datos.trabajo.asesor },
    avance: porcentajeAvance(datos),
    entregables: datos.entregables.map((e) => {
      const versiones = datos.avances.filter((a) => a.entregableId === e.id).sort((a, b) => a.version - b.version);
      return {
        id: e.id, orden: e.orden, nombre: e.nombre, peso: e.peso, obligatorio: e.obligatorio, fechaLimite: e.fechaLimite, estado: e.estado,
        versiones: versiones.map((v) => itemAvance(datos, v)),
        ultima: versiones.length ? itemAvance(datos, versiones.at(-1)) : null,
      };
    }),
  };
}

// ─────────── Todo lo que necesita el front de la HU-5 en una sola llamada ───────────

/**
 * GET /api/revision/mis-datos
 * Devuelve { trabajos, entregables, avances } con el formato que lee el front de la HU-5:
 * trabajos con `codigo`, entregables con `trabajoCodigo` y avances con su conversación (`comentarios`).
 *  - asesor: todos sus asesorados; estudiante: su trabajo vigente.
 */
export async function misDatos(usuario) {
  let ids = [];
  if (usuario.rol === 'asesor') ids = (await planes.trabajosDeAsesor(usuario.id)).map((t) => t.id);
  else if (usuario.rol === 'estudiante') ids = [await planes.trabajoIdDeEstudiante(usuario.id)].filter(Boolean);

  const trabajos = [];
  const entregables = [];
  const avances = [];
  for (const id of ids) {
    const datos = await planes.cargarPlan(id);
    const completo = await trabajosHu2.buscarPorId(id);
    trabajos.push({
      id: datos.trabajo.id,
      codigo: datos.trabajo.codigo,
      titulo: datos.trabajo.titulo,
      linea: datos.trabajo.linea,
      estado: datos.trabajo.estado,
      responsableId: completo?.integrantes?.find((i) => i.responsable)?.usuarioId,
      integrantes: datos.trabajo.integrantes,
      equipo: (completo?.integrantes ?? []).map((i) => ({ usuarioId: i.usuarioId, nombre: i.nombre, responsable: Boolean(i.responsable) })),
      asesor: datos.trabajo.asesor && { ...datos.trabajo.asesor, id: datos.trabajo.asesor.usuarioId },
    });
    for (const e of datos.entregables) {
      entregables.push({ ...e, trabajoCodigo: datos.trabajo.codigo, peso: Number(e.peso), obligatorio: Boolean(e.obligatorio) });
    }
    for (const a of datos.avances) avances.push(a);
  }
  const conversaciones = await revisiones.comentariosDeVarios(avances.map((a) => a.id));
  return {
    trabajos,
    entregables,
    avances: avances.map((a) => ({ ...a, comentarios: conversaciones[a.id] ?? [] })),
  };
}
