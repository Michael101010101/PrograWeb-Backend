'use strict';

/** HU-3 · Asesorías terminadas por el asesor, con el motivo (lo ve la coordinación y el equipo). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('historial_asesorias', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      trabajoCodigo: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: { model: 'trabajos', key: 'codigo' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      asesorId: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: { model: 'asesores', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      motivo: { type: Sequelize.TEXT, allowNull: false },
      fecha: { type: Sequelize.DATEONLY, allowNull: false },
      creadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('historial_asesorias');
  },
};
