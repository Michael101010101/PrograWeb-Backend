// PROVISIONAL, dueño HU-4 (entrega) y HU-5 (revisión), se descarta cuando el dueño suba la suya
'use strict';
const path = require('path');
const { crearSiNoExiste, borrarSiEsMia } = require('../utils/provisional.cjs');

const TABLA = 'avances';
const MIGRACION = path.basename(__filename);

/** Versiones entregadas de un entregable y su revisión. resultado NULL = sin revisar. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await crearSiNoExiste(queryInterface, TABLA, MIGRACION, async (transaction) => {
      await queryInterface.createTable(
        TABLA,
        {
          id: { type: Sequelize.STRING(20), primaryKey: true, allowNull: false },
          entregableId: {
            type: Sequelize.STRING(20),
            allowNull: false,
            references: { model: 'entregables', key: 'id' },
            onDelete: 'CASCADE',
          },
          version: { type: Sequelize.INTEGER, allowNull: false },
          enlace: { type: Sequelize.STRING(300), allowNull: false },
          descripcion: { type: Sequelize.TEXT },
          fechaEntrega: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
          revisadoPor: {
            type: Sequelize.STRING(20),
            references: { model: 'usuarios', key: 'id' },
            onDelete: 'SET NULL',
          },
          fechaRevision: { type: Sequelize.DATE },
          comentarios: { type: Sequelize.TEXT },
          resultado: { type: Sequelize.STRING(30) },
          creadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
          actualizadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
        },
        { transaction }
      );
      await queryInterface.addConstraint(TABLA, {
        fields: ['entregableId', 'version'],
        type: 'unique',
        name: 'avances_entregable_version_unico',
        transaction,
      });
      // NULL pasa el CHECK (sin revisar)
      await queryInterface.addConstraint(TABLA, {
        fields: ['resultado'],
        type: 'check',
        where: { resultado: ['aprobado', 'observado'] },
        name: 'avances_resultado_valido',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await borrarSiEsMia(queryInterface, TABLA, MIGRACION);
  },
};
