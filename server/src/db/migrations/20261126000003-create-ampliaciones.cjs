'use strict';

/** HU-4 · Solicitudes de ampliación de la fecha límite de un entregable. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ampliaciones', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      entregableId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'entregables', key: 'id' },
        onDelete: 'CASCADE',
      },
      nuevaFecha: { type: Sequelize.DATEONLY, allowNull: false },
      motivo: { type: Sequelize.TEXT, allowNull: false },
      fecha: { type: Sequelize.DATEONLY, allowNull: false },
      estado: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pendiente' },
      respondidaEn: { type: Sequelize.DATE },
    });
    await queryInterface.addConstraint('ampliaciones', {
      fields: ['estado'],
      type: 'check',
      where: { estado: ['pendiente', 'aceptada', 'rechazada'] },
      name: 'ampliaciones_estado_valido',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ampliaciones');
  },
};
