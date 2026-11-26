'use strict';
// Helpers de los seeders de prueba de HU-7 (seeders/20261125120001… a 120004…).
// Va fuera de seeders/ porque sequelize-cli ejecutaría cualquier .cjs de esa carpeta.
const path = require('path');
const { pathToFileURL } = require('url');

/** Fechas relativas al día en que se corre el seeder: fecha(-3, '15:30') → Date; dia(12) → 'AAAA-MM-DD'. */
function crearFechas(base = new Date()) {
  const fecha = (dias, hora = '10:00') => {
    const [h, m] = hora.split(':').map(Number);
    const d = new Date(base);
    d.setDate(d.getDate() + dias);
    d.setHours(h, m, 0, 0);
    return d;
  };
  const dia = (dias) => {
    const d = fecha(dias);
    const dd = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`;
  };
  return { fecha, dia };
}

/** Catálogos de HU-1 (src/config/catalogos.js es ESM, por eso se carga con import dinámico). */
async function cargarCatalogos() {
  const url = pathToFileURL(path.join(__dirname, '..', '..', 'config', 'catalogos.js')).href;
  const { CATALOGOS } = await import(url);
  return CATALOGOS;
}

function exigir(condicion, mensaje) {
  if (!condicion) throw new Error(`[seed HU-7] ${mensaje}`);
}

function exigirCatalogo(catalogos, lista, valor, donde) {
  exigir(catalogos[lista].includes(valor), `${donde}: "${valor}" no está en el catálogo ${lista}`);
}

const select = (queryInterface, sql, replacements, transaction) =>
  queryInterface.sequelize.query(sql, {
    replacements,
    transaction,
    type: queryInterface.sequelize.QueryTypes.SELECT,
  });

/** INSERT … ON CONFLICT DO NOTHING: volver a correr el seeder no duplica ni falla. */
async function insertar(queryInterface, tabla, filas, transaction) {
  if (filas.length === 0) return;
  await queryInterface.bulkInsert(tabla, filas, { ignoreDuplicates: true, transaction });
}

/** Si una fila se saltó por chocar con un dato ajeno (correo, código, nombre únicos), falla con un mensaje claro. */
async function exigirIds(queryInterface, tabla, ids, transaction) {
  if (ids.length === 0) return;
  const filas = await select(queryInterface, `SELECT id FROM "${tabla}" WHERE id IN (:ids)`, { ids }, transaction);
  const existentes = new Set(filas.map((f) => f.id));
  const faltan = ids.filter((id) => !existentes.has(id));
  exigir(faltan.length === 0, `no se pudieron insertar en ${tabla}: ${faltan.join(', ')}. Revisa si chocan con datos de otra historia.`);
}

/** Mapa semestre → id de periodos. Falla si falta alguno. */
async function periodosPorSemestre(queryInterface, semestres, transaction) {
  const filas = await select(queryInterface, 'SELECT id, semestre FROM periodos WHERE semestre IN (:semestres)', { semestres }, transaction);
  const mapa = new Map(filas.map((f) => [f.semestre, f.id]));
  const faltan = semestres.filter((s) => !mapa.has(s));
  exigir(faltan.length === 0, `faltan los periodos ${faltan.join(', ')}. Corre antes los seeders del periodo y 20261125120002-hu7-usuarios-periodo.cjs.`);
  return mapa;
}

/** Mapa id del JSON (li-00x) → id real en la base, resuelto por nombre por si otra historia ya cargó la línea. */
async function lineasPorId(queryInterface, lineas, transaction) {
  const nombres = lineas.map((l) => l.nombre);
  const filas = await select(queryInterface, 'SELECT id, nombre FROM lineas_investigacion WHERE nombre IN (:nombres)', { nombres }, transaction);
  const porNombre = new Map(filas.map((f) => [f.nombre, f.id]));
  const faltan = nombres.filter((n) => !porNombre.has(n));
  exigir(faltan.length === 0, `faltan las líneas ${faltan.join(', ')}. Corre antes 20261125120001-hu7-lineas-investigacion.cjs.`);
  return new Map(lineas.map((l) => [l.id, porNombre.get(l.nombre)]));
}

/** Comentario 'provisional:<migración>' que ponen las migraciones provisionales (utils/provisional.cjs). */
async function esProvisional(queryInterface, tabla, transaction) {
  const [fila] = await select(
    queryInterface,
    "SELECT obj_description(to_regclass(:tabla), 'pg_class') AS comentario",
    { tabla: `public.${tabla}` },
    transaction
  );
  return typeof fila?.comentario === 'string' && fila.comentario.startsWith('provisional:');
}

async function tablaExiste(queryInterface, tabla, transaction) {
  const [fila] = await select(queryInterface, 'SELECT to_regclass(:tabla) IS NOT NULL AS existe', { tabla: `public.${tabla}` }, transaction);
  return fila.existe;
}

module.exports = {
  crearFechas,
  cargarCatalogos,
  exigir,
  exigirCatalogo,
  select,
  insertar,
  exigirIds,
  periodosPorSemestre,
  lineasPorId,
  esProvisional,
  tablaExiste,
};
