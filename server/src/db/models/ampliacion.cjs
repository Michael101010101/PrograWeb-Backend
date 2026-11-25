'use strict';
const { Model } = require('sequelize');

// HU-4 · Solicitud de ampliación de la fecha límite (pendiente → aceptada | rechazada).
module.exports = (sequelize, DataTypes) => {
  class Ampliacion extends Model {
    static associate(db) {
      Ampliacion.belongsTo(db.Entregable, { foreignKey: 'entregableId', as: 'entregable' });
    }
  }

  Ampliacion.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      entregableId: { type: DataTypes.INTEGER, allowNull: false },
      nuevaFecha: { type: DataTypes.DATEONLY, allowNull: false },
      motivo: { type: DataTypes.TEXT, allowNull: false },
      fecha: { type: DataTypes.DATEONLY, allowNull: false },
      estado: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pendiente' },
      respondidaEn: DataTypes.DATE,
    },
    { sequelize, modelName: 'Ampliacion', tableName: 'ampliaciones', timestamps: false }
  );

  return Ampliacion;
};
