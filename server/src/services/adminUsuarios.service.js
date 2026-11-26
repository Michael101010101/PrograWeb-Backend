import * as usuarios from '../repositories/usuarios.repository.js';
import * as periodos from '../repositories/periodos.repository.js';
import * as adminUsuarios from '../repositories/adminUsuarios.repository.js';
import HttpError from '../utils/HttpError.js';

// HU-7 · Administración de usuarios (coordinación). No conoce Express ni Sequelize.

const ROLES = ['estudiante', 'asesor', 'coordinador'];
const ESTADOS = ['activo', 'sin_verificar', 'pendiente_validacion', 'bloqueado'];

const LIMITE_DEFECTO = 10;
const LIMITE_MAXIMO = 50;
const Q_MAXIMO = 100;
const MOTIVO_MIN = 30;
const MOTIVO_MAX = 400;
const CUPO_MIN = 1;
const CUPO_MAX = 10;
const MOTIVO_VALIDACION = 'Validación de asesor';

const MENSAJE_NO_ACTIVO = {
  bloqueado: 'El usuario ya está bloqueado.',
  sin_verificar: 'Solo se pueden bloquear cuentas activas: este usuario aún no verifica su correo.',
  pendiente_validacion: 'Solo se pueden bloquear cuentas activas: este asesor está pendiente de validación.',
};

/* ─────────── Utilidades ─────────── */

/** Agrega los campos calculados que usa el front y quita secretos. */
function aVista(usuario) {
  const u = usuarios.sinSecretos(usuario);
  if (!u) return null;
  return {
    ...u,
    nombreCompleto: `${u.nombres} ${u.apellidos}`.trim(),
    codigo: u.codigoAlumno ?? null,
    carreraDepartamento: u.rol === 'estudiante' ? (u.carrera ?? null) : (u.departamento ?? u.cargo ?? null),
  };
}

/** Entero positivo opcional de la query: undefined → valor por defecto; inválido → mensaje de error. */
function leerEntero(valor, porDefecto) {
  if (valor === undefined || valor === '') return { valor: porDefecto };
  if (typeof valor !== 'string' || !/^\d+$/.test(valor)) return { error: true };
  return { valor: Number(valor) };
}

async function obtenerExistente(id) {
  const usuario = await usuarios.buscarPorId(id);
  if (!usuario) throw new HttpError(404, 'No existe el usuario.');
  return usuario;
}

/* ─────────── Listado ─────────── */

export async function listar({ rol, estado, q, page, limit } = {}) {
  const campos = {};

  if (rol !== undefined && rol !== '' && !ROLES.includes(rol)) campos.rol = 'Rol no válido.';
  if (estado !== undefined && estado !== '' && !ESTADOS.includes(estado)) campos.estado = 'Estado no válido.';

  let texto = '';
  if (q !== undefined) {
    if (typeof q !== 'string') campos.q = 'La búsqueda no es válida.';
    else {
      texto = q.trim();
      if (texto.length > Q_MAXIMO) campos.q = `La búsqueda admite hasta ${Q_MAXIMO} caracteres.`;
    }
  }

  const pagina = leerEntero(page, 1);
  if (pagina.error || pagina.valor < 1) campos.page = 'La página debe ser un entero mayor o igual a 1.';

  const limite = leerEntero(limit, LIMITE_DEFECTO);
  if (limite.error || limite.valor < 1 || limite.valor > LIMITE_MAXIMO) {
    campos.limit = `El límite debe ser un entero de 1 a ${LIMITE_MAXIMO}.`;
  }

  if (Object.keys(campos).length) throw new HttpError(400, 'Revisa los filtros del listado.', { campos });

  const { filas, total } = await adminUsuarios.listarPaginado({
    rol: rol || undefined,
    estado: estado || undefined,
    q: texto || undefined,
    limite: limite.valor,
    desplazamiento: (pagina.valor - 1) * limite.valor,
  });

  return {
    usuarios: filas.map(aVista),
    paginacion: {
      pagina: pagina.valor,
      limite: limite.valor,
      total,
      totalPaginas: Math.ceil(total / limite.valor),
    },
  };
}

/* ─────────── Bloquear / desbloquear ─────────── */

export async function bloquear(id, { motivo } = {}, coordinadorId) {
  if (id === coordinadorId) throw new HttpError(403, 'No puedes bloquear tu propia cuenta.');

  const texto = typeof motivo === 'string' ? motivo.trim() : '';
  let error = null;
  if (!texto) error = 'Indica el motivo del bloqueo.';
  else if (texto.length < MOTIVO_MIN) error = `Escribe al menos ${MOTIVO_MIN} caracteres (llevas ${texto.length}).`;
  else if (texto.length > MOTIVO_MAX) error = `El motivo admite hasta ${MOTIVO_MAX} caracteres.`;
  if (error) throw new HttpError(400, 'Corrige el motivo del bloqueo.', { campos: { motivo: error } });

  const usuario = await obtenerExistente(id);
  if (usuario.estado !== 'activo') {
    throw new HttpError(409, MENSAJE_NO_ACTIVO[usuario.estado] ?? 'Solo se pueden bloquear cuentas activas.', {
      datos: { estado: usuario.estado },
    });
  }

  return aVista(await usuarios.actualizar(id, { estado: 'bloqueado', motivoBloqueo: texto }));
}

export async function desbloquear(id) {
  const usuario = await obtenerExistente(id);
  if (usuario.estado !== 'bloqueado') {
    throw new HttpError(409, 'Solo se puede desbloquear una cuenta bloqueada.', { datos: { estado: usuario.estado } });
  }
  return aVista(await usuarios.actualizar(id, { estado: 'activo', motivoBloqueo: null }));
}

/* ─────────── Validar asesor ─────────── */

export async function validarAsesor(id, { cupoMaximo } = {}, coordinadorId) {
  if (!Number.isInteger(cupoMaximo) || cupoMaximo < CUPO_MIN || cupoMaximo > CUPO_MAX) {
    throw new HttpError(400, 'Corrige el cupo del asesor.', {
      campos: { cupoMaximo: `Ingresa un número entero de ${CUPO_MIN} a ${CUPO_MAX}.` },
    });
  }

  const usuario = await obtenerExistente(id);
  if (usuario.rol !== 'asesor') {
    throw new HttpError(409, 'Solo se validan cuentas de asesor.', { datos: { rol: usuario.rol } });
  }
  if (usuario.estado !== 'pendiente_validacion') {
    throw new HttpError(409, 'El asesor no está pendiente de validación.', { datos: { estado: usuario.estado } });
  }

  const periodo = await periodos.buscarActivo();
  if (!periodo) throw new HttpError(409, 'No hay un periodo activo para registrar el cupo.');

  const resultado = await adminUsuarios.validarAsesorConCupo({
    asesorId: id,
    periodoId: periodo.id,
    cupoMaximo,
    modificadoPor: coordinadorId,
    motivo: MOTIVO_VALIDACION,
  });
  if (!resultado) throw new HttpError(409, 'El asesor no está pendiente de validación.');

  return { usuario: aVista(resultado.usuario), cupo: resultado.cupo };
}
