'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HistorialAsesoria extends Model {
    static associate(db) {
      HistorialAsesoria.belongsTo(db.Asesor, { foreignKey: 'asesorId', as: 'asesor' });
      HistorialAsesoria.belongsTo(db.Trabajo, { foreignKey: 'trabajoCodigo', as: 'trabajo' });
    }
  }

  HistorialAsesoria.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      trabajoCodigo: { type: DataTypes.STRING(20), allowNull: false },
      asesorId: { type: DataTypes.STRING(20), allowNull: false },
      motivo: { type: DataTypes.TEXT, allowNull: false },
      fecha: { type: DataTypes.DATEONLY, allowNull: false },
    },
    {
      sequelize,
      modelName: 'HistorialAsesoria',
      tableName: 'historial_asesorias',
      timestamps: true,
      createdAt: 'creadoEn',
      updatedAt: false,
    }
  );

  return HistorialAsesoria;
};
