'use strict';
const { Model } = require('sequelize');

// HU-4 · Versión que sube el equipo. La HU-5 completa revisadoEn, comentario y revisorId.
module.exports = (sequelize, DataTypes) => {
  class Avance extends Model {
    static associate(db) {
      Avance.belongsTo(db.Entregable, { foreignKey: 'entregableId', as: 'entregable' });
      Avance.belongsTo(db.Usuario, { foreignKey: 'revisorId', as: 'revisor' });
    }
  }

  Avance.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      entregableId: { type: DataTypes.INTEGER, allowNull: false },
      version: { type: DataTypes.INTEGER, allowNull: false },
      fecha: { type: DataTypes.DATEONLY, allowNull: false },
      diasRetraso: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      estado: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'en_revision' },
      enlace: { type: DataTypes.STRING(500), allowNull: false },
      descripcion: { type: DataTypes.TEXT, allowNull: false },
      revisadoEn: DataTypes.DATEONLY,
      comentario: DataTypes.TEXT,
      revisorId: DataTypes.STRING(20),
    },
    { sequelize, modelName: 'Avance', tableName: 'avances', timestamps: true, createdAt: 'creadoEn', updatedAt: false }
  );

  return Avance;
};
