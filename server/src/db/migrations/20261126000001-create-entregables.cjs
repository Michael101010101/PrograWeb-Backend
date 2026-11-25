'use strict';

/**
 * HU-4 · Entregables del plan de cada trabajo.
 * El ESTADO no se guarda: se calcula a partir de los avances (ver entregables.service.js).
 * trabajoCodigo enlaza con el trabajo de la HU-2 (por ejemplo 'TFC-2026-2-047').
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('entregables', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      trabajoCodigo: { type: Sequelize.STRING(20), allowNull: false },
      orden: { type: Sequelize.INTEGER, allowNull: false },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      descripcion: { type: Sequelize.TEXT, allowNull: false, defaultValue: '' },
      peso: { type: Sequelize.INTEGER, allowNull: false },
      obligatorio: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      fechaLimite: { type: Sequelize.DATEONLY, allowNull: false },
      creadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      actualizadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });
    await queryInterface.addIndex('entregables', ['trabajoCodigo']);
    // Regla del negocio protegida en la propia base: el peso va de 5 a 40.
    await queryInterface.addConstraint('entregables', {
      fields: ['peso'],
      type: 'check',
      where: { peso: { [Sequelize.Op.between]: [5, 40] } },
      name: 'entregables_peso_valido',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('entregables');
  },
};
