'use strict';
const { randomBytes } = require('crypto');
const { Model } = require('sequelize');

// HU-4 · Entregable del plan. estado: pendiente | entregado | entregado_con_retraso | observado | aprobado.
module.exports = (sequelize, DataTypes) => {
  class Entregable extends Model {
    static associate(db) {
      Entregable.belongsTo(db.Trabajo, { foreignKey: 'trabajoId', as: 'trabajo' }); // HU-2
      Entregable.hasMany(db.Avance, { foreignKey: 'entregableId', as: 'avances' });
      Entregable.hasMany(db.Ampliacion, { foreignKey: 'entregableId', as: 'ampliaciones' });
    }
  }

  Entregable.init(
    {
      id: { type: DataTypes.STRING(20), primaryKey: true, defaultValue: () => `e-${randomBytes(5).toString('hex')}` },
      trabajoId: { type: DataTypes.STRING(20), allowNull: false },
      orden: { type: DataTypes.INTEGER, allowNull: false },
      nombre: { type: DataTypes.STRING(100), allowNull: false },
      descripcion: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
      peso: { type: DataTypes.INTEGER, allowNull: false },
      obligatorio: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      fechaLimite: { type: DataTypes.DATEONLY, allowNull: false },
      estado: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'pendiente' },
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
