'use strict';
const { Model } = require('sequelize');

// HU-6 · Miembros del jurado de una sustentación (tabla hu6.jurados).
module.exports = (sequelize, DataTypes) => {
  class Jurado extends Model {
    static associate(db) {
      Jurado.belongsTo(db.Sustentacion, { foreignKey: 'sustentacionId', as: 'sustentacion' });
      Jurado.belongsTo(db.Docente, { foreignKey: 'docenteId', as: 'docente' });
    }
  }

  Jurado.init(
    {
      sustentacionId: { type: DataTypes.STRING(24), primaryKey: true, field: 'sustentacion_id' },
      docenteId: { type: DataTypes.STRING(24), primaryKey: true, field: 'docente_id' },
      presidente: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { sequelize, modelName: 'Jurado', tableName: 'jurados', schema: 'hu6', timestamps: false }
  );

  return Jurado;
};
