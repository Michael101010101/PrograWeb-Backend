// PROVISIONAL, dueño HU-2, se descarta cuando el dueño suba la suya
'use strict';
const { Model } = require('sequelize');
const { randomBytes } = require('node:crypto');

module.exports = (sequelize, DataTypes) => {
  class Trabajo extends Model {
    static associate(db) {
      Trabajo.belongsTo(db.LineaInvestigacion, { foreignKey: 'lineaId', as: 'linea' });
      Trabajo.belongsTo(db.Periodo, { foreignKey: 'periodoId', as: 'periodo' });
      Trabajo.hasMany(db.IntegranteTrabajo, { foreignKey: 'trabajoId', as: 'integrantes' });
      Trabajo.hasMany(db.Asesoria, { foreignKey: 'trabajoId', as: 'asesorias' });
      Trabajo.hasMany(db.Entregable, { foreignKey: 'trabajoId', as: 'entregables' });
      Trabajo.hasMany(db.Sustentacion, { foreignKey: 'trabajoId', as: 'sustentaciones' });
      Trabajo.hasMany(db.Mensaje, { foreignKey: 'trabajoId', as: 'mensajes' });
    }
  }

  Trabajo.init(
    {
      id: { type: DataTypes.STRING(20), primaryKey: true, defaultValue: () => `t-${randomBytes(5).toString('hex')}` },
      titulo: { type: DataTypes.STRING(200), allowNull: false },
      lineaId: { type: DataTypes.STRING(20), allowNull: false },
      resumen: { type: DataTypes.TEXT, allowNull: false },
      objetivos: { type: DataTypes.TEXT, allowNull: false },
      palabrasClave: { type: DataTypes.ARRAY(DataTypes.STRING(40)), allowNull: false, defaultValue: [] },
      estado: {
        type: DataTypes.STRING(30),
        allowNull: false,
        validate: { isIn: [['propuesta', 'en_desarrollo', 'concluido', 'desistido']] },
      },
      motivoEstado: DataTypes.TEXT,
      carrera: { type: DataTypes.STRING(60), allowNull: false },
      periodoId: { type: DataTypes.INTEGER, allowNull: false },
      fechaRegistro: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: 'Trabajo',
      tableName: 'trabajos',
      timestamps: true,
      createdAt: 'creadoEn',
      updatedAt: 'actualizadoEn',
    }
  );

  return Trabajo;
};
