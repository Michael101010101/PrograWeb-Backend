'use strict';
const { Model } = require('sequelize');

// HU-6 · Bloques de sala ocupados por otros eventos (tabla hu6.reservas_sala).
module.exports = (sequelize, DataTypes) => {
  class ReservaSala extends Model {
    static associate(db) {
      ReservaSala.belongsTo(db.Sala, { foreignKey: 'salaId', as: 'sala' });
    }
  }

  ReservaSala.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      salaId: { type: DataTypes.STRING(24), allowNull: false, field: 'sala_id' },
      fecha: { type: DataTypes.DATEONLY, allowNull: false },
      hora: { type: DataTypes.TIME, allowNull: false },
      motivo: { type: DataTypes.TEXT, allowNull: false },
    },
    { sequelize, modelName: 'ReservaSala', tableName: 'reservas_sala', schema: 'hu6', timestamps: false }
  );

  return ReservaSala;
};
