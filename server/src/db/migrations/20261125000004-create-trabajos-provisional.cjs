// PROVISIONAL, dueño HU-2, se descarta cuando el dueño suba la suya
'use strict';
const path = require('path');
const { crearSiNoExiste, borrarSiEsMia } = require('../utils/provisional.cjs');

const TABLA = 'trabajos';
const MIGRACION = path.basename(__filename);

/** Trabajos de fin de carrera. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await crearSiNoExiste(queryInterface, TABLA, MIGRACION, async (transaction) => {
      await queryInterface.createTable(
        TABLA,
        {
          id: { type: Sequelize.STRING(20), primaryKey: true, allowNull: false },
          titulo: { type: Sequelize.STRING(200), allowNull: false },
          lineaId: {
            type: Sequelize.STRING(20),
            allowNull: false,
            references: { model: 'lineas_investigacion', key: 'id' },
            onDelete: 'RESTRICT',
          },
          resumen: { type: Sequelize.TEXT, allowNull: false },
          objetivos: { type: Sequelize.TEXT, allowNull: false },
          palabrasClave: { type: Sequelize.ARRAY(Sequelize.STRING(40)), allowNull: false, defaultValue: [] },
          estado: { type: Sequelize.STRING(30), allowNull: false },
          motivoEstado: { type: Sequelize.TEXT },
          carrera: { type: Sequelize.STRING(60), allowNull: false },
          periodoId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'periodos', key: 'id' },
            onDelete: 'RESTRICT',
          },
          fechaRegistro: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
          creadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
          actualizadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
        },
        { transaction }
      );
      await queryInterface.addConstraint(TABLA, {
        fields: ['estado'],
        type: 'check',
        where: { estado: ['propuesta', 'en_desarrollo', 'concluido', 'desistido'] },
        name: 'trabajos_estado_valido',
        transaction,
      });
      await queryInterface.addIndex(TABLA, ['periodoId', 'estado'], { transaction });
      await queryInterface.addIndex(TABLA, ['lineaId'], { transaction });
      await queryInterface.addIndex(TABLA, ['carrera'], { transaction });
    });
  },

  async down(queryInterface) {
    await borrarSiEsMia(queryInterface, TABLA, MIGRACION);
  },
};
