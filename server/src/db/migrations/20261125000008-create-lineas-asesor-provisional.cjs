// PROVISIONAL, dueño HU-3, se descarta cuando el dueño suba la suya
'use strict';
const path = require('path');
const { crearSiNoExiste, borrarSiEsMia } = require('../utils/provisional.cjs');

const TABLA = 'lineas_asesor';
const MIGRACION = path.basename(__filename);

/** Líneas de investigación en las que asesora cada asesor. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await crearSiNoExiste(queryInterface, TABLA, MIGRACION, async (transaction) => {
      await queryInterface.createTable(
        TABLA,
        {
          asesorId: {
            type: Sequelize.STRING(20),
            primaryKey: true,
            allowNull: false,
            references: { model: 'usuarios', key: 'id' },
            onDelete: 'CASCADE',
          },
          lineaId: {
            type: Sequelize.STRING(20),
            primaryKey: true,
            allowNull: false,
            references: { model: 'lineas_investigacion', key: 'id' },
            onDelete: 'CASCADE',
          },
          creadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
          actualizadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
        },
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await borrarSiEsMia(queryInterface, TABLA, MIGRACION);
  },
};
