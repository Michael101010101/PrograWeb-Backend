import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import HttpError from '../utils/HttpError.js';
import * as usuarios from '../repositories/usuarios.repository.js';

/**
 * Exige un JWT válido en la cabecera Authorization: Bearer <token>.
 * Deja el usuario en req.usuario (sin el hash de la contraseña).
 * Las demás historias lo usan para proteger sus rutas.
 */
export async function autenticar(req, _res, next) {
  try {
    const [tipo, token] = (req.headers.authorization ?? '').split(' ');
    if (tipo !== 'Bearer' || !token) throw new HttpError(401, 'Inicia sesión para continuar.');

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch {
      throw new HttpError(401, 'Tu sesión venció. Inicia sesión de nuevo.');
    }

    const usuario = await usuarios.buscarPorId(payload.sub);
    if (!usuario || usuario.estado !== 'activo') throw new HttpError(401, 'Tu cuenta ya no está habilitada.');

    req.usuario = usuarios.sinSecretos(usuario);
    next();
  } catch (error) {
    next(error);
  }
}

/** Uso: router.get('/ruta', autenticar, autorizar('coordinador'), controlador) */
export function autorizar(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.usuario?.rol)) {
      return next(new HttpError(403, 'No tienes permiso para esta acción.'));
    }
    next();
  };
}
