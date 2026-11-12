import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import HttpError from '../utils/HttpError.js';
import { env } from '../config/env.js';
import * as usuarios from '../repositories/usuarios.repository.js';
import * as tokens from '../repositories/tokens.repository.js';
import * as invitaciones from '../repositories/invitaciones.repository.js';
import * as intentos from '../repositories/intentos.repository.js';
import { enviarCorreo } from './correo.service.js';
import {
  limpiar,
  validarConfirmacion,
  validarCorreoInstitucional,
  validarPassword,
  validarRegistroAsesor,
  validarRegistroCoordinador,
  validarRegistroEstudiante,
} from '../utils/validators.js';

// Lógica de negocio de la HU-1. No conoce Express (req/res) ni SQL: usa repositorios.

const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 15;
const RONDAS_BCRYPT = 10;

export function lanzarSiHayErrores(errores, mensaje = 'Corrige los campos marcados.') {
  if (Object.keys(errores).length > 0) throw new HttpError(400, mensaje, { campos: errores });
}

/** En desarrollo se devuelve el enlace para probar sin correo real (EXPONER_ENLACES=true). */
function enlaceDemo(ruta) {
  return env.exponerEnlaces ? ruta : null;
}

export function firmarToken(usuario) {
  return jwt.sign({ sub: usuario.id, rol: usuario.rol }, env.jwtSecret, { expiresIn: env.jwtExpira });
}

export function hashPassword(password) {
  return bcrypt.hash(password, RONDAS_BCRYPT);
}

/* ─────────── Inicio de sesión ─────────── */

export async function iniciarSesion({ correo: correoIngresado, password }) {
  const correo = String(correoIngresado ?? '').trim().toLowerCase();
  const errorCorreo = validarCorreoInstitucional(correo);
  if (errorCorreo || !password) {
    throw new HttpError(400, 'Completa tu correo y contraseña.', {
      campos: { ...(errorCorreo && { correo: errorCorreo }), ...(!password && { password: 'Ingresa tu contraseña' }) },
    });
  }

  const registro = await intentos.obtener(correo);
  if (registro.bloqueadoHasta && new Date(registro.bloqueadoHasta) > new Date()) {
    const min = Math.ceil((new Date(registro.bloqueadoHasta) - new Date()) / 60000);
    throw new HttpError(423, `Superaste los intentos permitidos. Vuelve a intentarlo en ${min} min o recupera tu contraseña.`);
  }

  const usuario = await usuarios.buscarPorCorreo(correo);
  const correcta = usuario ? await bcrypt.compare(password, usuario.passwordHash) : false;

  if (!correcta) {
    const fallidos = registro.fallidos + 1;
    const bloquear = fallidos >= MAX_INTENTOS;
    await intentos.guardar(correo, {
      fallidos: bloquear ? 0 : fallidos,
      bloqueadoHasta: bloquear ? new Date(Date.now() + MINUTOS_BLOQUEO * 60000) : null,
    });
    if (bloquear) {
      throw new HttpError(423, `Superaste los intentos permitidos. Tu acceso queda bloqueado ${MINUTOS_BLOQUEO} minutos.`);
    }
    const restantes = MAX_INTENTOS - fallidos;
    throw new HttpError(
      401,
      `El correo o la contraseña no coinciden. Te ${restantes === 1 ? 'queda 1 intento' : `quedan ${restantes} intentos`} antes del bloqueo temporal de ${MINUTOS_BLOQUEO} minutos.`,
      { campos: { password: 'Contraseña incorrecta' }, datos: { restantes } }
    );
  }

  await intentos.limpiar(correo);

  if (usuario.estado === 'sin_verificar') {
    throw new HttpError(403, 'Tu cuenta aún no está verificada. Revisa el enlace que enviamos a tu correo.', {
      datos: { motivo: 'sin_verificar' },
    });
  }
  if (usuario.estado === 'pendiente_validacion') {
    throw new HttpError(403, 'Tu cuenta de asesor está pendiente de validación por la coordinación. Te avisaremos por correo.', {
      datos: { motivo: 'pendiente_validacion' },
    });
  }
  if (usuario.estado === 'bloqueado') {
    throw new HttpError(403, `Tu cuenta está bloqueada. Motivo: ${usuario.motivoBloqueo ?? 'no especificado'}. Escribe a tfc@ulima.edu.pe.`, {
      datos: { motivo: 'bloqueado' },
    });
  }

  const ingresoAnterior = usuario.ultimoIngreso;
  const actualizado = await usuarios.actualizar(usuario.id, { ultimoIngreso: new Date() });
  return { token: firmarToken(actualizado), usuario: usuarios.sinSecretos(actualizado), ingresoAnterior };
}

/* ─────────── Registro ─────────── */

async function verificarDuplicados({ correo, codigoAlumno }) {
  const campos = {};
  if (await usuarios.buscarPorCorreo(correo)) campos.correo = 'Ya existe una cuenta con este correo';
  if (codigoAlumno && (await usuarios.buscarPorCodigoAlumno(codigoAlumno))) campos.codigoAlumno = 'Este código ya está registrado';
  if (Object.keys(campos).length) {
    throw new HttpError(409, 'No pudimos crear la cuenta: corrige los campos marcados.', { campos });
  }
}

async function enviarVerificacion(usuario) {
  const { token } = await tokens.emitir('verificacion', usuario.id);
  const ruta = `/verificar/${token}`;
  const envio = await enviarCorreo({
    para: usuario.correo,
    asunto: 'Verifica tu cuenta de Trabajos de Fin de Carrera',
    mensaje: `Hola, ${usuario.nombres.split(' ')[0]}. Para activar tu cuenta usa el botón de abajo. El enlace vence en 24 horas.`,
    enlace: ruta,
    textoEnlace: 'Verificar mi correo',
  });
  return { correoEnviado: envio.enviado, enlaceDemo: enlaceDemo(ruta) };
}

export async function registrarEstudiante(datos) {
  lanzarSiHayErrores(validarRegistroEstudiante(datos), 'No pudimos crear la cuenta: corrige los campos marcados.');
  const correo = datos.correo.trim().toLowerCase();
  const codigoAlumno = datos.codigoAlumno.trim();
  await verificarDuplicados({ correo, codigoAlumno });

  const nuevo = await usuarios.crear({
    rol: 'estudiante',
    estado: 'sin_verificar',
    nombres: limpiar(datos.nombres),
    apellidos: limpiar(datos.apellidos),
    correo,
    passwordHash: await hashPassword(datos.password),
    carrera: datos.carrera,
    ciclo: datos.ciclo,
    codigoAlumno,
  });
  const verificacion = await enviarVerificacion(nuevo);
  return { usuario: usuarios.sinSecretos(nuevo), ...verificacion };
}

export async function registrarAsesor(datos) {
  lanzarSiHayErrores(validarRegistroAsesor(datos), 'No pudimos enviar la solicitud: corrige los campos marcados.');
  const correo = datos.correo.trim().toLowerCase();
  await verificarDuplicados({ correo });

  const nuevo = await usuarios.crear({
    rol: 'asesor',
    estado: 'pendiente_validacion', // la coordinación lo habilita (HU-7)
    nombres: limpiar(datos.nombres),
    apellidos: limpiar(datos.apellidos),
    correo,
    passwordHash: await hashPassword(datos.password),
    gradoAcademico: datos.gradoAcademico,
    departamento: datos.departamento,
  });
  const envio = await enviarCorreo({
    para: correo,
    asunto: 'Recibimos tu solicitud de cuenta de asesor',
    mensaje: `Hola, ${nuevo.nombres.split(' ')[0]}. Tu cuenta quedó pendiente de validación. La coordinación la revisará en un plazo de 2 días hábiles.`,
    enlace: '/',
    textoEnlace: 'Ir a la plataforma',
  });
  return { usuario: usuarios.sinSecretos(nuevo), correoEnviado: envio.enviado };
}

/* ─────────── Coordinador por invitación ─────────── */

export async function consultarInvitacion(codigo) {
  const inv = await invitaciones.buscarPorCodigo(codigo);
  if (!inv) throw new HttpError(404, 'El código de invitación no existe. Revisa que esté escrito completo.');
  const estado = invitaciones.estadoDe(inv);
  if (estado === 'usada') throw new HttpError(409, 'Esta invitación ya se usó para crear una cuenta.');
  if (estado === 'vencida') throw new HttpError(410, 'Esta invitación venció. Pide a la coordinación una nueva.');
  if (estado === 'revocada') throw new HttpError(410, 'Esta invitación fue anulada por la coordinación.');
  return { codigo: inv.codigo, correo: inv.correo, venceEn: inv.venceEn };
}

export async function registrarCoordinador({ codigo, ...datos }) {
  const inv = await consultarInvitacion(codigo);
  lanzarSiHayErrores(validarRegistroCoordinador(datos));
  await verificarDuplicados({ correo: inv.correo });

  const nuevo = await usuarios.crear({
    rol: 'coordinador',
    estado: 'activo',
    nombres: limpiar(datos.nombres),
    apellidos: limpiar(datos.apellidos),
    correo: inv.correo,
    passwordHash: await hashPassword(datos.password),
    cargo: 'Coordinación TFC',
  });
  await invitaciones.marcarUsada(inv.codigo, nuevo.id);
  return { usuario: usuarios.sinSecretos(nuevo) };
}

/* ─────────── Verificación de correo ─────────── */

export async function verificarCorreo(token) {
  const { estado, usuarioId } = await tokens.consultar(token, 'verificacion');
  if (estado === 'inexistente') throw new HttpError(404, 'El enlace de verificación no es válido.');
  if (estado === 'usado') throw new HttpError(409, 'Este enlace ya se usó. Si tu cuenta está verificada, ya puedes ingresar.');
  if (estado === 'vencido') throw new HttpError(410, 'El enlace venció. Solicita uno nuevo desde el inicio de sesión.');
  await tokens.marcarUsado(token);
  const u = await usuarios.actualizar(usuarioId, { estado: 'activo' });
  return usuarios.sinSecretos(u);
}

export async function reenviarVerificacion({ correo }) {
  const u = await usuarios.buscarPorCorreo(correo);
  if (!u) throw new HttpError(404, 'No encontramos la cuenta.');
  if (u.estado !== 'sin_verificar') throw new HttpError(409, 'Tu cuenta ya está verificada.');
  const verificacion = await enviarVerificacion(u);
  return { correo: u.correo, ...verificacion };
}

/* ─────────── Recuperación de contraseña ─────────── */

export async function solicitarRecuperacion({ correo: correoIngresado }) {
  const correo = String(correoIngresado ?? '').trim().toLowerCase();
  const error = validarCorreoInstitucional(correo);
  if (error) throw new HttpError(400, 'Revisa el correo.', { campos: { correo: error } });

  const u = await usuarios.buscarPorCorreo(correo);
  // Por seguridad la respuesta es la misma exista o no la cuenta.
  if (!u || u.estado === 'bloqueado') return { correo, enlaceDemo: null };

  const { token } = await tokens.emitir('recuperacion', u.id);
  const ruta = `/recuperar/${token}`;
  await enviarCorreo({
    para: correo,
    asunto: 'Recupera tu contraseña',
    mensaje: `Hola, ${u.nombres.split(' ')[0]}. Recibimos una solicitud para cambiar tu contraseña. El enlace vence en 60 minutos y solo puede usarse una vez. Si no la pediste, ignora este correo.`,
    enlace: ruta,
    textoEnlace: 'Crear nueva contraseña',
  });
  return { correo, enlaceDemo: enlaceDemo(ruta) };
}

export async function validarEnlaceRecuperacion(token) {
  const { estado, usuarioId } = await tokens.consultar(token, 'recuperacion');
  if (estado === 'inexistente') throw new HttpError(404, 'El enlace no es válido.');
  if (estado === 'usado') throw new HttpError(409, 'Este enlace ya se usó.');
  if (estado === 'vencido') throw new HttpError(410, 'El enlace venció: solo dura 60 minutos.');
  const u = await usuarios.buscarPorId(usuarioId);
  return { correo: u.correo, usuarioId };
}

export async function restablecerPassword(token, { nueva, confirmacion }) {
  const { correo, usuarioId } = await validarEnlaceRecuperacion(token);
  const errores = {};
  const eNueva = validarPassword(nueva);
  const eConf = validarConfirmacion(nueva, confirmacion);
  if (eNueva) errores.nueva = eNueva;
  if (eConf) errores.confirmacion = eConf;
  lanzarSiHayErrores(errores);

  const u = await usuarios.buscarPorId(usuarioId);
  // Recuperar la contraseña también prueba que el correo es suyo.
  await usuarios.actualizar(usuarioId, {
    passwordHash: await hashPassword(nueva),
    estado: u.estado === 'sin_verificar' ? 'activo' : u.estado,
  });
  await tokens.marcarUsado(token);
  await intentos.limpiar(correo);
}
