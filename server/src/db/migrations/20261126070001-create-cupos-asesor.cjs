'use strict';

/**
 * HU-7 · Historial de cambios de cupo del asesor (ampliar cupo y validar asesor).
 * El cupo vigente vive en asesores.cupoMaximo (HU-3); aquí queda cada cambio con su valor anterior.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cupos_asesor', {
      id: { type: Sequelize.STRING(20), primaryKey: true, allowNull: false },
      asesorId: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: { model: 'asesores', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      periodoId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'periodos', key: 'id' },
        onDelete: 'RESTRICT',
      },
      cupoAnterior: { type: Sequelize.INTEGER, allowNull: false },
      cupoMaximo: { type: Sequelize.INTEGER, allowNull: false },
      motivo: { type: Sequelize.TEXT, allowNull: false },
      modificadoPor: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'RESTRICT',
      },
      creadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });
    await queryInterface.sequelize.query(
      'ALTER TABLE cupos_asesor ADD CONSTRAINT cupos_asesor_cupo_valido CHECK ("cupoMaximo" >= 1 AND "cupoAnterior" >= 1)'
    );
    await queryInterface.addIndex('cupos_asesor', ['asesorId', 'periodoId', 'creadoEn']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cupos_asesor');
  },
};
