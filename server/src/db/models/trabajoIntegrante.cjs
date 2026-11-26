'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TrabajoIntegrante extends Model {
    static associate(db) {
      TrabajoIntegrante.belongsTo(db.Trabajo, { foreignKey: 'trabajoId', as: 'trabajo' });
      TrabajoIntegrante.belongsTo(db.Usuario, { foreignKey: 'estudianteId', as: 'usuario' });
    }
  }

  TrabajoIntegrante.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      trabajoId: { type: DataTypes.STRING(20), allowNull: false },
      estudianteId: { type: DataTypes.STRING(20), allowNull: false },
      esResponsable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { sequelize, modelName: 'TrabajoIntegrante', tableName: 'integrantes_trabajo', timestamps: false }
  );

  return TrabajoIntegrante;
};