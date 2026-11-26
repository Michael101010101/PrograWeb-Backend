'use strict';

/**
 * Ampliaciones de cupo del asesor por periodo (dueño HU-7). Cada ampliación es una fila nueva (historial).
 * Cupo vigente = fila más reciente de (asesorId, periodoId); si no hay, perfiles_asesor.cupoMaximo.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { Op } = Sequelize;
    await queryInterface.createTable('cupos_asesor', {
      id: { type: Sequelize.STRING(20), primaryKey: true, allowNull: false },
      asesorId: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE',
      },
      periodoId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'periodos', key: 'id' },
        onDelete: 'CASCADE',
      },
      cupoMaximo: { type: Sequelize.INTEGER, allowNull: false },
      motivo: { type: Sequelize.TEXT },
      modificadoPor: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'RESTRICT',
      },
      creadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });
    await queryInterface.addConstraint('cupos_asesor', {
      fields: ['cupoMaximo'],
      type: 'check',
      where: { cupoMaximo: { [Op.gt]: 0 } },
      name: 'cupos_asesor_cupoMaximo_valido',
    });
    await queryInterface.addIndex('cupos_asesor', ['asesorId', 'periodoId', 'creadoEn']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cupos_asesor');
  },
};
