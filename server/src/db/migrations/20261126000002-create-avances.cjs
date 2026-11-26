'use strict';

/**
 * Avances: cada versión que sube el equipo para un entregable.
 * La crea el estudiante desde la HU-4 (pantalla 4.3) y la revisa el asesor desde la HU-5:
 * fechaRevision, resultado ('aprobado' | 'observado'), comentario y revisorId.
 * resultado vacío (null) = la versión todavía está en revisión.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('avances', {
      id: { type: Sequelize.STRING(20), primaryKey: true, allowNull: false },
      entregableId: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: { model: 'entregables', key: 'id' },
        onDelete: 'CASCADE',
      },
      version: { type: Sequelize.INTEGER, allowNull: false },
      fechaEntrega: { type: Sequelize.DATEONLY, allowNull: false },
      diasRetraso: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      enlace: { type: Sequelize.STRING(500), allowNull: false },
      descripcion: { type: Sequelize.TEXT, allowNull: false },
      fechaRevision: { type: Sequelize.DATEONLY },
      resultado: { type: Sequelize.STRING(20) },
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
      fields: ['resultado'],
      type: 'check',
      where: { resultado: ['aprobado', 'observado'] },
      name: 'avances_resultado_valido',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('avances');
  },
};
