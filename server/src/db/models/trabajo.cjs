'use strict';
const { Model } = require('sequelize');
const { randomBytes } = require('node:crypto');

module.exports = (sequelize, DataTypes) => {
  class Trabajo extends Model {
    static associate(db) {
      Trabajo.hasMany(db.TrabajoIntegrante, { foreignKey: 'trabajoId', as: 'integrantes' });
      Trabajo.hasMany(db.TrabajoHistorial, { foreignKey: 'trabajoId', as: 'historial' });
      Trabajo.belongsTo(db.LineaInvestigacion, { foreignKey: 'lineaId', as: 'lineaInvestigacion' });
    }
  }

  Trabajo.init(
    {
      id: { type: DataTypes.STRING(20), primaryKey: true, defaultValue: () => `t-${randomBytes(5).toString('hex')}` },
      codigo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      titulo: { type: DataTypes.STRING(160), allowNull: false },
      lineaId: { type: DataTypes.STRING(20), allowNull: false },
      carrera: DataTypes.STRING(60),
      resumen: { type: DataTypes.TEXT, allowNull: false },
      objetivos: { type: DataTypes.TEXT, allowNull: false },
      palabrasClave: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      estado: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'propuesta',
        validate: { isIn: [['propuesta', 'en_desarrollo', 'concluido', 'desistido']] },
      },
      asesor: DataTypes.JSONB,
      plan: DataTypes.JSONB,
      sustentacion: DataTypes.JSONB,
      periodoId: { type: DataTypes.INTEGER, allowNull: false },
      fechaRegistro: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      cerradoEn: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'Trabajo',
      tableName: 'trabajos',
      timestamps: true,
      createdAt: false,
      updatedAt: 'actualizadoEn',
    }
  );

  return Trabajo;
};