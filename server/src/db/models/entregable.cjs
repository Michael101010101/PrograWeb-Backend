// PROVISIONAL, dueño HU-4, se descarta cuando el dueño suba la suya
'use strict';
const { Model } = require('sequelize');
const { randomBytes } = require('node:crypto');

module.exports = (sequelize, DataTypes) => {
  class Entregable extends Model {
    static associate(db) {
      Entregable.belongsTo(db.Trabajo, { foreignKey: 'trabajoId', as: 'trabajo' });
      Entregable.hasMany(db.Avance, { foreignKey: 'entregableId', as: 'avances' });
    }
  }

  Entregable.init(
    {
      id: { type: DataTypes.STRING(20), primaryKey: true, defaultValue: () => `e-${randomBytes(5).toString('hex')}` },
      trabajoId: { type: DataTypes.STRING(20), allowNull: false },
      nombre: { type: DataTypes.STRING(120), allowNull: false },
      descripcion: DataTypes.TEXT,
      fechaLimite: { type: DataTypes.DATE, allowNull: false },
      peso: { type: DataTypes.DECIMAL(5, 2), allowNull: false, validate: { min: 0.01, max: 100 } },
      obligatorio: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      estado: {
        type: DataTypes.STRING(30),
        allowNull: false,
        validate: { isIn: [['pendiente', 'entregado', 'entregado_con_retraso', 'observado', 'aprobado']] },
      },
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
