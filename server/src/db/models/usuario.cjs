'use strict';
const { Model } = require('sequelize');
const { randomBytes } = require('node:crypto');

module.exports = (sequelize, DataTypes) => {
  class Usuario extends Model {
    static associate(models) {
      Usuario.hasMany(models.Token, { foreignKey: 'usuarioId', as: 'tokens' });
      Usuario.hasMany(models.Invitacion, { foreignKey: 'invitadoPor', as: 'invitacionesEnviadas' });
    }
  }

  Usuario.init(
    {
      id: { type: DataTypes.STRING(20), primaryKey: true, defaultValue: () => `u-${randomBytes(5).toString('hex')}` },
      rol: { type: DataTypes.STRING(20), allowNull: false, validate: { isIn: [['estudiante', 'asesor', 'coordinador']] } },
      estado: {
        type: DataTypes.STRING(30),
        allowNull: false,
        validate: { isIn: [['activo', 'sin_verificar', 'pendiente_validacion', 'bloqueado']] },
      },
      nombres: { type: DataTypes.STRING(60), allowNull: false },
      apellidos: { type: DataTypes.STRING(60), allowNull: false },
      correo: { type: DataTypes.STRING(120), allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING(100), allowNull: false },
      telefono: { type: DataTypes.STRING(15), allowNull: false, defaultValue: '' },
      carrera: DataTypes.STRING(60),
      ciclo: DataTypes.STRING(20),
      codigoAlumno: { type: DataTypes.STRING(8), unique: true },
      gradoAcademico: DataTypes.STRING(30),
      departamento: DataTypes.STRING(60),
      cargo: DataTypes.STRING(60),
      motivoBloqueo: DataTypes.TEXT,
      notificaciones: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: { entregables: true, retroalimentacion: true, resumenSemanal: false },
      },
      ultimoIngreso: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'Usuario',
      tableName: 'usuarios',
      timestamps: true,
      createdAt: 'creadoEn',
      updatedAt: 'actualizadoEn',
    }
  );

  return Usuario;
};
