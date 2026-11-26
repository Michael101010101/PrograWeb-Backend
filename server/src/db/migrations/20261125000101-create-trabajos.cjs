'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trabajos', {
      id: { type: Sequelize.STRING(20), primaryKey: true, allowNull: false },
      codigo: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      titulo: { type: Sequelize.STRING(160), allowNull: false },
      lineaId: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: { model: 'lineas_investigacion', key: 'id' },
        onDelete: 'RESTRICT',
      },
      carrera: { type: Sequelize.STRING(60) },
      resumen: { type: Sequelize.TEXT, allowNull: false },
      objetivos: { type: Sequelize.TEXT, allowNull: false },
      palabrasClave: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      estado: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'propuesta' },
      asesor: { type: Sequelize.JSONB },
      plan: { type: Sequelize.JSONB },
      sustentacion: { type: Sequelize.JSONB },
      periodoId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'periodos', key: 'id' },
        onDelete: 'RESTRICT',
      },
      fechaRegistro: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      cerradoEn: { type: Sequelize.DATE },
      actualizadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });
    await queryInterface.addConstraint('trabajos', {
      fields: ['estado'],
      type: 'check',
      where: { estado: ['propuesta', 'en_desarrollo', 'concluido', 'desistido'] },
      name: 'trabajos_estado_valido',
    });

    await queryInterface.createTable('integrantes_trabajo', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      trabajoId: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: { model: 'trabajos', key: 'id' },
        onDelete: 'CASCADE',
      },
      estudianteId: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE',
      },
      esResponsable: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    });
    await queryInterface.addConstraint('integrantes_trabajo', {
      fields: ['trabajoId', 'estudianteId'],
      type: 'unique',
      name: 'integrantes_trabajo_sin_repetir',
    });
    await queryInterface.addIndex('integrantes_trabajo', ['estudianteId']);

    await queryInterface.createTable('trabajo_historial', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      trabajoId: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: { model: 'trabajos', key: 'id' },
        onDelete: 'CASCADE',
      },
      de: { type: Sequelize.STRING(20) },
      a: { type: Sequelize.STRING(20), allowNull: false },
      motivo: { type: Sequelize.TEXT, allowNull: false },
      fecha: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      usuarioId: {
        type: Sequelize.STRING(20),
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL',
      },
    });
    await queryInterface.addIndex('trabajo_historial', ['trabajoId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('trabajo_historial');
    await queryInterface.dropTable('integrantes_trabajo');
    await queryInterface.dropTable('trabajos');
  },
};