// PROVISIONAL, dueño HU-4, se descarta cuando el dueño suba la suya
'use strict';
const path = require('path');
const { crearSiNoExiste, borrarSiEsMia } = require('../utils/provisional.cjs');

const TABLA = 'entregables';
const MIGRACION = path.basename(__filename);

/** Entregables de cada trabajo (decisión del grupo: son por trabajo, con trabajoId). */
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
          nombre: { type: Sequelize.STRING(120), allowNull: false },
          descripcion: { type: Sequelize.TEXT },
          fechaLimite: { type: Sequelize.DATE, allowNull: false },
          peso: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
          obligatorio: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
          estado: { type: Sequelize.STRING(30), allowNull: false },
          creadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
          actualizadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
        },
        { transaction }
      );
      await queryInterface.addConstraint(TABLA, {
        fields: ['estado'],
        type: 'check',
        where: { estado: ['pendiente', 'entregado', 'entregado_con_retraso', 'observado', 'aprobado'] },
        name: 'entregables_estado_valido',
        transaction,
      });
      await queryInterface.addConstraint(TABLA, {
        fields: ['peso'],
        type: 'check',
        where: { peso: { [Op.gt]: 0, [Op.lte]: 100 } },
        name: 'entregables_peso_valido',
        transaction,
      });
      await queryInterface.addIndex(TABLA, ['trabajoId', 'fechaLimite'], { transaction });
    });
  },

  async down(queryInterface) {
    await borrarSiEsMia(queryInterface, TABLA, MIGRACION);
  },
};
