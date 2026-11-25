'use strict';

/** Invitaciones para crear cuentas de coordinación. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('invitaciones', {
      codigo: { type: Sequelize.STRING(15), primaryKey: true, allowNull: false },
      correo: { type: Sequelize.STRING(120), allowNull: false },
      invitadoPor: {
        type: Sequelize.STRING(20),
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL',
      },
      venceEn: { type: Sequelize.DATE, allowNull: false },
      usada: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      revocada: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      usadaPor: {
        type: Sequelize.STRING(20),
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL',
      },
      usadaEn: { type: Sequelize.DATE },
      creadaEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });
    await queryInterface.addIndex('invitaciones', ['correo']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('invitaciones');
  },
};
