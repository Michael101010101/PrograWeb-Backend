'use strict';
const { Model } = require('sequelize');

// Vista mínima del Trabajo que usa la HU-3 (la entidad completa es de la HU-2).
module.exports = (sequelize, DataTypes) => {
  class Trabajo extends Model {
    static associate(db) {
      Trabajo.belongsTo(db.Asesor, { foreignKey: 'asesorId', as: 'asesor' });
      Trabajo.hasMany(db.Solicitud, { foreignKey: 'trabajoCodigo', as: 'solicitudes' });
    }
  }

  Trabajo.init(
    {
      codigo: { type: DataTypes.STRING(20), primaryKey: true },
      titulo: { type: DataTypes.STRING(200), allowNull: false },
      linea: { type: DataTypes.STRING(60), allowNull: false },
      carrera: { type: DataTypes.STRING(60), allowNull: false, defaultValue: '' },
      integrantes: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      estado: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'propuesta',
        validate: { isIn: [['propuesta', 'en_desarrollo', 'concluido']] },
      },
      asesorId: DataTypes.STRING(20),
      avance: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      porRevisar: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      nota: DataTypes.JSONB,
    },
    {
      sequelize,
      modelName: 'Trabajo',
      tableName: 'trabajos',
      timestamps: true,
      createdAt: 'creadoEn',
      updatedAt: 'actualizadoEn',
    }
  );

  return Trabajo;
};
