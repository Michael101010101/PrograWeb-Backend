'use strict';
// Helpers del seeder de prueba de HU-7 (seeders/20261126070001-datos-hu7.cjs).
// Va fuera de seeders/ porque sequelize-cli ejecutaría cualquier .cjs de esa carpeta.

/** Fecha relativa al día en que se corre el seeder: fecha(-3, '15:30') → Date. */
function crearFechas(base = new Date()) {
  const fecha = (dias, hora = '10:00') => {
    const [h, m] = hora.split(':').map(Number);
    const d = new Date(base);
    d.setDate(d.getDate() + dias);
    d.setHours(h, m, 0, 0);
    return d;
  };
  return { fecha };
}

function exigir(condicion, mensaje) {
  if (!condicion) throw new Error(`[seed HU-7] ${mensaje}`);
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

/** Falla con un mensaje claro si falta alguno de los ids (dato previo ausente o fila saltada por un único ajeno). */
async function exigirIds(queryInterface, tabla, ids, transaction) {
  if (ids.length === 0) return;
  const filas = await select(queryInterface, `SELECT id FROM "${tabla}" WHERE id IN (:ids)`, { ids }, transaction);
  const existentes = new Set(filas.map((f) => f.id));
  const faltan = ids.filter((id) => !existentes.has(id));
  exigir(faltan.length === 0, `faltan en ${tabla}: ${faltan.join(', ')}. Revisa las semillas previas o si chocan con datos de otra historia.`);
}

/** Mapa semestre → id de periodos. Falla si falta alguno. */
async function periodosPorSemestre(queryInterface, semestres, transaction) {
  const filas = await select(queryInterface, 'SELECT id, semestre FROM periodos WHERE semestre IN (:semestres)', { semestres }, transaction);
  const mapa = new Map(filas.map((f) => [f.semestre, f.id]));
  const faltan = semestres.filter((s) => !mapa.has(s));
  exigir(faltan.length === 0, `faltan los periodos ${faltan.join(', ')}. Corre antes el seeder del periodo.`);
  return mapa;
}

module.exports = { crearFechas, exigir, select, insertar, exigirIds, periodosPorSemestre };
