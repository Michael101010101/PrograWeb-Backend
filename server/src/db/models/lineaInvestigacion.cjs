'use strict';
const { Model } = require('sequelize');
const { randomBytes } = require('node:crypto');

module.exports = (sequelize, DataTypes) => {
  class LineaInvestigacion extends Model {
    static associate(db) {
      LineaInvestigacion.hasMany(db.Trabajo, { foreignKey: 'lineaId', as: 'trabajos' });
      LineaInvestigacion.hasMany(db.LineaAsesor, { foreignKey: 'lineaId', as: 'asesores' });
    }
  }

  LineaInvestigacion.init(
    {
      id: { type: DataTypes.STRING(20), primaryKey: true, defaultValue: () => `li-${randomBytes(5).toString('hex')}` },
      nombre: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      activa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'LineaInvestigacion',
      tableName: 'lineas_investigacion',
      timestamps: true,
      createdAt: 'creadoEn',
      updatedAt: 'actualizadoEn',
    }
  );

  return LineaInvestigacion;
};
