'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Periodo extends Model {
    static associate(db) {
      Periodo.hasMany(db.Etapa, { foreignKey: 'periodoId', as: 'etapas' });
    }
  }

  Periodo.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      semestre: { type: DataTypes.STRING(10), allowNull: false, unique: true },
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      correoContacto: { type: DataTypes.STRING(120), allowNull: false },
      anexo: DataTypes.STRING(10),
      mesaAyuda: DataTypes.STRING(10),
      direccion: DataTypes.STRING(200),
    },
    {
      sequelize,
      modelName: 'Periodo',
      tableName: 'periodos',
      timestamps: true,
      createdAt: 'creadoEn',
      updatedAt: 'actualizadoEn',
    }
  );

  return Periodo;
};
