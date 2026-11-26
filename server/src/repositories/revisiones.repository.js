import db from '../db/models/index.cjs';

// HU-5 · Repositorio de la revisión de avances. Solo toca lo propio de la HU-5:
//  - escribe la revisión en la tabla avances (HU-4): fechaRevision, resultado, comentario, revisorId;
//  - lee y escribe la conversación en comentarios_avance.
// Los trabajos, entregables y avances se LEEN con el repositorio de la HU-4 (entregables.repository.js).

const { Avance, ComentarioAvance, Usuario, sequelize } = db;

const plano = (instancia) => instancia.get({ plain: true });

export async function buscarAvance(id) {
  const avance = await Avance.findByPk(String(id));
  return avance ? plano(avance) : null;
}

/** Guarda la revisión del asesor sobre una versión (en una transacción, con la conversación si la hay). */
export async function guardarRevision(avanceId, { resultado, comentario, revisorId, fechaRevision }) {
  await sequelize.transaction(async (transaction) => {
    await Avance.update(
      { resultado, comentario: comentario || null, revisorId, fechaRevision },
      { where: { id: avanceId, resultado: null }, transaction } // solo si sigue en revisión
    );
  });
}

/** Comentarios de un avance, del más antiguo al más nuevo, con el nombre del autor. */
export async function comentariosDe(avanceId) {
  const filas = await ComentarioAvance.findAll({
    where: { avanceId },
    include: [{ model: Usuario, as: 'autor', attributes: ['nombres', 'apellidos'] }],
    order: [['creadoEn', 'ASC']],
  });
  return filas.map((f) => {
    const c = plano(f);
    return {
      id: c.id,
      avanceId: c.avanceId,
      autorId: c.autorId,
      autor: c.autor ? `${c.autor.nombres} ${c.autor.apellidos}` : '',
      rol: c.rol,
      texto: c.texto,
      respuestaAId: c.respuestaAId ?? null,
      fecha: c.creadoEn,
    };
  });
}

/** Comentarios de varios avances a la vez: { avanceId: [comentarios] }. */
export async function comentariosDeVarios(avanceIds) {
  const porAvance = Object.fromEntries(avanceIds.map((id) => [id, []]));
  if (!avanceIds.length) return porAvance;
  const filas = await ComentarioAvance.findAll({
    where: { avanceId: avanceIds },
    include: [{ model: Usuario, as: 'autor', attributes: ['nombres', 'apellidos'] }],
    order: [['creadoEn', 'ASC']],
  });
  for (const f of filas) {
    const c = plano(f);
    porAvance[c.avanceId].push({
      id: c.id,
      autorId: c.autorId,
      autor: c.autor ? `${c.autor.nombres} ${c.autor.apellidos}` : '',
      rol: c.rol,
      texto: c.texto,
      respuestaA: c.respuestaAId ?? undefined, // el front lo llama respuestaA
      fecha: c.creadoEn,
    });
  }
  return porAvance;
}

export async function buscarComentario(id) {
  const fila = await ComentarioAvance.findByPk(String(id));
  return fila ? plano(fila) : null;
}

export async function crearComentario({ avanceId, autorId, rol, texto, respuestaAId }) {
  return plano(await ComentarioAvance.create({ avanceId, autorId, rol, texto, respuestaAId: respuestaAId ?? null }));
}
