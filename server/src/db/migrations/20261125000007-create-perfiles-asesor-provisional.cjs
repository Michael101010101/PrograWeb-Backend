// PROVISIONAL, dueño HU-3, se descarta cuando el dueño suba la suya
'use strict';
const path = require('path');
const { crearSiNoExiste, borrarSiEsMia } = require('../utils/provisional.cjs');

const TABLA = 'perfiles_asesor';
const MIGRACION = path.basename(__filename);

/** Experiencia y cupo base del asesor (usuarios es de HU-1). */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { Op } = Sequelize;
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
          experiencia: { type: Sequelize.TEXT },
          cupoMaximo: { type: Sequelize.INTEGER, allowNull: false },
          creadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
          actualizadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
        },
        { transaction }
      );
      await queryInterface.addConstraint(TABLA, {
        fields: ['cupoMaximo'],
        type: 'check',
        where: { cupoMaximo: { [Op.gt]: 0 } },
        name: 'perfiles_asesor_cupoMaximo_valido',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await borrarSiEsMia(queryInterface, TABLA, MIGRACION);
  },
};
