'use strict';
const { Model } = require('sequelize');
const { randomBytes } = require('node:crypto');

// HU-7 · Historial de cambios de cupo. El cupo vigente está en asesores.cupoMaximo (HU-3).
module.exports = (sequelize, DataTypes) => {
  class CupoAsesor extends Model {
    static associate(db) {
      CupoAsesor.belongsTo(db.Asesor, { foreignKey: 'asesorId', as: 'asesor' });
      CupoAsesor.belongsTo(db.Usuario, { foreignKey: 'modificadoPor', as: 'modificador' });
      CupoAsesor.belongsTo(db.Periodo, { foreignKey: 'periodoId', as: 'periodo' });
    }
  }

  CupoAsesor.init(
    {
      id: { type: DataTypes.STRING(20), primaryKey: true, defaultValue: () => `ca-${randomBytes(5).toString('hex')}` },
      asesorId: { type: DataTypes.STRING(20), allowNull: false },
      periodoId: { type: DataTypes.INTEGER, allowNull: false },
      cupoAnterior: { type: DataTypes.INTEGER, allowNull: false, validate: { isInt: true, min: 1 } },
      cupoMaximo: { type: DataTypes.INTEGER, allowNull: false, validate: { isInt: true, min: 1 } },
      motivo: { type: DataTypes.TEXT, allowNull: false },
      modificadoPor: { type: DataTypes.STRING(20), allowNull: false },
    },
    {
      sequelize,
      modelName: 'CupoAsesor',
      tableName: 'cupos_asesor',
      timestamps: true,
      createdAt: 'creadoEn',
      updatedAt: false,
    }
  );

  return CupoAsesor;
};
