'use strict';
const { randomBytes } = require('crypto');
const { Model } = require('sequelize');

// HU-4 · Requisito administrativo del periodo (por ejemplo, la entrega del informe impreso).
module.exports = (sequelize, DataTypes) => {
  class Requisito extends Model {
    static associate(db) {
      Requisito.belongsTo(db.Periodo, { foreignKey: 'periodoId', as: 'periodo' });
    }
  }

  Requisito.init(
    {
      id: { type: DataTypes.STRING(20), primaryKey: true, defaultValue: () => `r-${randomBytes(5).toString('hex')}` },
      periodoId: { type: DataTypes.INTEGER, allowNull: false },
      nombre: { type: DataTypes.STRING(100), allowNull: false },
      detalle: { type: DataTypes.STRING(200), allowNull: false },
      fechaLimite: { type: DataTypes.DATEONLY, allowNull: false },
      pasos: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    },
    { sequelize, modelName: 'Requisito', tableName: 'requisitos', timestamps: false }
  );

  return Requisito;
};
