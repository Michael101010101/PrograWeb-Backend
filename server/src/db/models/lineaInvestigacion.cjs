'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LineaInvestigacion extends Model {}

  LineaInvestigacion.init(
    {
      id: { type: DataTypes.STRING(20), primaryKey: true },
      nombre: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    },
    { sequelize, modelName: 'LineaInvestigacion', tableName: 'lineas_investigacion', timestamps: false }
  );

  return LineaInvestigacion;
};