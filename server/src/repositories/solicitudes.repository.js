import db from '../db/models/index.cjs';

// Patrón Repository sobre el modelo Solicitud (HU-3).
// Cada solicitud se devuelve con los datos de su trabajo (relación belongsTo → include).

const { Solicitud, Trabajo, LineaInvestigacion } = db;

const CON_TRABAJO = {
  include: [
    {
      model: Trabajo,
      as: 'trabajo',
      attributes: ['codigo', 'titulo'],
      include: [{ model: LineaInvestigacion, as: 'lineaInvestigacion', attributes: ['nombre'] }],
    },
  ],
};

/** Forma que usa el front: { id, asesorId, estado, fecha, trabajo: { codigo, titulo, linea, equipo }, mensaje, … } */
function aObjeto(instancia) {
  if (!instancia) return null;
  const s = instancia.get({ plain: true });
  return {
    id: s.id,
    asesorId: s.asesorId,
    estado: s.estado,
    fecha: s.fecha,
    trabajo: {
      codigo: s.trabajoCodigo,
      titulo: s.trabajo?.titulo ?? '',
      linea: s.trabajo?.lineaInvestigacion?.nombre ?? '',
      equipo: s.equipo,
    },
    mensaje: s.mensaje,
    motivo: s.motivo,
    resueltaEl: s.resueltaEl,
  };
}

export async function crear(datos, opciones = {}) {
  const nueva = await Solicitud.create(datos, opciones);
  return buscarPorId(nueva.id, opciones);
}

export async function buscarPorId(id, opciones = {}) {
  return aObjeto(await Solicitud.findByPk(id, { ...CON_TRABAJO, ...opciones }));
}

/** La única solicitud pendiente de un trabajo (o null). */
export async function buscarPendienteDeTrabajo(trabajoCodigo) {
  return aObjeto(await Solicitud.findOne({ where: { trabajoCodigo, estado: 'pendiente' }, ...CON_TRABAJO }));
}

/** Última solicitud que envió el equipo de un trabajo (para mostrarle su estado). */
export async function ultimaDeTrabajo(trabajoCodigo) {
  return aObjeto(await Solicitud.findOne({ where: { trabajoCodigo }, order: [['creadoEn', 'DESC']], ...CON_TRABAJO }));
}

/** Solicitudes que recibió un asesor (opcionalmente solo un estado), de la más nueva a la más antigua. */
export async function listarDeAsesor(asesorId, estado) {
  const where = { asesorId };
  if (estado) where.estado = estado;
  const filas = await Solicitud.findAll({ where, order: [['creadoEn', 'DESC']], ...CON_TRABAJO });
  return filas.map(aObjeto);
}

export async function contarPendientesDeAsesor(asesorId) {
  return Solicitud.count({ where: { asesorId, estado: 'pendiente' } });
}

export async function actualizar(id, cambios, opciones = {}) {
  const solicitud = await Solicitud.findByPk(id, opciones);
  if (!solicitud) return null;
  await solicitud.update(cambios, opciones);
  return buscarPorId(id, opciones);
}
