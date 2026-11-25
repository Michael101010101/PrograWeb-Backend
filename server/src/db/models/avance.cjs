'use strict';
const { randomBytes } = require('crypto');
const { Model } = require('sequelize');

// Versión que sube el equipo (HU-4). La HU-5 completa fechaRevision, resultado, comentario y revisorId.
module.exports = (sequelize, DataTypes) => {
  class Avance extends Model {
    static associate(db) {
      Avance.belongsTo(db.Entregable, { foreignKey: 'entregableId', as: 'entregable' });
      Avance.belongsTo(db.Usuario, { foreignKey: 'revisorId', as: 'revisor' });
    }
  }

  Avance.init(
    {
      id: { type: DataTypes.STRING(20), primaryKey: true, defaultValue: () => `av-${randomBytes(5).toString('hex')}` },
      entregableId: { type: DataTypes.STRING(20), allowNull: false },
      version: { type: DataTypes.INTEGER, allowNull: false },
      fechaEntrega: { type: DataTypes.DATEONLY, allowNull: false },
      diasRetraso: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      enlace: { type: DataTypes.STRING(500), allowNull: false },
      descripcion: { type: DataTypes.TEXT, allowNull: false },
      fechaRevision: DataTypes.DATEONLY,
      resultado: DataTypes.STRING(20), // null = en revisión
      comentario: DataTypes.TEXT,
      revisorId: DataTypes.STRING(20),
    },
    { sequelize, modelName: 'Avance', tableName: 'avances', timestamps: true, createdAt: 'creadoEn', updatedAt: false }
  );

  return Avance;
};
