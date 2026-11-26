// PROVISIONAL, dueño HU-2, se descarta cuando el dueño suba la suya
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class IntegranteTrabajo extends Model {
    static associate(db) {
      IntegranteTrabajo.belongsTo(db.Trabajo, { foreignKey: 'trabajoId', as: 'trabajo' });
      IntegranteTrabajo.belongsTo(db.Usuario, { foreignKey: 'estudianteId', as: 'estudiante' });
    }
  }

  IntegranteTrabajo.init(
    {
      trabajoId: { type: DataTypes.STRING(20), primaryKey: true },
      estudianteId: { type: DataTypes.STRING(20), primaryKey: true },
      esResponsable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      sequelize,
      modelName: 'IntegranteTrabajo',
      tableName: 'integrantes_trabajo',
      timestamps: true,
      createdAt: 'creadoEn',
      updatedAt: false,
    }
  );

  return IntegranteTrabajo;
};
