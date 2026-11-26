'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('trabajos', 'asesorId', {
      type: Sequelize.STRING(20),
      references: { model: 'asesores', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('trabajos', 'porRevisar', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn('trabajos', 'nota', { type: Sequelize.JSONB });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('trabajos', 'nota');
    await queryInterface.removeColumn('trabajos', 'porRevisar');
    await queryInterface.removeColumn('trabajos', 'asesorId');
  },
};