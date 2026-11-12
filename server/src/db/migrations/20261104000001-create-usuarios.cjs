'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('usuarios', {
      id: { type: Sequelize.STRING(20), primaryKey: true, allowNull: false },
      rol: { type: Sequelize.STRING(20), allowNull: false },
      estado: { type: Sequelize.STRING(30), allowNull: false },
      nombres: { type: Sequelize.STRING(60), allowNull: false },
      apellidos: { type: Sequelize.STRING(60), allowNull: false },
      correo: { type: Sequelize.STRING(120), allowNull: false, unique: true },
      passwordHash: { type: Sequelize.STRING(100), allowNull: false },
      telefono: { type: Sequelize.STRING(15), allowNull: false, defaultValue: '' },
      carrera: { type: Sequelize.STRING(60) },
      ciclo: { type: Sequelize.STRING(20) },
      codigoAlumno: { type: Sequelize.STRING(8), unique: true },
      gradoAcademico: { type: Sequelize.STRING(30) },
      departamento: { type: Sequelize.STRING(60) },
      cargo: { type: Sequelize.STRING(60) },
      motivoBloqueo: { type: Sequelize.TEXT },
      notificaciones: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: { entregables: true, retroalimentacion: true, resumenSemanal: false },
      },
      ultimoIngreso: { type: Sequelize.DATE },
      creadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      actualizadoEn: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });
    // Reglas del negocio protegidas en la propia base
    await queryInterface.addConstraint('usuarios', {
      fields: ['rol'],
      type: 'check',
      where: { rol: ['estudiante', 'asesor', 'coordinador'] },
      name: 'usuarios_rol_valido',
    });
    await queryInterface.addConstraint('usuarios', {
      fields: ['estado'],
      type: 'check',
      where: { estado: ['activo', 'sin_verificar', 'pendiente_validacion', 'bloqueado'] },
      name: 'usuarios_estado_valido',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('usuarios');
  },
};
