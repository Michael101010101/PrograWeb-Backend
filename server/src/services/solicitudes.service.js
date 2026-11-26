import * as asesores from '../repositories/asesores.repository.js';
import * as trabajos from '../repositories/trabajos.repository.js';
import * as solicitudes from '../repositories/solicitudes.repository.js';
import * as historial from '../repositories/historial.repository.js';
import { enTransaccion } from '../repositories/transaccion.js';
import { aPublico, asesorDelUsuario, cupoDisponible } from './asesores.service.js';
import HttpError from '../utils/HttpError.js';
import { hoyEnLima } from '../utils/fechas.js';

// Lógica de negocio de la HU-3 · Solicitudes de asesoría.
// Las validaciones se repiten aquí aunque el front ya las haga: el servidor no confía en el cliente.

const MIN_MENSAJE = 20;
const MAX_MENSAJE = 600;
const MIN_MOTIVO = 10;

/* ─────────── Estudiante ─────────── */

/** "Mi solicitud": el trabajo del estudiante, su última solicitud y, si hubo, el término de la asesoría. */
export async function estadoDelEstudiante(usuarioId) {
  const trabajo = await trabajos.buscarDeEstudiante(usuarioId);
  if (!trabajo) return { trabajo: null, solicitud: null, asesor: null, termino: null };

  const [solicitud, termino] = await Promise.all([
    solicitudes.ultimaDeTrabajo(trabajo.codigo),
    historial.ultimoDeTrabajo(trabajo.codigo),
  ]);
  const asesor = solicitud ? await asesores.buscarPorId(solicitud.asesorId) : null;
  return { trabajo, solicitud, asesor: aPublico(asesor), termino };
}

export async function crearSolicitud(usuarioId, datos = {}) {
  const asesorId = String(datos.asesorId ?? '').trim();
  const mensaje = String(datos.mensaje ?? '').trim();

  // El trabajo se toma de la sesión, no del cuerpo: un estudiante solo solicita para su propio trabajo
  const trabajo = await trabajos.buscarDeEstudiante(usuarioId);
  if (!trabajo) throw new HttpError(409, 'Primero debes registrar tu trabajo.');
  if (trabajo.asesorId) throw new HttpError(409, 'Tu trabajo ya tiene un asesor asignado.');
  if (await solicitudes.buscarPendienteDeTrabajo(trabajo.codigo)) {
    throw new HttpError(409, 'Ya tienes una solicitud activa para este trabajo.');
  }

  const asesor = await asesores.buscarPorId(asesorId);
  if (!asesor) throw new HttpError(404, 'El asesor no existe.');
  if (cupoDisponible(asesor) === 0) throw new HttpError(409, 'Este asesor no tiene cupo disponible.');
  if (!asesor.lineas.includes(trabajo.linea)) throw new HttpError(400, `El asesor no atiende la línea ${trabajo.linea}.`);
  if (mensaje.length < MIN_MENSAJE) {
    throw new HttpError(400, `El mensaje de sustento debe tener al menos ${MIN_MENSAJE} caracteres.`, { campos: { mensaje: `Mínimo ${MIN_MENSAJE} caracteres` } });
  }
  if (mensaje.length > MAX_MENSAJE) {
    throw new HttpError(400, `El mensaje de sustento no puede superar los ${MAX_MENSAJE} caracteres.`, { campos: { mensaje: `Máximo ${MAX_MENSAJE} caracteres` } });
  }

  try {
    return await solicitudes.crear({
      asesorId,
      trabajoCodigo: trabajo.codigo,
      estado: 'pendiente',
      fecha: hoyEnLima(),
      equipo: trabajo.integrantes.map((i, indice) => ({ nombre: i.nombre, responsable: indice === 0 })),
      mensaje,
    });
  } catch (error) {
    // Dos envíos simultáneos: el índice único de la base (una pendiente por trabajo) frena al segundo
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new HttpError(409, 'Ya tienes una solicitud activa para este trabajo.');
    }
    throw error;
  }
}

export async function retirarSolicitud(usuarioId, solicitudId) {
  const trabajo = await trabajos.buscarDeEstudiante(usuarioId);
  const solicitud = await solicitudes.buscarPorId(solicitudId);
  if (!trabajo || !solicitud || solicitud.trabajo.codigo !== trabajo.codigo) {
    throw new HttpError(404, 'No encontramos esa solicitud.');
  }
  if (solicitud.estado !== 'pendiente') throw new HttpError(409, 'La solicitud ya no está pendiente.');
  return solicitudes.actualizar(solicitudId, { estado: 'retirada', resueltaEl: hoyEnLima() });
}

/* ─────────── Asesor ─────────── */

export async function bandejaDelAsesor(usuarioId, estado) {
  const asesor = await asesorDelUsuario(usuarioId);
  const todas = await solicitudes.listarDeAsesor(asesor.id);
  const pendientes = todas.filter((s) => s.estado === 'pendiente');
  const resueltas = todas.filter((s) => s.estado !== 'pendiente');

  let lista = todas;
  if (estado === 'pendientes') lista = pendientes;
  if (estado === 'resueltas') lista = resueltas;

  return {
    solicitudes: lista,
    pendientes: pendientes.length,
    resueltas: resueltas.length,
    cupoDisponible: cupoDisponible(asesor),
    cupoMaximo: asesor.cupoMaximo,
  };
}

/** Busca la solicitud en la bandeja del asesor; 404 si no existe o es de otro asesor. */
async function solicitudDelAsesor(asesorId, solicitudId, opciones) {
  const solicitud = await solicitudes.buscarPorId(solicitudId, opciones);
  if (!solicitud || solicitud.asesorId !== asesorId) throw new HttpError(404, 'No encontramos esa solicitud en tu bandeja.');
  if (solicitud.estado !== 'pendiente') throw new HttpError(409, 'La solicitud ya no está pendiente.');
  return solicitud;
}

export async function aceptarSolicitud(usuarioId, solicitudId) {
  const asesor = await asesorDelUsuario(usuarioId);

  // Tres cambios que van juntos (o ninguno): cupo del asesor, trabajo asignado y solicitud aceptada
  return enTransaccion(async (opciones) => {
    const solicitud = await solicitudDelAsesor(asesor.id, solicitudId, opciones);

    // Bloquea la fila del asesor: si acepta dos solicitudes a la vez, la segunda espera y ve el cupo real
    const actual = await asesores.buscarParaActualizar(asesor.id, opciones);
    if (cupoDisponible(actual) === 0) throw new HttpError(409, 'No tienes cupo disponible para aceptar esta solicitud.');

    const trabajo = await trabajos.buscarPorCodigo(solicitud.trabajo.codigo, opciones);
    if (trabajo.asesorId) throw new HttpError(409, 'Ese trabajo ya tiene un asesor asignado.');

    const ocupados = actual.cupoOcupado + 1;
    const asesorActualizado = await asesores.actualizar(
      asesor.id,
      { cupoOcupado: ocupados, sinCupoDesde: ocupados === actual.cupoMaximo ? hoyEnLima() : null },
      opciones
    );
    await trabajos.actualizar(
      trabajo.codigo,
      { asesorId: asesor.id, estado: 'en_desarrollo', nota: { tono: 'warning', texto: 'Plan de entregables por definir' } },
      opciones
    );
    const aceptada = await solicitudes.actualizar(solicitudId, { estado: 'aceptada', resueltaEl: hoyEnLima() }, opciones);

    return { solicitud: aceptada, asesor: aPublico(asesorActualizado) };
  });
}

export async function rechazarSolicitud(usuarioId, solicitudId, motivoIngresado) {
  const motivo = String(motivoIngresado ?? '').trim();
  if (motivo.length < MIN_MOTIVO) {
    throw new HttpError(400, `Escribe un motivo de al menos ${MIN_MOTIVO} caracteres.`, { campos: { motivo: `Mínimo ${MIN_MOTIVO} caracteres` } });
  }
  const asesor = await asesorDelUsuario(usuarioId);
  await solicitudDelAsesor(asesor.id, solicitudId);
  return solicitudes.actualizar(solicitudId, { estado: 'rechazada', motivo, resueltaEl: hoyEnLima() });
}
