import db from '../db/models/index.cjs';
import * as trabajos from './trabajos.repository.js'; // HU-2

// Patrón Repository de la HU-4: el único lugar que lee y escribe las tablas
// entregables, avances, ampliaciones y requisitos. El servicio no conoce Sequelize.
// El trabajo (estado, integrantes y asesor) se LEE con el repositorio de la HU-2.

const { Entregable, Avance, Ampliacion, Requisito, Periodo, Usuario, Asesor, sequelize } = db;
const { Op } = db.Sequelize;

const plano = (instancia) => instancia.get({ plain: true });

/**
 * Avance como lo usa el front:
 *  fecha = fechaEntrega, estado = resultado o 'en_revision' si aún no se revisó,
 *  y la revisión del asesor agrupada en `revision`.
 */
function aAvance(a) {
  return {
    id: a.id,
    entregableId: a.entregableId,
    version: a.version,
    fecha: a.fechaEntrega,
    diasRetraso: a.diasRetraso,
    estado: a.resultado ?? 'en_revision',
    enlace: a.enlace,
    descripcion: a.descripcion,
    revision: a.fechaRevision
      ? { fecha: a.fechaRevision, comentario: a.comentario ?? '', revisor: a.revisor ? `${a.revisor.nombres} ${a.revisor.apellidos}` : '' }
      : null,
  };
}

// ─────────── Trabajo (HU-2 y HU-3) ───────────

/**
 * Lo que la HU-4 necesita del trabajo de la HU-2, con la forma que usan el servicio y el front:
 * { id, codigo, titulo, linea, estado, integrantes: ['u-001', …], asesor: { usuarioId, nombre, correo, trato } }
 * El asesor viene de la HU-3 (tabla asesores, enlazada por trabajos.asesorId).
 */
async function aTrabajo(t) {
  if (!t) return null;
  let asesor = null;
  if (t.asesorId) {
    const fila = await Asesor.findByPk(t.asesorId, { attributes: ['usuarioId', 'titulo', 'correo'] });
    if (fila) {
      const femenino = t.asesor?.genero ? t.asesor.genero === 'f' : fila.titulo.startsWith('Dra');
      asesor = { usuarioId: fila.usuarioId, nombre: t.asesor?.nombre, correo: fila.correo, trato: femenino ? 'tu asesora' : 'tu asesor' };
    }
  }
  return {
    id: t.id,
    codigo: t.codigo,
    titulo: t.titulo,
    linea: t.linea,
    estado: t.estado,
    integrantes: t.integrantes.map((i) => i.usuarioId),
    asesor,
  };
}

// ─────────── Lectura ───────────

/**
 * Todos los datos del plan de UN trabajo en un solo objeto:
 * { trabajo, entregables, avances, ampliaciones, requisitos }. Devuelve null si el trabajo no existe.
 */
export async function cargarPlan(trabajoId) {
  const trabajo = await aTrabajo(await trabajos.buscarPorId(trabajoId));
  if (!trabajo) return null;

  const entregables = (await Entregable.findAll({ where: { trabajoId }, order: [['orden', 'ASC']] })).map(plano);
  const ids = entregables.map((e) => e.id);

  const avances = await Avance.findAll({
    where: { entregableId: ids },
    include: [{ model: Usuario, as: 'revisor', attributes: ['nombres', 'apellidos'] }],
    order: [['version', 'ASC']],
  });
  const ampliaciones = await Ampliacion.findAll({ where: { entregableId: ids }, order: [['fecha', 'ASC']] });

  // Requisitos administrativos del periodo activo (HU-1).
  const periodo = await Periodo.findOne({ where: { activo: true } });
  const requisitos = periodo ? await Requisito.findAll({ where: { periodoId: periodo.id }, order: [['fechaLimite', 'ASC']] }) : [];

  return {
    trabajo,
    entregables,
    avances: avances.map((a) => aAvance(plano(a))),
    ampliaciones: ampliaciones.map(plano),
    requisitos: requisitos.map(plano),
  };
}

export async function buscarEntregable(id) {
  const entregable = await Entregable.findByPk(String(id));
  return entregable ? plano(entregable) : null;
}

/** Id del trabajo vigente del estudiante (HU-2), o null. */
export async function trabajoIdDeEstudiante(usuarioId) {
  return (await trabajos.buscarDeEstudiante(usuarioId))?.id ?? null;
}

/** Trabajos que asesora el usuario: su ficha de asesor (HU-3) → sus trabajos (HU-2). */
export async function trabajosDeAsesor(usuarioId) {
  const ficha = await Asesor.findOne({ where: { usuarioId }, attributes: ['id'] });
  if (!ficha) return [];
  return Promise.all((await trabajos.listarDeAsesor(ficha.id)).map(aTrabajo));
}

// ─────────── Escritura ───────────

/** Guarda la nueva versión y actualiza el estado del entregable, en una TRANSACCIÓN. */
export async function crearAvance({ entregableId, version, fecha, diasRetraso, enlace, descripcion }, estadoEntregable) {
  await sequelize.transaction(async (transaction) => {
    await Avance.create({ entregableId, version, fechaEntrega: fecha, diasRetraso, enlace, descripcion }, { transaction });
    await Entregable.update({ estado: estadoEntregable }, { where: { id: entregableId }, transaction });
  });
}

export async function actualizarEstado(entregableId, estado) {
  await Entregable.update({ estado }, { where: { id: entregableId } });
}

export async function crearAmpliacion(datos) {
  return plano(await Ampliacion.create(datos));
}

export async function crearEntregable(datos) {
  return plano(await Entregable.create(datos));
}

/** Crea varios entregables a la vez (plantilla del ciclo). */
export async function crearEntregables(lista) {
  return (await Entregable.bulkCreate(lista)).map(plano);
}

export async function actualizarEntregable(id, cambios) {
  await Entregable.update(cambios, { where: { id } });
}

/**
 * Elimina el entregable y vuelve a numerar el resto del plan (1, 2, 3…).
 * Se hace en una TRANSACCIÓN: o se guardan los dos cambios o ninguno.
 */
export async function eliminarEntregable(entregable) {
  await sequelize.transaction(async (transaction) => {
    await Entregable.destroy({ where: { id: entregable.id }, transaction });
    await Entregable.decrement('orden', {
      by: 1,
      where: { trabajoId: entregable.trabajoId, orden: { [Op.gt]: entregable.orden } },
      transaction,
    });
  });
}

/** Acepta o rechaza la solicitud; si se acepta, el entregable toma la nueva fecha límite (en una transacción). */
export async function responderAmpliacion(solicitud, aceptar) {
  await sequelize.transaction(async (transaction) => {
    await Ampliacion.update(
      { estado: aceptar ? 'aceptada' : 'rechazada', respondidaEn: new Date() },
      { where: { id: solicitud.id }, transaction }
    );
    if (aceptar) {
      await Entregable.update({ fechaLimite: solicitud.nuevaFecha }, { where: { id: solicitud.entregableId }, transaction });
    }
  });
}
