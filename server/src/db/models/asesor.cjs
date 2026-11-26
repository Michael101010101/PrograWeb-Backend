'use strict';
const { Model } = require('sequelize');
const { randomBytes } = require('node:crypto');

module.exports = (sequelize, DataTypes) => {
  class Asesor extends Model {
    static associate(db) {
      Asesor.belongsTo(db.Usuario, { foreignKey: 'usuarioId', as: 'usuario' });
      Asesor.hasMany(db.Trabajo, { foreignKey: 'asesorId', as: 'trabajos' });
      Asesor.hasMany(db.Solicitud, { foreignKey: 'asesorId', as: 'solicitudes' });
      Asesor.hasMany(db.HistorialAsesoria, { foreignKey: 'asesorId', as: 'historial' });
    }
  }

  Asesor.init(
    {
      id: { type: DataTypes.STRING(20), primaryKey: true, defaultValue: () => `a-${randomBytes(4).toString('hex')}` },
      usuarioId: { type: DataTypes.STRING(20), unique: true },
      titulo: { type: DataTypes.STRING(10), allowNull: false },
      gradoAcademico: {
        type: DataTypes.STRING(30),
        allowNull: false,
        validate: { isIn: [['Ingeniero', 'Magíster', 'Doctor']] },
      },
      nombres: { type: DataTypes.STRING(60), allowNull: false },
      apellidos: { type: DataTypes.STRING(60), allowNull: false },
      correo: { type: DataTypes.STRING(120), allowNull: false, unique: true },
      departamento: { type: DataTypes.STRING(60), allowNull: false },
      lineas: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      especialidad: { type: DataTypes.STRING(120), allowNull: false, defaultValue: '' },
      experiencia: DataTypes.TEXT,
      trabajosAsesorados: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      concluidos: DataTypes.INTEGER,
      tiempoRevision: DataTypes.STRING(20),
      sustentacionesJurado: DataTypes.INTEGER,
      cupoMaximo: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
      cupoOcupado: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
      sinCupoDesde: DataTypes.DATEONLY,
    },
    {
      sequelize,
      modelName: 'Asesor',
      tableName: 'asesores',
      timestamps: true,
      createdAt: 'creadoEn',
      updatedAt: 'actualizadoEn',
    }
  );

  return Asesor;
};
