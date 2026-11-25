'use strict';

/** Enlaces de un solo uso: verificación de correo (24 h) y recuperación de contraseña (60 min). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tokens', {
      token: { type: Sequelize.STRING(64), primaryKey: true, allowNull: false },
      tipo: { type: Sequelize.STRING(20), allowNull: false },
      usuarioId: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE',
      },
      venceEn: { type: Sequelize.DATE, allowNull: false },
      usado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      creadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });
    await queryInterface.addConstraint('tokens', {
      fields: ['tipo'],
      type: 'check',
      where: { tipo: ['verificacion', 'recuperacion'] },
      name: 'tokens_tipo_valido',
    });
    await queryInterface.addIndex('tokens', ['usuarioId', 'tipo']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tokens');
  },
};
