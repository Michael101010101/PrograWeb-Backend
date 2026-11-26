'use strict';
// Helpers para migraciones de tablas PROVISIONALES (de otras historias).
// up(): crea la tabla solo si no existe y la marca con un comentario 'provisional:<migración>'.
// down(): la borra solo si ese comentario coincide, es decir, si la creó esa misma migración.
// Va fuera de migrations/ porque sequelize-cli ejecutaría cualquier .cjs de esa carpeta.

const marca = (nombreMigracion) => `provisional:${nombreMigracion}`;

async function crearSiNoExiste(queryInterface, tabla, nombreMigracion, crear) {
  if (await queryInterface.tableExists(tabla)) return;
  await queryInterface.sequelize.transaction(async (transaction) => {
    await crear(transaction);
    // El nombre de la tabla es una constante de la migración; el comentario va como literal escapado.
    const comentario = queryInterface.sequelize.escape(marca(nombreMigracion));
    await queryInterface.sequelize.query(`COMMENT ON TABLE "${tabla}" IS ${comentario}`, { transaction });
  });
}

async function borrarSiEsMia(queryInterface, tabla, nombreMigracion) {
  const [fila] = await queryInterface.sequelize.query(
    "SELECT obj_description(to_regclass(:tabla), 'pg_class') AS comentario",
    { replacements: { tabla: `public.${tabla}` }, type: queryInterface.sequelize.QueryTypes.SELECT }
  );
  if (fila?.comentario === marca(nombreMigracion)) {
    await queryInterface.dropTable(tabla);
  }
}

module.exports = { crearSiNoExiste, borrarSiEsMia };
