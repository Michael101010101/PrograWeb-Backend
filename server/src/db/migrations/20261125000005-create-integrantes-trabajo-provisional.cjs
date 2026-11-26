// PROVISIONAL, dueño HU-2, se descarta cuando el dueño suba la suya
'use strict';
const path = require('path');
const { crearSiNoExiste, borrarSiEsMia } = require('../utils/provisional.cjs');

const TABLA = 'integrantes_trabajo';
const MIGRACION = path.basename(__filename);

/** Estudiantes que integran un trabajo. Un solo responsable por trabajo. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await crearSiNoExiste(queryInterface, TABLA, MIGRACION, async (transaction) => {
      await queryInterface.createTable(
        TABLA,
        {
          trabajoId: {
            type: Sequelize.STRING(20),
            primaryKey: true,
            allowNull: false,
            references: { model: 'trabajos', key: 'id' },
            onDelete: 'CASCADE',
          },
          estudianteId: {
            type: Sequelize.STRING(20),
            primaryKey: true,
            allowNull: false,
            references: { model: 'usuarios', key: 'id' },
            onDelete: 'CASCADE',
          },
          esResponsable: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
          creadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
        },
        { transaction }
      );
      // Índice único parcial: como máximo una fila con esResponsable = true por trabajo
      await queryInterface.addIndex(TABLA, ['trabajoId'], {
        unique: true,
        where: { esResponsable: true },
        name: 'integrantes_trabajo_responsable_unico',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await borrarSiEsMia(queryInterface, TABLA, MIGRACION);
  },
};
