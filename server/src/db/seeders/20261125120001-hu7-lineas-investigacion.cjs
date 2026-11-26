'use strict';
// Datos de prueba de HU-7: catálogo de líneas de investigación (tabla propia de HU-7). Idempotente.
const datos = require('./seed-data-hu7.json');
const s = require('../utils/semilla-hu7.cjs');

const IDS = datos.lineas.map((l) => l.id);

module.exports = {
  async up(queryInterface) {
    const ahora = new Date();
    await queryInterface.sequelize.transaction(async (transaction) => {
      await s.insertar(
        queryInterface,
        'lineas_investigacion',
        datos.lineas.map((l) => ({ id: l.id, nombre: l.nombre, activa: true, creadoEn: ahora, actualizadoEn: ahora })),
        transaction
      );
      // Si otra historia ya tenía la línea con otro id, se respeta la suya; solo se exige que el nombre exista.
      await s.lineasPorId(queryInterface, datos.lineas, transaction);
    });
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('lineas_investigacion', { id: IDS });
  },
};
