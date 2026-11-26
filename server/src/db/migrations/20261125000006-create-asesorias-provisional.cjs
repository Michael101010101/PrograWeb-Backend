// PROVISIONAL, dueño HU-3, se descarta cuando el dueño suba la suya
'use strict';
const path = require('path');
const { crearSiNoExiste, borrarSiEsMia } = require('../utils/provisional.cjs');

const TABLA = 'asesorias';
const MIGRACION = path.basename(__filename);

/** Solicitud y asignación de asesor a un trabajo. Vigente = aceptada y sin fechaFin. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await crearSiNoExiste(queryInterface, TABLA, MIGRACION, async (transaction) => {
      await queryInterface.createTable(
        TABLA,
        {
          id: { type: Sequelize.STRING(20), primaryKey: true, allowNull: false },
          trabajoId: {
            type: Sequelize.STRING(20),
            allowNull: false,
            references: { model: 'trabajos', key: 'id' },
            onDelete: 'CASCADE',
          },
          asesorId: {
            type: Sequelize.STRING(20),
            allowNull: false,
            references: { model: 'usuarios', key: 'id' },
            onDelete: 'RESTRICT',
          },
          estado: { type: Sequelize.STRING(30), allowNull: false },
          mensaje: { type: Sequelize.TEXT },
          motivoRechazo: { type: Sequelize.TEXT },
          fechaSolicitud: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
          fechaInicio: { type: Sequelize.DATEONLY },
          fechaFin: { type: Sequelize.DATEONLY },
          motivoFin: { type: Sequelize.TEXT },
          creadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
          actualizadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
        },
        { transaction }
      );
      await queryInterface.addConstraint(TABLA, {
        fields: ['estado'],
        type: 'check',
        where: { estado: ['pendiente', 'aceptada', 'rechazada', 'finalizada'] },
        name: 'asesorias_estado_valido',
        transaction,
      });
      // Índice único parcial: un solo asesor vigente por trabajo
      await queryInterface.addIndex(TABLA, ['trabajoId'], {
        unique: true,
        where: { estado: 'aceptada', fechaFin: null },
        name: 'asesorias_vigente_unica',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await borrarSiEsMia(queryInterface, TABLA, MIGRACION);
  },
};
