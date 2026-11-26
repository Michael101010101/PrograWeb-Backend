// PROVISIONAL, dueño HU-4 (entrega) y HU-5 (revisión), se descarta cuando el dueño suba la suya
'use strict';
const { Model } = require('sequelize');
const { randomBytes } = require('node:crypto');

module.exports = (sequelize, DataTypes) => {
  class Avance extends Model {
    static associate(db) {
      Avance.belongsTo(db.Entregable, { foreignKey: 'entregableId', as: 'entregable' });
      Avance.belongsTo(db.Usuario, { foreignKey: 'revisadoPor', as: 'revisor' });
    }
  }

  Avance.init(
    {
      id: { type: DataTypes.STRING(20), primaryKey: true, defaultValue: () => `av-${randomBytes(5).toString('hex')}` },
      entregableId: { type: DataTypes.STRING(20), allowNull: false },
      version: { type: DataTypes.INTEGER, allowNull: false, validate: { isInt: true, min: 1 } },
      enlace: { type: DataTypes.STRING(300), allowNull: false },
      descripcion: DataTypes.TEXT,
      fechaEntrega: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      revisadoPor: DataTypes.STRING(20),
      fechaRevision: DataTypes.DATE,
      comentarios: DataTypes.TEXT,
      // NULL = sin revisar
      resultado: { type: DataTypes.STRING(30), validate: { isIn: [['aprobado', 'observado']] } },
    },
    {
      sequelize,
      modelName: 'Avance',
      tableName: 'avances',
      timestamps: true,
      createdAt: 'creadoEn',
      updatedAt: 'actualizadoEn',
    }
  );

  return Avance;
};
