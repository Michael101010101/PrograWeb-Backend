'use strict';
const { Model } = require('sequelize');

// HU-6 · Historial de reprogramaciones de una sustentación (tabla hu6.historial_reprogramaciones).
module.exports = (sequelize, DataTypes) => {
  class Reprogramacion extends Model {
    static associate(db) {
      Reprogramacion.belongsTo(db.Sustentacion, { foreignKey: 'sustentacionId', as: 'sustentacion' });
      Reprogramacion.belongsTo(db.Sala, { foreignKey: 'salaAnterior', as: 'salaPrevia' });
    }
  }

  Reprogramacion.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      sustentacionId: { type: DataTypes.STRING(24), allowNull: false, field: 'sustentacion_id' },
      fechaAnterior: { type: DataTypes.DATEONLY, allowNull: false, field: 'fecha_anterior' },
      horaAnterior: { type: DataTypes.TIME, allowNull: false, field: 'hora_anterior' },
      salaAnterior: { type: DataTypes.STRING(24), field: 'sala_anterior' },
      motivo: { type: DataTypes.TEXT, allowNull: false, validate: { len: [10, 2000] } },
      registradoEl: { type: DataTypes.DATEONLY, allowNull: false, field: 'registrado_el' },
    },
    { sequelize, modelName: 'Reprogramacion', tableName: 'historial_reprogramaciones', schema: 'hu6', timestamps: false }
  );

  return Reprogramacion;
};
