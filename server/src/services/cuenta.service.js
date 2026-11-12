import bcrypt from 'bcryptjs';
import HttpError from '../utils/HttpError.js';
import * as usuarios from '../repositories/usuarios.repository.js';
import { hashPassword, lanzarSiHayErrores } from './auth.service.js';
import { limpiar, validarCambioPassword, validarPerfil } from '../utils/validators.js';

const NOTIF_POR_DEFECTO = { entregables: true, retroalimentacion: true, resumenSemanal: false };

function prefijar(obj, prefijo) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [prefijo + k, v]));
}

export async function obtenerCuenta(usuarioId) {
  const u = await usuarios.buscarPorId(usuarioId);
  if (!u) throw new HttpError(404, 'No encontramos tu cuenta.');
  return usuarios.sinSecretos(u);
}

export async function actualizarCuenta(usuarioId, { perfil = {}, cambioPassword = {} }) {
  const actual = await usuarios.buscarPorId(usuarioId);
  if (!actual) throw new HttpError(404, 'No encontramos tu cuenta.');

  lanzarSiHayErrores({
    ...validarPerfil(perfil, actual.rol),
    ...prefijar(validarCambioPassword(cambioPassword), 'password_'),
  });

  // Correo, rol, código de alumno y estado solo los cambia la coordinación: se ignoran aquí.
  const cambios = {
    nombres: limpiar(perfil.nombres),
    apellidos: limpiar(perfil.apellidos),
    telefono: String(perfil.telefono ?? '').replace(/\s/g, ''),
    notificaciones: { ...NOTIF_POR_DEFECTO, ...perfil.notificaciones },
  };
  if (actual.rol === 'estudiante') Object.assign(cambios, { carrera: perfil.carrera, ciclo: perfil.ciclo });
  if (actual.rol === 'asesor') Object.assign(cambios, { gradoAcademico: perfil.gradoAcademico, departamento: perfil.departamento });

  let cambioClave = false;
  if (cambioPassword.actual) {
    if (!(await bcrypt.compare(cambioPassword.actual, actual.passwordHash))) {
      throw new HttpError(401, 'La contraseña actual es incorrecta. Intenta de nuevo.', {
        campos: { password_actual: 'Contraseña incorrecta' },
      });
    }
    cambios.passwordHash = await hashPassword(cambioPassword.nueva);
    cambioClave = true;
  }

  const actualizado = await usuarios.actualizar(usuarioId, cambios);
  return { usuario: usuarios.sinSecretos(actualizado), cambioClave };
}
