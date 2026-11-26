// PROVISIONAL, dueño HU-3, se descarta cuando el dueño suba la suya
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PerfilAsesor extends Model {
    static associate(db) {
      PerfilAsesor.belongsTo(db.Usuario, { foreignKey: 'asesorId', as: 'asesor' });
    }
  }

  PerfilAsesor.init(
    {
      asesorId: { type: DataTypes.STRING(20), primaryKey: true },
      experiencia: DataTypes.TEXT,
      cupoMaximo: { type: DataTypes.INTEGER, allowNull: false, validate: { isInt: true, min: 1 } },
    },
    {
      sequelize,
      modelName: 'PerfilAsesor',
      tableName: 'perfiles_asesor',
      timestamps: true,
      createdAt: 'creadoEn',
      updatedAt: 'actualizadoEn',
    }
  );

  return PerfilAsesor;
};
