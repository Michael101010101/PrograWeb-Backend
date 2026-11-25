'use strict';
const { Model } = require('sequelize');

// HU-4 · Entregable del plan. No tiene campo estado: se calcula desde sus avances.
module.exports = (sequelize, DataTypes) => {
  class Entregable extends Model {
    static associate(db) {
      Entregable.hasMany(db.Avance, { foreignKey: 'entregableId', as: 'avances' });
      Entregable.hasMany(db.Ampliacion, { foreignKey: 'entregableId', as: 'ampliaciones' });
    }
  }

  Entregable.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      trabajoCodigo: { type: DataTypes.STRING(20), allowNull: false },
      orden: { type: DataTypes.INTEGER, allowNull: false },
      nombre: { type: DataTypes.STRING(100), allowNull: false },
      descripcion: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
      peso: { type: DataTypes.INTEGER, allowNull: false },
      obligatorio: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      fechaLimite: { type: DataTypes.DATEONLY, allowNull: false },
    },
    {
      sequelize,
      modelName: 'Entregable',
      tableName: 'entregables',
      timestamps: true,
      createdAt: 'creadoEn',
      updatedAt: 'actualizadoEn',
    }
  );

  return Entregable;
};
