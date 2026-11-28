'use strict';
const { Model } = require('sequelize');

// HU-6 · Salas donde se programan las sustentaciones presenciales (tabla hu6.salas).
module.exports = (sequelize, DataTypes) => {
  class Sala extends Model {
    static associate(db) {
      Sala.hasMany(db.Sustentacion, { foreignKey: 'salaId', as: 'sustentaciones' });
      Sala.hasMany(db.ReservaSala, { foreignKey: 'salaId', as: 'reservas' });
    }
  }

  Sala.init(
    {
      id: { type: DataTypes.STRING(24), primaryKey: true },
      pabellon: { type: DataTypes.STRING(80), allowNull: false },
      ubicacion: { type: DataTypes.STRING(180), allowNull: false },
      asientos: { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, modelName: 'Sala', tableName: 'salas', schema: 'hu6', timestamps: false }
  );

  return Sala;
};
