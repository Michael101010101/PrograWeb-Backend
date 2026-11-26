'use strict';

/** Mensajes del coordinador al asesor (dueño HU-7). Solo se guardan, no se envía correo. */
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
      destinatarioId: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'RESTRICT',
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('mensajes');
  },
};
