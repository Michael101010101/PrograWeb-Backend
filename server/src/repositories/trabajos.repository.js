import { Op } from 'sequelize';
import db from '../db/models/index.cjs';
import { ESTADOS_VIGENTES } from '../config/trabajos.js';

const { Trabajo, TrabajoIntegrante, TrabajoHistorial, Usuario, LineaInvestigacion, sequelize } = db;

const DATOS_USUARIO = ['id', 'nombres', 'apellidos', 'codigoAlumno', 'carrera', 'ciclo', 'estado'];

const INCLUIR = [
  {
    model: TrabajoIntegrante,
    as: 'integrantes',
    include: [{ model: Usuario, as: 'usuario', attributes: DATOS_USUARIO }],
  },
  { model: TrabajoHistorial, as: 'historial' },
  { model: LineaInvestigacion, as: 'lineaInvestigacion', attributes: ['id', 'nombre'] },
];

const ORDEN = [
  [{ model: TrabajoIntegrante, as: 'integrantes' }, 'esResponsable', 'DESC'],
  [{ model: TrabajoIntegrante, as: 'integrantes' }, 'id', 'ASC'],
  [{ model: TrabajoHistorial, as: 'historial' }, 'fecha', 'ASC'],
];

function aObjeto(instancia) {
  if (!instancia) return null;
  // eslint-disable-next-line no-unused-vars
  const { lineaInvestigacion, ...t } = instancia.get({ plain: true });
  return {
    ...t,
    registradoEn: t.fechaRegistro,
    linea: lineaInvestigacion?.nombre ?? null,
    integrantes: (t.integrantes ?? []).map((i) => ({
      usuarioId: i.estudianteId,
      responsable: i.esResponsable,
      usuario: i.usuario ?? null,
    })),
    historial: (t.historial ?? []).map(({ de, a, motivo, fecha, usuarioId }) => ({ de, a, motivo, fecha, usuarioId })),
  };
}

export async function buscarPorId(id, opciones = {}) {
  return aObjeto(await Trabajo.findByPk(id, { include: INCLUIR, order: ORDEN, ...opciones }));
}

export async function buscarPorCodigo(codigo) {
  return aObjeto(await Trabajo.findOne({ where: { codigo }, include: INCLUIR, order: ORDEN }));
}

export async function listarDeAsesor(usuarioId) {
  const filas = await Trabajo.findAll({
    where: { asesor: { id: usuarioId } },
    include: INCLUIR,
    order: [['fechaRegistro', 'DESC'], ...ORDEN],
  });
  return filas.map(aObjeto);
}

async function idsDeIntegrante(usuarioId, transaction) {
  const filas = await TrabajoIntegrante.findAll({ where: { estudianteId: usuarioId }, attributes: ['trabajoId'], transaction });
  return filas.map((f) => f.trabajoId);
}

export async function listarPorIntegrante(usuarioId, { estado } = {}) {
  const ids = await idsDeIntegrante(usuarioId);
  if (ids.length === 0) return [];
  const where = { id: ids };
  if (estado) where.estado = estado;
  const filas = await Trabajo.findAll({
    where,
    include: INCLUIR,
    order: [['fechaRegistro', 'DESC'], ...ORDEN],
  });
  return filas.map(aObjeto);
}

export async function buscarVigentePorIntegrante(usuarioId, transaction) {
  const ids = await idsDeIntegrante(usuarioId, transaction);
  if (ids.length === 0) return null;
  const t = await Trabajo.findOne({
    where: { id: ids, estado: ESTADOS_VIGENTES },
    include: INCLUIR,
    order: ORDEN,
    transaction,
  });
  return aObjeto(t);
}

export async function listar({ estado, lineaId, buscar } = {}) {
  const where = {};
  if (estado) where.estado = estado;
  if (lineaId) where.lineaId = lineaId;
  if (buscar) where[Op.or] = [{ titulo: { [Op.iLike]: `%${buscar}%` } }, { codigo: { [Op.iLike]: `%${buscar}%` } }];
  const filas = await Trabajo.findAll({ where, include: INCLUIR, order: [['fechaRegistro', 'DESC'], ...ORDEN] });
  return filas.map(aObjeto);
}

export async function siguienteCodigo(semestre, transaction) {
  const prefijo = `TFC-${semestre}-`;
  const filas = await Trabajo.findAll({
    where: { codigo: { [Op.like]: `${prefijo}%` } },
    attributes: ['codigo'],
    transaction,
  });
  const max = filas.reduce((m, f) => Math.max(m, Number(f.codigo.slice(prefijo.length)) || 0), 0);
  return `${prefijo}${String(max + 1).padStart(3, '0')}`;
}

export function enTransaccion(fn) {
  return sequelize.transaction(fn);
}

export async function crear({ integrantes, historial, ...datos }, transaction) {
  const trabajo = await Trabajo.create(datos, { transaction });
  await TrabajoIntegrante.bulkCreate(
    integrantes.map((i) => ({ trabajoId: trabajo.id, estudianteId: i.usuarioId, esResponsable: i.responsable })),
    { transaction }
  );
  await TrabajoHistorial.bulkCreate(
    historial.map((h) => ({ ...h, trabajoId: trabajo.id })),
    { transaction }
  );
  return trabajo.id;
}

export async function actualizar(id, cambios, transaction) {
  await Trabajo.update(cambios, { where: { id }, transaction });
}

export async function reemplazarIntegrantes(trabajoId, integrantes, transaction) {
  await TrabajoIntegrante.destroy({ where: { trabajoId }, transaction });
  await TrabajoIntegrante.bulkCreate(
    integrantes.map((i) => ({ trabajoId, estudianteId: i.usuarioId, esResponsable: i.responsable })),
    { transaction }
  );
}

export async function agregarHistorial(trabajoId, registro, transaction) {
  await TrabajoHistorial.create({ ...registro, trabajoId }, { transaction });
}

export async function listarLineas() {
  const filas = await LineaInvestigacion.findAll({ order: [['nombre', 'ASC']] });
  return filas.map((f) => f.get({ plain: true }));
}

export async function buscarLineaPorNombre(nombre) {
  const l = await LineaInvestigacion.findOne({ where: { nombre } });
  return l ? l.get({ plain: true }) : null;
}

export async function entregablesDeTrabajos(trabajoIds) {
  if (!db.Entregable || trabajoIds.length === 0) return [];
  const filas = await db.Entregable.findAll({
    where: { trabajoId: trabajoIds },
    attributes: ['trabajoId', 'nombre', 'peso', 'estado', 'fechaLimite', 'orden'],
    order: [['orden', 'ASC']],
  });
  return filas.map((f) => f.get({ plain: true }));
}