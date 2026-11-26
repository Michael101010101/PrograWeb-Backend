// PROVISIONAL, dueño HU-6, se descarta cuando el dueño suba la suya
'use strict';
const path = require('path');
const { crearSiNoExiste, borrarSiEsMia } = require('../utils/provisional.cjs');

const TABLA = 'sustentaciones';
const MIGRACION = path.basename(__filename);

/** Sustentaciones programadas de cada trabajo. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { Op } = Sequelize;
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
          fecha: { type: Sequelize.DATEONLY, allowNull: false },
          hora: { type: Sequelize.TIME, allowNull: false },
          sala: { type: Sequelize.STRING(60) },
          modalidad: { type: Sequelize.STRING(30), allowNull: false },
          calificacion: { type: Sequelize.DECIMAL(4, 2) },
          estado: { type: Sequelize.STRING(30), allowNull: false },
          creadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
          actualizadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
        },
        { transaction }
      );
      await queryInterface.addConstraint(TABLA, {
        fields: ['modalidad'],
        type: 'check',
        where: { modalidad: ['presencial', 'virtual'] },
        name: 'sustentaciones_modalidad_valido',
        transaction,
      });
      await queryInterface.addConstraint(TABLA, {
        fields: ['estado'],
        type: 'check',
        where: { estado: ['programada', 'realizada', 'reprogramada', 'desaprobada'] },
        name: 'sustentaciones_estado_valido',
        transaction,
      });
      await queryInterface.addConstraint(TABLA, {
        fields: ['calificacion'],
        type: 'check',
        where: { calificacion: { [Op.between]: [0, 20] } },
        name: 'sustentaciones_calificacion_valido',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await borrarSiEsMia(queryInterface, TABLA, MIGRACION);
  },
};
