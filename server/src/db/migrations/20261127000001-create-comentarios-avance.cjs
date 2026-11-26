'use strict';

/**
 * HU-5 · comentarios_avance: conversación entre asesor y estudiante sobre un avance (HU-4).
 * La revisión en sí (resultado, comentario, revisorId, fechaRevision) vive en `avances`.
 * Depende de la tabla `avances` (migración 20261126000002).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('comentarios_avance', {
      id: { type: Sequelize.STRING(20), primaryKey: true, allowNull: false },
      avanceId: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: { model: 'avances', key: 'id' },
        onDelete: 'CASCADE',
      },
      autorId: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE',
      },
      rol: { type: Sequelize.STRING(20), allowNull: false },
      texto: { type: Sequelize.TEXT, allowNull: false },
      respuestaAId: {
        type: Sequelize.STRING(20),
        references: { model: 'comentarios_avance', key: 'id' },
        onDelete: 'SET NULL',
      },
      creadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });
    await queryInterface.addConstraint('comentarios_avance', {
      fields: ['rol'],
      type: 'check',
      where: { rol: ['asesor', 'estudiante'] },
      name: 'comentarios_avance_rol_valido',
    });
    await queryInterface.addIndex('comentarios_avance', ['avanceId'], { name: 'comentarios_avance_avance_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('comentarios_avance');
  },
};
