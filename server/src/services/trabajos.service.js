import * as trabajos from '../repositories/trabajos.repository.js';
import * as usuarios from '../repositories/usuarios.repository.js';
import * as periodos from '../repositories/periodos.repository.js';
import HttpError from '../utils/HttpError.js';
import { limpiar, validarMotivo, validarTrabajo } from '../utils/trabajo.validators.js';
import { ESTADOS, ESTADOS_EDITABLES, LIMITES, TRANSICIONES } from '../config/trabajos.js';

function sinAcentos(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function iniciales(nombres = '', apellidos = '') {
  return `${nombres.trim()[0] ?? ''}${apellidos.trim()[0] ?? ''}`.toUpperCase();
}

function datosIntegrante(usuarioId, u) {
  if (!u) return { usuarioId, nombre: 'Integrante no encontrado', iniciales: '?', codigo: '', carrera: '', ciclo: '' };
  return {
    usuarioId,
    nombres: u.nombres,
    apellidos: u.apellidos,
    nombre: `${u.nombres} ${u.apellidos}`,
    iniciales: iniciales(u.nombres, u.apellidos),
    codigo: u.codigoAlumno ?? '',
    carrera: u.carrera ?? '',
    ciclo: u.ciclo ?? '',
  };
}

function hoyEnLima() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

function calcularAvance(entregables) {
  const hoy = hoyEnLima();
  const pesoTotal = entregables.reduce((s, e) => s + e.peso, 0);
  const aprobados = entregables.filter((e) => e.estado === 'aprobado');
  const pesoAprobado = aprobados.reduce((s, e) => s + e.peso, 0);
  const pendientes = entregables.filter((e) => e.estado !== 'aprobado').sort((a, b) => String(a.fechaLimite).localeCompare(String(b.fechaLimite)));
  const proximo = pendientes.find((e) => String(e.fechaLimite) >= hoy);
  const vencido = pendientes.find((e) => e.estado === 'pendiente' && String(e.fechaLimite) < hoy);
  return {
    porcentaje: pesoTotal ? Math.round((pesoAprobado * 100) / pesoTotal) : 0,
    aprobados: aprobados.length,
    total: entregables.length,
    proximoVencimiento: proximo?.fechaLimite ?? null,
    vencido: vencido ? { nombre: vencido.nombre, fecha: vencido.fechaLimite } : null,
  };
}

async function avancesDe(lista) {
  const ids = lista.filter(Boolean).map((t) => t.id);
  const filas = await trabajos.entregablesDeTrabajos(ids);
  return Object.fromEntries(ids.map((id) => [id, calcularAvance(filas.filter((e) => e.trabajoId === id))]));
}

function armarVista(t, avance) {
  return {
    ...t,
    avance,
    integrantes: t.integrantes.map((i) => ({ ...datosIntegrante(i.usuarioId, i.usuario), responsable: i.responsable })),
  };
}

async function vistas(lista) {
  const avances = await avancesDe(lista);
  return lista.map((t) => armarVista(t, avances[t.id]));
}

async function aVista(t) {
  if (!t) return null;
  return (await vistas([t]))[0];
}

async function resolverLinea(nombre) {
  const linea = await trabajos.buscarLineaPorNombre(nombre);
  if (!linea) {
    throw new HttpError(400, 'La línea de investigación no existe.', { campos: { linea: 'La línea elegida no existe' } });
  }
  return linea.id;
}

function esIntegrante(t, usuarioId) {
  return t.integrantes.some((i) => i.usuarioId === usuarioId);
}

function esResponsable(t, usuarioId) {
  return t.integrantes.some((i) => i.usuarioId === usuarioId && i.responsable);
}

async function obtenerOFallar(trabajoId) {
  const t = await trabajos.buscarPorId(trabajoId);
  if (!t) throw new HttpError(404, 'No encontramos el trabajo. Puede haber sido retirado.');
  return t;
}

function exigirResponsable(t, usuario, accion) {
  if (!esResponsable(t, usuario.id)) throw new HttpError(403, `Solo el responsable del equipo puede ${accion}.`);
}

function exigirEditable(t) {
  if (!ESTADOS_EDITABLES.includes(t.estado)) {
    throw new HttpError(409, `El trabajo está ${ESTADOS[t.estado].toLowerCase()}: la ficha queda en modo lectura.`);
  }
}

function normalizarDatos(datos = {}) {
  return {
    titulo: limpiar(datos.titulo),
    linea: datos.linea,
    resumen: String(datos.resumen ?? '').trim(),
    objetivos: String(datos.objetivos ?? '').trim(),
    palabrasClave: Array.isArray(datos.palabrasClave)
      ? datos.palabrasClave.map((p) => limpiar(p).toLowerCase()).filter(Boolean)
      : datos.palabrasClave,
  };
}

function lanzarSiHayErrores(errores) {
  const n = Object.keys(errores).length;
  if (n > 0) throw new HttpError(400, `Revisa ${n} campo${n === 1 ? '' : 's'} antes de continuar.`, { campos: errores });
}

async function ocupacion(usuarioId, trabajoId, transaction) {
  const otro = await trabajos.buscarVigentePorIntegrante(usuarioId, transaction);
  if (!otro || otro.id === trabajoId) return null;
  return { trabajoId: otro.id, titulo: otro.titulo, estado: otro.estado, desde: otro.registradoEn };
}

export async function obtenerCatalogos() {
  const lineas = await trabajos.listarLineas();
  return { lineas: lineas.map((l) => l.nombre), lineasDetalle: lineas, estados: ESTADOS, transiciones: TRANSICIONES, limites: LIMITES };
}

export async function obtenerMiTrabajo(usuarioId) {
  const propios = await trabajos.listarPorIntegrante(usuarioId);
  const vigente = await trabajos.buscarVigentePorIntegrante(usuarioId);
  const desistido = propios
    .filter((t) => t.estado === 'desistido')
    .sort((a, b) => new Date(b.cerradoEn ?? 0) - new Date(a.cerradoEn ?? 0))[0];
  return { trabajo: await aVista(vigente), ultimoDesistido: desistido ? await aVista(desistido) : null };
}

export async function listarMisTrabajos(usuarioId, estado) {
  if (estado && !ESTADOS[estado]) {
    throw new HttpError(400, 'Estado no válido.', { campos: { estado: `Usa: ${Object.keys(ESTADOS).join(', ')}` } });
  }
  const lista = await trabajos.listarPorIntegrante(usuarioId, { estado: estado || undefined });
  return vistas(lista);
}

export async function resumenTrabajoVigente(usuarioId) {
  const t = await trabajos.buscarVigentePorIntegrante(usuarioId);
  if (!t) return null;
  const { avance } = await aVista(t);
  return { id: t.id, codigo: t.codigo, titulo: t.titulo, estado: t.estado, avance: avance.porcentaje, sinAsesor: !t.asesor };
}

export async function obtenerFicha(trabajoId, usuario) {
  const t = await obtenerOFallar(trabajoId);
  const permitido =
    usuario.rol === 'coordinador' || esIntegrante(t, usuario.id) || (usuario.rol === 'asesor' && t.asesor?.id === usuario.id);
  if (!permitido) throw new HttpError(403, 'No tienes permiso para ver este trabajo.');
  return aVista(t);
}

export async function buscarEstudiantes(texto, trabajoId) {
  const q = sinAcentos(limpiar(texto));
  if (q.length < LIMITES.busquedaMin) {
    throw new HttpError(400, `Escribe al menos ${LIMITES.busquedaMin} caracteres para buscar.`, {
      campos: { q: `Mínimo ${LIMITES.busquedaMin} caracteres` },
    });
  }
  const encontrados = (await usuarios.listar({ rol: 'estudiante' }))
    .filter((u) => u.estado !== 'bloqueado')
    .filter((u) => sinAcentos(`${u.nombres} ${u.apellidos}`).includes(q) || String(u.codigoAlumno ?? '').includes(q))
    .slice(0, 8);

  return Promise.all(
    encontrados.map(async (u) => ({ ...datosIntegrante(u.id, u), ocupadoEn: await ocupacion(u.id, trabajoId) }))
  );
}

export async function registrarTrabajo(usuario, datos) {
  const { linea, ...limpio } = normalizarDatos(datos);
  lanzarSiHayErrores(validarTrabajo({ ...limpio, linea }));
  const lineaId = await resolverLinea(linea);

  const periodo = await periodos.buscarActivo();
  if (!periodo) throw new HttpError(409, 'No hay un periodo activo para registrar trabajos.');

  const id = await trabajos.enTransaccion(async (transaction) => {
    const vigente = await trabajos.buscarVigentePorIntegrante(usuario.id, transaction);
    if (vigente) throw new HttpError(409, 'Ya tienes un trabajo vigente.', { datos: { trabajo: await aVista(vigente) } });

    const ahora = new Date();
    return trabajos.crear(
      {
        ...limpio,
        lineaId,
        codigo: await trabajos.siguienteCodigo(periodo.semestre, transaction),
        carrera: usuario.carrera ?? null,
        estado: 'propuesta',
        asesor: null,
        periodoId: periodo.id,
        fechaRegistro: ahora,
        cerradoEn: null,
        integrantes: [{ usuarioId: usuario.id, responsable: true }],
        historial: [{ de: null, a: 'propuesta', motivo: 'Registro del trabajo', fecha: ahora, usuarioId: usuario.id }],
      },
      transaction
    );
  });
  return aVista(await trabajos.buscarPorId(id));
}

export async function actualizarFicha(usuario, trabajoId, datos) {
  const t = await obtenerOFallar(trabajoId);
  exigirResponsable(t, usuario, 'editar la ficha');
  exigirEditable(t);

  const { linea, ...limpio } = normalizarDatos(datos);
  lanzarSiHayErrores(validarTrabajo({ ...limpio, linea }));
  const lineaId = await resolverLinea(linea);
  if (t.asesor && lineaId !== t.lineaId) {
    throw new HttpError(409, 'La línea de investigación no puede cambiarse con un asesor asignado.', {
      campos: { linea: 'No editable: ya tienes asesor en esta línea' },
    });
  }
  await trabajos.actualizar(t.id, { ...limpio, lineaId });
  return aVista(await trabajos.buscarPorId(t.id));
}

export async function guardarEquipo(usuario, trabajoId, integrantes) {
  const t = await obtenerOFallar(trabajoId);
  exigirResponsable(t, usuario, 'gestionar el equipo');
  exigirEditable(t);

  if (!Array.isArray(integrantes)) throw new HttpError(400, 'Envía la lista de integrantes.');
  const ids = integrantes.map((i) => i?.usuarioId);
  if (ids.length < 1 || ids.length > LIMITES.integrantesMax) {
    throw new HttpError(400, `El equipo debe tener de 1 a ${LIMITES.integrantesMax} integrantes.`);
  }
  if (new Set(ids).size !== ids.length) throw new HttpError(400, 'Hay integrantes repetidos.');
  if (integrantes.filter((i) => i.responsable).length !== 1) {
    throw new HttpError(400, 'El equipo debe tener exactamente un responsable.');
  }
  if (!ids.includes(usuario.id)) {
    throw new HttpError(400, 'No puedes retirarte a ti mismo. Transfiere la responsabilidad y pide que te retiren.');
  }

  await trabajos.enTransaccion(async (transaction) => {
    for (const id of ids) {
      const u = await usuarios.buscarPorId(id);
      if (!u || u.rol !== 'estudiante' || u.estado === 'bloqueado') {
        throw new HttpError(400, 'Uno de los integrantes no es un estudiante habilitado.');
      }
      const ocupado = await ocupacion(id, t.id, transaction);
      if (ocupado) {
        throw new HttpError(409, `${u.nombres} ${u.apellidos} ya participa en otro trabajo vigente.`, {
          datos: { integrante: datosIntegrante(id, u), ocupadoEn: ocupado },
        });
      }
    }
    await trabajos.reemplazarIntegrantes(
      t.id,
      integrantes.map((i) => ({ usuarioId: i.usuarioId, responsable: Boolean(i.responsable) })),
      transaction
    );
  });
  return aVista(await trabajos.buscarPorId(t.id));
}

export async function cambiarEstado(usuario, trabajoId, destino, motivo) {
  const t = await obtenerOFallar(trabajoId);
  exigirResponsable(t, usuario, 'cambiar el estado');

  if (!(TRANSICIONES[t.estado] ?? []).includes(destino)) {
    throw new HttpError(409, `No se puede pasar de ${ESTADOS[t.estado]} a ${ESTADOS[destino] ?? destino}.`);
  }
  const errorMotivo = validarMotivo(motivo);
  if (errorMotivo) throw new HttpError(400, errorMotivo, { campos: { motivo: errorMotivo } });

  if (destino === 'concluido') {
    const { aprobados, total } = (await aVista(t)).avance;
    const pendientes = total - aprobados;
    if (total === 0) throw new HttpError(409, 'El trabajo aún no tiene plan de entregables.');
    if (pendientes > 0) {
      throw new HttpError(409, `Quedan ${pendientes} entregable${pendientes === 1 ? '' : 's'} sin aprobar.`);
    }
  }

  const ahora = new Date();
  await trabajos.enTransaccion(async (transaction) => {
    await trabajos.actualizar(
      t.id,
      {
        estado: destino,
        cerradoEn: ahora,
        ...(destino === 'desistido' && t.asesor ? { asesor: { ...t.asesor, cupoLiberado: true } } : {}),
      },
      transaction
    );
    await trabajos.agregarHistorial(t.id, { de: t.estado, a: destino, motivo: motivo.trim(), fecha: ahora, usuarioId: usuario.id }, transaction);
  });

  const notificados = t.asesor ? `${t.asesor.genero === 'f' ? 'a la asesora' : 'al asesor'} y a la coordinación` : 'a la coordinación';
  return { trabajo: await aVista(await trabajos.buscarPorId(t.id)), notificados };
}

export async function marcarEnDesarrollo(trabajoId, asesor, usuarioId) {
  const t = await obtenerOFallar(trabajoId);
  if (t.estado !== 'propuesta') throw new HttpError(409, 'Solo una propuesta puede pasar a en desarrollo.');
  await trabajos.enTransaccion(async (transaction) => {
    await trabajos.actualizar(t.id, { estado: 'en_desarrollo', asesor }, transaction);
    await trabajos.agregarHistorial(
      t.id,
      { de: 'propuesta', a: 'en_desarrollo', motivo: `Asesoría aceptada por ${asesor?.nombre ?? 'el asesor'}`, fecha: new Date(), usuarioId },
      transaction
    );
  });
  return aVista(await trabajos.buscarPorId(t.id));
}

export async function listarTrabajos(filtros = {}) {
  return vistas(await trabajos.listar(filtros));
}

export async function buscarPorCodigo(codigo) {
  return aVista(await trabajos.buscarPorCodigo(codigo));
}

export async function trabajoVigenteDe(usuarioId) {
  return aVista(await trabajos.buscarVigentePorIntegrante(usuarioId));
}

export async function listarDeAsesor(usuarioId) {
  return vistas(await trabajos.listarDeAsesor(usuarioId));
}