'use strict';

/** HU-3 · Ficha de cada asesor: líneas que atiende, experiencia y cupo. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('asesores', {
      id: { type: Sequelize.STRING(20), primaryKey: true, allowNull: false },
      // Cuenta del asesor en la HU-1 (null si el asesor aún no tiene cuenta)
      usuarioId: {
        type: Sequelize.STRING(20),
        unique: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      titulo: { type: Sequelize.STRING(10), allowNull: false },
      gradoAcademico: { type: Sequelize.STRING(30), allowNull: false },
      nombres: { type: Sequelize.STRING(60), allowNull: false },
      apellidos: { type: Sequelize.STRING(60), allowNull: false },
      correo: { type: Sequelize.STRING(120), allowNull: false, unique: true },
      departamento: { type: Sequelize.STRING(60), allowNull: false },
      lineas: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      especialidad: { type: Sequelize.STRING(120), allowNull: false, defaultValue: '' },
      experiencia: { type: Sequelize.TEXT },
      trabajosAsesorados: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      concluidos: { type: Sequelize.INTEGER },
      tiempoRevision: { type: Sequelize.STRING(20) },
      sustentacionesJurado: { type: Sequelize.INTEGER },
      cupoMaximo: { type: Sequelize.INTEGER, allowNull: false },
      cupoOcupado: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      sinCupoDesde: { type: Sequelize.DATEONLY },
      creadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      actualizadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });
    // Regla del negocio protegida en la base: el cupo ocupado nunca pasa del máximo
    await queryInterface.sequelize.query(
      'ALTER TABLE asesores ADD CONSTRAINT asesores_cupo_valido CHECK ("cupoMaximo" >= 1 AND "cupoOcupado" >= 0 AND "cupoOcupado" <= "cupoMaximo")'
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('asesores');
  },
};
