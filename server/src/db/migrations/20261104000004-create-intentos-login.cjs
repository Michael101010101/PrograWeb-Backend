'use strict';

/** Intentos fallidos de inicio de sesión (bloqueo temporal tras 5 intentos). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('intentos_login', {
      correo: { type: Sequelize.STRING(120), primaryKey: true, allowNull: false },
      fallidos: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      bloqueadoHasta: { type: Sequelize.DATE },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('intentos_login');
  },
};
