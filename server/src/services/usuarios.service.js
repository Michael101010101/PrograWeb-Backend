import * as usuarios from '../repositories/usuarios.repository.js';
import HttpError from '../utils/HttpError.js';

// HU-7 · Administración de usuarios (lo usa la coordinación).

const ROLES = ['estudiante', 'asesor', 'coordinador'];
const ESTADOS = ['activo', 'sin_verificar', 'pendiente_validacion', 'bloqueado'];

export async function listarUsuarios({ rol, estado, buscar } = {}) {
  if (rol && !ROLES.includes(rol)) throw new HttpError(400, 'Rol no válido.');
  if (estado && !ESTADOS.includes(estado)) throw new HttpError(400, 'Estado no válido.');
  const lista = await usuarios.listar({ rol, estado, buscar: buscar?.trim() || undefined });
  return lista.map(usuarios.sinSecretos);
}

export async function obtenerUsuario(id) {
  const usuario = await usuarios.buscarPorId(id);
  if (!usuario) throw new HttpError(404, 'No existe el usuario.');
  return usuarios.sinSecretos(usuario);
}

/**
 * Cambia el estado de una cuenta:
 *  - 'activo'    → validar asesor pendiente o desbloquear
 *  - 'bloqueado' → requiere motivo
 */
export async function cambiarEstado(id, { estado, motivo } = {}, coordinadorId) {
  if (!['activo', 'bloqueado'].includes(estado)) {
    throw new HttpError(400, 'El estado debe ser "activo" o "bloqueado".', { campos: { estado: 'Elige activo o bloqueado.' } });
  }
  if (id === coordinadorId) throw new HttpError(403, 'No puedes cambiar el estado de tu propia cuenta.');

  const usuario = await usuarios.buscarPorId(id);
  if (!usuario) throw new HttpError(404, 'No existe el usuario.');
  if (usuario.estado === 'sin_verificar' && estado === 'activo') {
    throw new HttpError(409, 'El usuario aún no verifica su correo.');
  }

  let cambios;
  if (estado === 'bloqueado') {
    const texto = String(motivo ?? '').trim();
    if (texto.length < 5) {
      throw new HttpError(400, 'Indica el motivo del bloqueo.', { campos: { motivo: 'Escribe al menos 5 caracteres.' } });
    }
    cambios = { estado, motivoBloqueo: texto };
  } else {
    cambios = { estado, motivoBloqueo: null };
  }
  return usuarios.sinSecretos(await usuarios.actualizar(id, cambios));
}
