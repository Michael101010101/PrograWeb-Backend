import { Op } from 'sequelize';
import db from '../db/models/index.cjs';

// Patrón Repository sobre el modelo Asesor (HU-3).
// Es el único lugar que lee y escribe la tabla asesores; los servicios no conocen Sequelize.

const { Asesor, sequelize } = db;

// Expresiones SQL reutilizables
const CUPO_DISPONIBLE = sequelize.literal('"cupoMaximo" - "cupoOcupado"');
const NOMBRE_COMPLETO = sequelize.fn('concat', sequelize.col('titulo'), ' ', sequelize.col('nombres'), ' ', sequelize.col('apellidos'));
const CON_CUPO = sequelize.where(sequelize.col('cupoOcupado'), Op.lt, sequelize.col('cupoMaximo'));

const ORDENES = {
  cupo: [[CUPO_DISPONIBLE, 'DESC'], ['apellidos', 'ASC']],
  experiencia: [['trabajosAsesorados', 'DESC'], ['apellidos', 'ASC']],
  nombre: [['apellidos', 'ASC']],
};

function aObjeto(instancia) {
  if (!instancia) return null;
  // eslint-disable-next-line no-unused-vars
  const { creadoEn, actualizadoEn, ...datos } = instancia.get({ plain: true });
  return datos;
}

/** Arma el WHERE del directorio a partir de los filtros (un filtro vacío no filtra). */
function condiciones({ texto, linea, departamento, soloConCupo }) {
  const where = [];
  if (texto) where.push(sequelize.where(NOMBRE_COMPLETO, { [Op.iLike]: `%${texto}%` }));
  if (linea) where.push({ lineas: { [Op.contains]: [linea] } }); // JSONB @> '["linea"]'
  if (departamento) where.push({ departamento });
  if (soloConCupo) where.push(CON_CUPO);
  return { [Op.and]: where };
}

/** Directorio: filtra, ordena y pagina en la base de datos. Devuelve { filas, total }. */
export async function listar(filtros, { orden = 'cupo', limite, desplazamiento }) {
  const { rows, count } = await Asesor.findAndCountAll({
    where: condiciones(filtros),
    order: ORDENES[orden] ?? ORDENES.cupo,
    limit: limite,
    offset: desplazamiento,
  });
  return { filas: rows.map(aObjeto), total: count };
}

export async function contar() {
  return Asesor.count();
}

export async function contarConCupo() {
  return Asesor.count({ where: CON_CUPO });
}

/** Los N asesores con más cupo disponible (para la landing pública). */
export async function conMasCupo(limite) {
  const filas = await Asesor.findAll({ where: CON_CUPO, order: ORDENES.cupo, limit: limite });
  return filas.map(aObjeto);
}

/** Otros asesores de una línea que sí tienen cupo (para el modal "Este asesor no tiene cupo"). */
export async function alternativas(linea, excluirId, limite) {
  const filas = await Asesor.findAll({
    where: { [Op.and]: [{ lineas: { [Op.contains]: [linea] } }, CON_CUPO, { id: { [Op.ne]: excluirId } }] },
    order: ORDENES.cupo,
    limit: limite,
  });
  return filas.map(aObjeto);
}

export async function buscarPorId(id, opciones = {}) {
  return aObjeto(await Asesor.findByPk(id, opciones));
}

/** Lee el asesor BLOQUEANDO su fila hasta que termine la transacción (SELECT … FOR UPDATE). */
export async function buscarParaActualizar(id, opciones) {
  return aObjeto(await Asesor.findByPk(id, { ...opciones, lock: opciones.transaction.LOCK.UPDATE }));
}

/** Ficha del asesor que inició sesión (enlace con la cuenta de la HU-1). */
export async function buscarPorUsuarioId(usuarioId) {
  return aObjeto(await Asesor.findOne({ where: { usuarioId } }));
}

export async function actualizar(id, cambios, opciones = {}) {
  const asesor = await Asesor.findByPk(id, opciones);
  if (!asesor) return null;
  await asesor.update(cambios, opciones);
  return aObjeto(asesor);
}
