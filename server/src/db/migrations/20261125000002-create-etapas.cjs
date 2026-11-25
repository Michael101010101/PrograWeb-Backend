'use strict';

/** Etapas del proceso TFC de un periodo, con sus fechas (cronograma). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('etapas', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      periodoId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'periodos', key: 'id' },
        onDelete: 'CASCADE',
      },
      numero: { type: Sequelize.INTEGER, allowNull: false },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      titulo: { type: Sequelize.STRING(100), allowNull: false },
      responsable: { type: Sequelize.STRING(60), allowNull: false },
      descripcion: { type: Sequelize.TEXT, allowNull: false },
      inicio: { type: Sequelize.DATEONLY, allowNull: false },
      fin: { type: Sequelize.DATEONLY, allowNull: false },
    });
    await queryInterface.addConstraint('etapas', {
      fields: ['periodoId', 'numero'],
      type: 'unique',
      name: 'etapas_periodo_numero_unico',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('etapas');
  },
};
