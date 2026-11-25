'use strict';

/**
 * HU-4 · Entregables del plan de cada trabajo.
 * trabajoId enlaza con la tabla trabajos de la HU-2 (por ejemplo 't-047').
 * estado: lo actualiza el servicio de la HU-4 cada vez que se registra o se revisa un avance.
 * "Vencido" no se guarda: es un entregable 'pendiente' cuya fechaLimite ya pasó.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('entregables', {
      id: { type: Sequelize.STRING(20), primaryKey: true, allowNull: false },
      trabajoId: { type: Sequelize.STRING(20), allowNull: false },
      orden: { type: Sequelize.INTEGER, allowNull: false },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      descripcion: { type: Sequelize.TEXT, allowNull: false, defaultValue: '' },
      peso: { type: Sequelize.INTEGER, allowNull: false },
      obligatorio: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      fechaLimite: { type: Sequelize.DATEONLY, allowNull: false },
      estado: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'pendiente' },
      creadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      actualizadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });
    await queryInterface.addIndex('entregables', ['trabajoId']);
    // Reglas del negocio protegidas en la propia base.
    await queryInterface.addConstraint('entregables', {
      fields: ['peso'],
      type: 'check',
      where: { peso: { [Sequelize.Op.between]: [5, 40] } },
      name: 'entregables_peso_valido',
    });
    await queryInterface.addConstraint('entregables', {
      fields: ['estado'],
      type: 'check',
      where: { estado: ['pendiente', 'entregado', 'entregado_con_retraso', 'observado', 'aprobado'] },
      name: 'entregables_estado_valido',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('entregables');
  },
};
