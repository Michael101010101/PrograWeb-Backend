'use strict';

/** HU-3 · Solicitudes de asesoría que el equipo de un trabajo envía a un asesor. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('solicitudes', {
      id: { type: Sequelize.STRING(30), primaryKey: true, allowNull: false },
      asesorId: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: { model: 'asesores', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      trabajoCodigo: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: { model: 'trabajos', key: 'codigo' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      estado: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pendiente' },
      fecha: { type: Sequelize.DATEONLY, allowNull: false },
      // Copia del equipo al momento de enviar: [{ nombre, responsable }]
      equipo: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      mensaje: { type: Sequelize.TEXT, allowNull: false },
      motivo: { type: Sequelize.TEXT },
      resueltaEl: { type: Sequelize.DATEONLY },
      creadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      actualizadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });
    await queryInterface.addConstraint('solicitudes', {
      fields: ['estado'],
      type: 'check',
      where: { estado: ['pendiente', 'aceptada', 'rechazada', 'retirada'] },
      name: 'solicitudes_estado_valido',
    });
    // Regla del negocio en la base: un trabajo solo puede tener UNA solicitud pendiente
    await queryInterface.addIndex('solicitudes', ['trabajoCodigo'], {
      unique: true,
      where: { estado: 'pendiente' },
      name: 'solicitudes_una_pendiente_por_trabajo',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('solicitudes');
  },
};
