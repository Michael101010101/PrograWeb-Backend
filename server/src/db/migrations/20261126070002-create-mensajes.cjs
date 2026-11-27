'use strict';

/**
 * HU-7 · Mensajes de la coordinación al asesor. Solo se guardan, no se envía correo.
 * asesorId apunta a asesores (HU-3) para cubrir también a los asesores que aún no tienen cuenta.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mensajes', {
      id: { type: Sequelize.STRING(20), primaryKey: true, allowNull: false },
      remitenteId: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'RESTRICT',
      },
      asesorId: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: { model: 'asesores', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      trabajoId: {
        type: Sequelize.STRING(20),
        references: { model: 'trabajos', key: 'id' },
        onDelete: 'SET NULL',
      },
      asunto: { type: Sequelize.STRING(120), allowNull: false },
      cuerpo: { type: Sequelize.TEXT, allowNull: false },
      leido: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      creadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      actualizadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });
    await queryInterface.addIndex('mensajes', ['asesorId', 'creadoEn']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('mensajes');
  },
};
