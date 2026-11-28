'use strict';
const { Model } = require('sequelize');

// HU-6 · Docentes que no pueden ser jurado de un trabajo y el motivo (tabla hu6.conflictos_trabajo).
module.exports = (sequelize, DataTypes) => {
  class ConflictoTrabajo extends Model {
    static associate(db) {
      ConflictoTrabajo.belongsTo(db.Trabajo, { foreignKey: 'trabajoId', as: 'trabajo' });
      ConflictoTrabajo.belongsTo(db.Docente, { foreignKey: 'docenteId', as: 'docente' });
    }
  }

  ConflictoTrabajo.init(
    {
      trabajoId: { type: DataTypes.STRING(20), primaryKey: true, field: 'trabajo_id' },
      docenteId: { type: DataTypes.STRING(24), primaryKey: true, field: 'docente_id' },
      motivo: { type: DataTypes.TEXT, allowNull: false },
    },
    { sequelize, modelName: 'ConflictoTrabajo', tableName: 'conflictos_trabajo', schema: 'hu6', timestamps: false }
  );

  return ConflictoTrabajo;
};
