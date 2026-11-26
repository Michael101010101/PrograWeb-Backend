// PROVISIONAL, dueño HU-6, se descarta cuando el dueño suba la suya
'use strict';
const path = require('path');
const { crearSiNoExiste, borrarSiEsMia } = require('../utils/provisional.cjs');

const TABLA = 'jurados_sustentacion';
const MIGRACION = path.basename(__filename);

/** Jurados de cada sustentación. Los valores de cargo los define HU-6 (sin CHECK por ahora). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await crearSiNoExiste(queryInterface, TABLA, MIGRACION, async (transaction) => {
      await queryInterface.createTable(
        TABLA,
        {
          sustentacionId: {
            type: Sequelize.STRING(20),
            primaryKey: true,
            allowNull: false,
            references: { model: 'sustentaciones', key: 'id' },
            onDelete: 'CASCADE',
          },
          juradoId: {
            type: Sequelize.STRING(20),
            primaryKey: true,
            allowNull: false,
            references: { model: 'usuarios', key: 'id' },
            onDelete: 'CASCADE',
          },
          cargo: { type: Sequelize.STRING(30) },
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
