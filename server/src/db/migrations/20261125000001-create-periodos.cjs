'use strict';

/** Periodo académico (semestre) y datos de contacto de la oficina TFC. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('periodos', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      semestre: { type: Sequelize.STRING(10), allowNull: false, unique: true },
      activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      correoContacto: { type: Sequelize.STRING(120), allowNull: false },
      anexo: { type: Sequelize.STRING(10) },
      mesaAyuda: { type: Sequelize.STRING(10) },
      direccion: { type: Sequelize.STRING(200) },
      creadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      actualizadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('periodos');
  },
};
