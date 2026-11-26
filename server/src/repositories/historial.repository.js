import db from '../db/models/index.cjs';

// Patrón Repository sobre el modelo HistorialAsesoria (asesorías terminadas, HU-3).

const { HistorialAsesoria } = db;

function aObjeto(instancia) {
  if (!instancia) return null;
  // eslint-disable-next-line no-unused-vars
  const { creadoEn, ...datos } = instancia.get({ plain: true });
  return datos;
}

export async function registrar(datos, opciones = {}) {
  return aObjeto(await HistorialAsesoria.create(datos, opciones));
}

/** Último término de asesoría de un trabajo (o null). */
export async function ultimoDeTrabajo(trabajoCodigo) {
  return aObjeto(await HistorialAsesoria.findOne({ where: { trabajoCodigo }, order: [['id', 'DESC']] }));
}
