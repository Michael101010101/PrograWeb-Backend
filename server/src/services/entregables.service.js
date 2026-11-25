import * as repo from '../repositories/entregables.repository.js';
import * as periodos from '../repositories/periodos.repository.js';
import HttpError from '../utils/HttpError.js';

// Servicio de la HU-4 · Plan de entregables.
// Son las MISMAS reglas que tenía el front (client/src/hu4-entregables/services), ahora en el servidor:
//  - el estado de cada entregable se CALCULA desde su última versión (no se guarda);
//  - el avance del trabajo = suma de pesos de los entregables obligatorios aprobados;
//  - un entregable se habilita cuando el anterior está aprobado;
//  - el servidor vuelve a validar todo: no confía en lo que manda el navegador.
// Los errores se lanzan como HttpError y el middleware los convierte en { mensaje }.

export const PESO_MIN = 5;
export const PESO_MAX = 40;
export const DIAS_ALERTA = 14; // "Próximos a vencer · siguientes 14 días"

// Plantilla que la coordinación propone para el ciclo ("Usar plantilla del ciclo" en la 4.2). Los pesos suman 100.
const PLANTILLA_CICLO = [
  { nombre: 'Plan de investigación', peso: 15, descripcion: 'Problema, objetivos, justificación y cronograma del trabajo.' },
  { nombre: 'Marco teórico', peso: 20, descripcion: 'Antecedentes y bases teóricas con al menos 15 fuentes revisadas.' },
  { nombre: 'Diseño metodológico', peso: 20, descripcion: 'Tipo de investigación, población, muestra, instrumentos y plan de análisis.' },
  { nombre: 'Resultados preliminares', peso: 20, descripcion: 'Primeros resultados con su análisis e interpretación.' },
  { nombre: 'Informe final', peso: 25, descripcion: 'Documento completo listo para la revisión del jurado.' },
];

/** Fecha de hoy en Lima, como texto 'AAAA-MM-DD' (igual que el servicio de periodo de la HU-1). */
function hoyEnLima() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

/** Días desde `desde` hasta `hasta`. Negativo si `hasta` ya pasó. */
function diasEntre(desde, hasta) {
  const unDia = 24 * 60 * 60 * 1000;
  return Math.round((new Date(hasta) - new Date(desde)) / unDia);
}

/** Rango del semestre activo, tomado del cronograma de la HU-1 (primera y última etapa). */
async function semestreActivo() {
  const periodo = await periodos.buscarActivo();
  if (!periodo) throw new HttpError(404, 'No hay un periodo activo configurado.');
  return { nombre: periodo.semestre, inicio: periodo.etapas[0].inicio, fin: periodo.etapas.at(-1).fin };
}

// ─────────── Reglas (funciones puras sobre los datos de UN trabajo) ───────────
// `datos` = { trabajo, entregables, avances, ampliaciones, requisitos } (ver el repositorio).

function avancesDe(datos, entregableId) {
  return datos.avances.filter((a) => a.entregableId === entregableId).sort((a, b) => a.version - b.version);
}

/**
 * Estado que se muestra del entregable, calculado desde su último avance:
 *  sin avances          -> 'vencido' si ya pasó la fecha límite, si no 'pendiente'
 *  en revisión          -> 'con_retraso' si se entregó tarde, si no 'entregado'
 *  observado / aprobado -> el mismo estado de la revisión
 */
function estadoEntregable(datos, entregable, hoy) {
  const ultimo = avancesDe(datos, entregable.id).at(-1);
  if (!ultimo) return entregable.fechaLimite < hoy ? 'vencido' : 'pendiente';
  if (ultimo.estado === 'en_revision') return ultimo.diasRetraso > 0 ? 'con_retraso' : 'entregado';
  return ultimo.estado;
}

function estaBloqueado(datos, entregable, hoy) {
  const anterior = datos.entregables.find((e) => e.orden === entregable.orden - 1);
  return Boolean(anterior) && estadoEntregable(datos, anterior, hoy) !== 'aprobado';
}

/** Solo los obligatorios cuentan para la suma de pesos y para el avance. */
function sumaPesos(entregables, excluirId = null) {
  return entregables.filter((e) => e.obligatorio && e.id !== excluirId).reduce((suma, e) => suma + e.peso, 0);
}

/** Cada entregable con su estado, versiones, si está bloqueado y si se puede registrar avance. */
function detallar(datos, hoy) {
  return datos.entregables.map((e) => {
    const estado = estadoEntregable(datos, e, hoy);
    const avances = avancesDe(datos, e.id);
    const bloqueado = estaBloqueado(datos, e, hoy);
    return {
      ...e,
      estado,
      avances,
      bloqueado,
      diasParaVencer: diasEntre(hoy, e.fechaLimite),
      ampliacionPendiente: datos.ampliaciones.find((a) => a.entregableId === e.id && a.estado === 'pendiente') ?? null,
      puedeRegistrar:
        datos.trabajo.estado === 'en_desarrollo' && !bloqueado && estado !== 'aprobado' && avances.at(-1)?.estado !== 'en_revision',
    };
  });
}

function alertas(datos, items, hoy) {
  const aprobados = items.filter((e) => e.estado === 'aprobado');
  if (datos.trabajo.estado === 'concluido') return { vencidos: [], proximos: [], aprobados, pendientes: [] };
  const enRango = (dias) => dias >= 0 && dias <= DIAS_ALERTA;
  const proximos = [
    ...items
      .filter((e) => ['pendiente', 'observado'].includes(e.estado) && enRango(e.diasParaVencer))
      .map((e) => ({ ...e, tipo: 'entregable' })),
    ...datos.requisitos
      .map((r) => ({ ...r, tipo: 'requisito', diasParaVencer: diasEntre(hoy, r.fechaLimite) }))
      .filter((r) => enRango(r.diasParaVencer)),
  ].sort((a, b) => a.diasParaVencer - b.diasParaVencer);
  return {
    vencidos: items.filter((e) => e.estado === 'vencido'),
    proximos,
    aprobados,
    pendientes: items.filter((e) => !['aprobado', 'vencido'].includes(e.estado)),
  };
}

function ultimaRetroalimentacion(datos) {
  const revisado = datos.avances
    .filter((a) => a.revision?.comentario)
    .sort((a, b) => b.revision.fecha.localeCompare(a.revision.fecha))[0];
  if (!revisado) return null;
  return { ...revisado, entregable: datos.entregables.find((e) => e.id === revisado.entregableId) };
}

/** Lo que recibe el front: todo lo que necesitan las pantallas 4.1, 4.2 y 4.4 en una sola respuesta. */
function vista(datos, hoy) {
  const items = detallar(datos, hoy);
  const aprobados = items.filter((e) => e.obligatorio && e.estado === 'aprobado');
  return {
    hoy,
    trabajo: datos.trabajo,
    items,
    suma: sumaPesos(items),
    avance: { porcentaje: sumaPesos(aprobados), aprobados },
    alertas: alertas(datos, items, hoy),
    ultimaRetroalimentacion: ultimaRetroalimentacion(datos),
    ampliacionesPendientes: datos.ampliaciones
      .filter((a) => a.estado === 'pendiente')
      .map((a) => ({ ...a, entregable: datos.entregables.find((e) => e.id === a.entregableId) })),
  };
}

// ─────────── Carga y permisos ───────────

async function cargarComoEstudiante(usuario, entregableId) {
  const entregable = await repo.buscarEntregable(entregableId);
  if (!entregable) throw new HttpError(404, 'El entregable no existe.');
  const datos = await repo.cargarPlan(entregable.trabajoCodigo);
  if (!datos?.trabajo.integrantes.includes(usuario.id)) throw new HttpError(403, 'Este entregable no es de tu trabajo.');
  return { datos, entregable };
}

async function cargarComoAsesor(usuario, codigo) {
  const datos = await repo.cargarPlan(codigo);
  // Si no es su asesorado se responde 404 (no se revela que el trabajo existe).
  if (!datos || datos.trabajo.asesor?.usuarioId !== usuario.id) throw new HttpError(404, 'Trabajo no encontrado.');
  return datos;
}

function exigirEnDesarrollo(datos) {
  if (datos.trabajo.estado === 'concluido') throw new HttpError(409, 'El trabajo está concluido: el plan queda en modo lectura.');
}

const esEnlaceValido = (texto) => {
  try {
    return ['http:', 'https:'].includes(new URL(texto).protocol);
  } catch {
    return false;
  }
};

const texto = (valor) => String(valor ?? '').trim();

// ─────────── Estudiante ───────────

/** GET /api/entregables/mi-plan */
export async function planDelEstudiante(usuario) {
  const codigo = await repo.codigoTrabajoDeEstudiante(usuario.id);
  if (!codigo) return { trabajo: null };
  return vista(await repo.cargarPlan(codigo), hoyEnLima());
}

/** POST /api/entregables/:id/avances */
export async function registrarAvance(usuario, entregableId, body) {
  const hoy = hoyEnLima();
  const { datos, entregable } = await cargarComoEstudiante(usuario, entregableId);
  const item = detallar(datos, hoy).find((e) => e.id === entregable.id);

  if (item.bloqueado) throw new HttpError(409, 'Este entregable se habilita cuando se apruebe el anterior.');
  if (item.estado === 'aprobado') throw new HttpError(409, 'Este entregable ya está aprobado.');
  if (!item.puedeRegistrar) throw new HttpError(409, 'Ya tienes una versión esperando revisión de tu asesor.');
  const enlace = texto(body.enlace);
  const descripcion = texto(body.descripcion);
  if (!esEnlaceValido(enlace)) throw new HttpError(400, 'Ingresa un enlace válido que empiece con http:// o https://');
  if (descripcion.length < 10) throw new HttpError(400, 'Describe lo entregado en al menos 10 caracteres.');
  if (descripcion.length > 600) throw new HttpError(400, 'La descripción no puede superar los 600 caracteres.');

  await repo.crearAvance({
    entregableId: entregable.id,
    version: item.avances.length + 1, // la versión se calcula sola
    fecha: hoy,
    diasRetraso: Math.max(0, diasEntre(entregable.fechaLimite, hoy)),
    estado: 'en_revision',
    enlace,
    descripcion,
  });
  return vista(await repo.cargarPlan(datos.trabajo.codigo), hoy);
}

/** POST /api/entregables/:id/ampliaciones */
export async function solicitarAmpliacion(usuario, entregableId, body) {
  const hoy = hoyEnLima();
  const { datos, entregable } = await cargarComoEstudiante(usuario, entregableId);
  const semestre = await semestreActivo();
  const nuevaFecha = texto(body.nuevaFecha);
  const motivo = texto(body.motivo);

  if (datos.ampliaciones.some((a) => a.entregableId === entregable.id && a.estado === 'pendiente')) {
    throw new HttpError(409, 'Ya enviaste una solicitud de ampliación para este entregable.');
  }
  if (!nuevaFecha) throw new HttpError(400, 'Elige la nueva fecha que propones.');
  if (nuevaFecha <= hoy || nuevaFecha <= entregable.fechaLimite) {
    throw new HttpError(400, 'La nueva fecha debe ser posterior a hoy y a la fecha límite actual.');
  }
  if (nuevaFecha < semestre.inicio || nuevaFecha > semestre.fin) {
    throw new HttpError(400, `La fecha debe caer dentro del semestre ${semestre.nombre}.`);
  }
  if (motivo.length < 20) throw new HttpError(400, 'Explica el motivo en al menos 20 caracteres.');
  if (motivo.length > 400) throw new HttpError(400, 'El motivo no puede superar los 400 caracteres.');

  await repo.crearAmpliacion({ entregableId: entregable.id, nuevaFecha, motivo, fecha: hoy, estado: 'pendiente' });
  return vista(await repo.cargarPlan(datos.trabajo.codigo), hoy);
}

// ─────────── Asesor ───────────

/** GET /api/planes · trabajos que asesora, con el avance y la suma de pesos de cada plan. */
export async function planesDelAsesor(usuario) {
  const hoy = hoyEnLima();
  const lista = await repo.trabajosDeAsesor(usuario.id);
  return Promise.all(
    lista.map(async (t) => {
      const v = vista(await repo.cargarPlan(t.codigo), hoy);
      return { trabajo: v.trabajo, entregables: v.items.length, suma: v.suma, avance: v.avance.porcentaje, ampliacionesPendientes: v.ampliacionesPendientes.length };
    })
  );
}

/** GET /api/planes/:codigo */
export async function planDelAsesor(usuario, codigo) {
  return vista(await cargarComoAsesor(usuario, codigo), hoyEnLima());
}

/** POST /api/planes/:codigo/entregables  y  PUT /api/planes/:codigo/entregables/:id */
export async function guardarEntregable(usuario, codigo, body, entregableId = null) {
  const hoy = hoyEnLima();
  const datos = await cargarComoAsesor(usuario, codigo);
  exigirEnDesarrollo(datos);
  const semestre = await semestreActivo();

  const id = entregableId === null ? null : Number(entregableId);
  const anterior = id === null ? null : datos.entregables.find((e) => e.id === id);
  if (id !== null && !anterior) throw new HttpError(404, 'El entregable no existe.');
  if (anterior && estadoEntregable(datos, anterior, hoy) === 'aprobado') {
    throw new HttpError(409, 'Los entregables aprobados no pueden editarse.');
  }

  const nombre = texto(body.nombre);
  const descripcion = texto(body.descripcion);
  const fechaLimite = texto(body.fechaLimite);
  const peso = Number(body.peso);
  const obligatorio = Boolean(body.obligatorio);

  if (nombre.length < 3) throw new HttpError(400, 'El nombre debe tener al menos 3 caracteres.');
  if (datos.entregables.some((e) => e.id !== id && e.nombre.toLowerCase() === nombre.toLowerCase())) {
    throw new HttpError(409, 'Ya existe un entregable con ese nombre en el plan.');
  }
  if (descripcion.length > 400) throw new HttpError(400, 'La descripción no puede superar los 400 caracteres.');
  if (!fechaLimite) throw new HttpError(400, 'Elige la fecha límite.');
  if (fechaLimite < semestre.inicio || fechaLimite > semestre.fin) {
    throw new HttpError(400, `La fecha límite debe caer dentro del semestre ${semestre.nombre}.`);
  }
  if (!Number.isInteger(peso) || peso < PESO_MIN || peso > PESO_MAX) {
    throw new HttpError(400, `El peso debe ser un número entero entre ${PESO_MIN} y ${PESO_MAX}.`);
  }
  const suma = sumaPesos(datos.entregables, id) + (obligatorio ? peso : 0);
  if (suma > 100) throw new HttpError(409, `Con este peso el plan suma ${suma}. Excede en ${suma - 100} puntos.`);

  const campos = { nombre, descripcion, fechaLimite, peso, obligatorio };
  if (anterior) await repo.actualizarEntregable(id, campos);
  else await repo.crearEntregable({ ...campos, trabajoCodigo: codigo, orden: datos.entregables.length + 1 });

  return vista(await repo.cargarPlan(codigo), hoy);
}

/** DELETE /api/planes/:codigo/entregables/:id */
export async function eliminarEntregable(usuario, codigo, entregableId) {
  const datos = await cargarComoAsesor(usuario, codigo);
  exigirEnDesarrollo(datos);
  const entregable = datos.entregables.find((e) => e.id === Number(entregableId));
  if (!entregable) throw new HttpError(404, 'El entregable no existe.');
  if (avancesDe(datos, entregable.id).length > 0) {
    throw new HttpError(409, 'No se puede eliminar: el equipo ya registró avances en este entregable.');
  }
  await repo.eliminarEntregable(entregable); // también renumera el resto del plan
  return vista(await repo.cargarPlan(codigo), hoyEnLima());
}

/** POST /api/planes/:codigo/plantilla */
export async function aplicarPlantilla(usuario, codigo) {
  const datos = await cargarComoAsesor(usuario, codigo);
  exigirEnDesarrollo(datos);
  if (datos.entregables.length > 0) throw new HttpError(409, 'La plantilla solo puede usarse cuando el plan está vacío.');

  // Las 5 fechas límite se reparten en partes iguales entre hoy y el fin del semestre.
  const hoy = hoyEnLima();
  const semestre = await semestreActivo();
  const restantes = diasEntre(hoy, semestre.fin);
  if (restantes < PLANTILLA_CICLO.length) throw new HttpError(409, 'Ya no queda tiempo en el semestre para aplicar la plantilla.');
  const fechaEn = (n) => {
    const fecha = new Date(`${hoy}T12:00:00`);
    fecha.setDate(fecha.getDate() + n);
    return fecha.toISOString().slice(0, 10);
  };

  await repo.crearEntregables(
    PLANTILLA_CICLO.map((p, indice) => ({
      ...p,
      trabajoCodigo: codigo,
      orden: indice + 1,
      obligatorio: true,
      fechaLimite: fechaEn(Math.round(((indice + 1) * restantes) / PLANTILLA_CICLO.length)),
    }))
  );
  return vista(await repo.cargarPlan(codigo), hoy);
}

/** PATCH /api/planes/:codigo/ampliaciones/:id   body: { aceptar: true | false } */
export async function responderAmpliacion(usuario, codigo, ampliacionId, body) {
  const datos = await cargarComoAsesor(usuario, codigo);
  const solicitud = datos.ampliaciones.find((a) => a.id === Number(ampliacionId));
  if (!solicitud) throw new HttpError(404, 'La solicitud no existe.');
  if (solicitud.estado !== 'pendiente') throw new HttpError(409, 'La solicitud ya fue respondida.');
  if (typeof body.aceptar !== 'boolean') throw new HttpError(400, 'Indica si aceptas o rechazas la solicitud.');
  await repo.responderAmpliacion(solicitud, body.aceptar); // si se acepta, cambia la fecha límite
  return vista(await repo.cargarPlan(codigo), hoyEnLima());
}
