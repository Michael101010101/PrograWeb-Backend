'use strict';

/** Catálogo de líneas de investigación (dueño HU-7). Todas las historias guardan lineaId, no el texto. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lineas_investigacion', {
      id: { type: Sequelize.STRING(20), primaryKey: true, allowNull: false },
      nombre: { type: Sequelize.STRING(80), allowNull: false, unique: true },
      activa: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      creadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      actualizadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('lineas_investigacion');
  },
};
