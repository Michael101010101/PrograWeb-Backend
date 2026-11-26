// PROVISIONAL, dueño HU-3, se descarta cuando el dueño suba la suya
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LineaAsesor extends Model {
    static associate(db) {
      LineaAsesor.belongsTo(db.Usuario, { foreignKey: 'asesorId', as: 'asesor' });
      LineaAsesor.belongsTo(db.LineaInvestigacion, { foreignKey: 'lineaId', as: 'linea' });
    }
  }

  LineaAsesor.init(
    {
      asesorId: { type: DataTypes.STRING(20), primaryKey: true },
      lineaId: { type: DataTypes.STRING(20), primaryKey: true },
    },
    {
      sequelize,
      modelName: 'LineaAsesor',
      tableName: 'lineas_asesor',
      timestamps: true,
      createdAt: 'creadoEn',
      updatedAt: 'actualizadoEn',
    }
  );

  return LineaAsesor;
};
