'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const tablas = (await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName));
    if (tablas.includes('lineas_investigacion')) return;
    await queryInterface.createTable('lineas_investigacion', {
      id: { type: Sequelize.STRING(20), primaryKey: true, allowNull: false },
      nombre: { type: Sequelize.STRING(80), allowNull: false, unique: true },
    });
  },

  async down() {
  },
};