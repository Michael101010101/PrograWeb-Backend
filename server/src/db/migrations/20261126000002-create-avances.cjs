'use strict';

/**
 * HU-4 · Avances: cada versión que sube el equipo para un entregable.
 * La revisión (aprobar u observar) la registra el asesor desde la HU-5: revisadoEn, comentario y revisorId.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('avances', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      entregableId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'entregables', key: 'id' },
        onDelete: 'CASCADE',
      },
      version: { type: Sequelize.INTEGER, allowNull: false },
      fecha: { type: Sequelize.DATEONLY, allowNull: false },
      diasRetraso: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      estado: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'en_revision' },
      enlace: { type: Sequelize.STRING(500), allowNull: false },
      descripcion: { type: Sequelize.TEXT, allowNull: false },
      revisadoEn: { type: Sequelize.DATEONLY },
      comentario: { type: Sequelize.TEXT },
      revisorId: {
        type: Sequelize.STRING(20),
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL',
      },
      creadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });
    // Un entregable no puede tener dos veces la misma versión.
    await queryInterface.addConstraint('avances', {
      fields: ['entregableId', 'version'],
      type: 'unique',
      name: 'avances_version_unica',
    });
    await queryInterface.addConstraint('avances', {
      fields: ['estado'],
      type: 'check',
      where: { estado: ['en_revision', 'observado', 'aprobado'] },
      name: 'avances_estado_valido',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('avances');
  },
};
