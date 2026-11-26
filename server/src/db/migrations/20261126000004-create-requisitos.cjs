'use strict';

/** HU-4 · Requisitos administrativos del periodo (generan alertas pero no tienen peso). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('requisitos', {
      id: { type: Sequelize.STRING(20), primaryKey: true, allowNull: false },
      periodoId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'periodos', key: 'id' },
        onDelete: 'CASCADE',
      },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      detalle: { type: Sequelize.STRING(200), allowNull: false },
      fechaLimite: { type: Sequelize.DATEONLY, allowNull: false },
      pasos: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('requisitos');
  },
};
