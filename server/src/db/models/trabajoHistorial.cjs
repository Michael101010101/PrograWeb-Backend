'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TrabajoHistorial extends Model {
    static associate(db) {
      TrabajoHistorial.belongsTo(db.Trabajo, { foreignKey: 'trabajoId', as: 'trabajo' });
      TrabajoHistorial.belongsTo(db.Usuario, { foreignKey: 'usuarioId', as: 'usuario' });
    }
  }

  TrabajoHistorial.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      trabajoId: { type: DataTypes.STRING(20), allowNull: false },
      de: DataTypes.STRING(20),
      a: { type: DataTypes.STRING(20), allowNull: false },
      motivo: { type: DataTypes.TEXT, allowNull: false },
      fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      usuarioId: DataTypes.STRING(20),
    },
    { sequelize, modelName: 'TrabajoHistorial', tableName: 'trabajo_historial', timestamps: false }
  );

  return TrabajoHistorial;
};