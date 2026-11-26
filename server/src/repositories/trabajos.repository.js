import { Op } from 'sequelize';
import db from '../db/models/index.cjs';

// Patrón Repository sobre el modelo Trabajo (vista mínima que usa la HU-3).

const { Trabajo } = db;

function aObjeto(instancia) {
  if (!instancia) return null;
  // eslint-disable-next-line no-unused-vars
  const { creadoEn, actualizadoEn, ...datos } = instancia.get({ plain: true });
  return datos;
}

export async function buscarPorCodigo(codigo, opciones = {}) {
  return aObjeto(await Trabajo.findByPk(codigo, opciones));
}

/** Trabajo donde el usuario es integrante: integrantes @> '[{"usuarioId": "u-004"}]' (JSONB). */
export async function buscarDeEstudiante(usuarioId) {
  return aObjeto(await Trabajo.findOne({ where: { integrantes: { [Op.contains]: [{ usuarioId }] } } }));
}

/** Trabajos a cargo de un asesor, del más reciente al más antiguo. */
export async function listarDeAsesor(asesorId) {
  const filas = await Trabajo.findAll({ where: { asesorId }, order: [['codigo', 'DESC']] });
  return filas.map(aObjeto);
}

export async function actualizar(codigo, cambios, opciones = {}) {
  const trabajo = await Trabajo.findByPk(codigo, opciones);
  if (!trabajo) return null;
  await trabajo.update(cambios, opciones);
  return aObjeto(trabajo);
}
