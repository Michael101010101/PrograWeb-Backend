'use strict';

/**
 * Vista mínima del Trabajo que necesita la HU-3 (la entidad completa es de la HU-2).
 * Cuando la HU-2 publique su tabla, esta migración se reemplaza por la suya.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trabajos', {
      codigo: { type: Sequelize.STRING(20), primaryKey: true, allowNull: false },
      titulo: { type: Sequelize.STRING(200), allowNull: false },
      linea: { type: Sequelize.STRING(60), allowNull: false },
      carrera: { type: Sequelize.STRING(60), allowNull: false, defaultValue: '' },
      // [{ usuarioId, nombre }]: el primero es el responsable del equipo
      integrantes: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      estado: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'propuesta' },
      asesorId: {
        type: Sequelize.STRING(20),
        references: { model: 'asesores', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      avance: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      porRevisar: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      nota: { type: Sequelize.JSONB },
      creadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      actualizadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });
    await queryInterface.addConstraint('trabajos', {
      fields: ['estado'],
      type: 'check',
      where: { estado: ['propuesta', 'en_desarrollo', 'concluido'] },
      name: 'trabajos_estado_valido',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('trabajos');
  },
};
