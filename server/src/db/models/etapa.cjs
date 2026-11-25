'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Etapa extends Model {
    static associate(db) {
      Etapa.belongsTo(db.Periodo, { foreignKey: 'periodoId', as: 'periodo' });
    }
  }

  Etapa.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      periodoId: { type: DataTypes.INTEGER, allowNull: false },
      numero: { type: DataTypes.INTEGER, allowNull: false },
      nombre: { type: DataTypes.STRING(100), allowNull: false },
      titulo: { type: DataTypes.STRING(100), allowNull: false },
      responsable: { type: DataTypes.STRING(60), allowNull: false },
      descripcion: { type: DataTypes.TEXT, allowNull: false },
      inicio: { type: DataTypes.DATEONLY, allowNull: false },
      fin: { type: DataTypes.DATEONLY, allowNull: false },
    },
    { sequelize, modelName: 'Etapa', tableName: 'etapas', timestamps: false }
  );

  return Etapa;
};
