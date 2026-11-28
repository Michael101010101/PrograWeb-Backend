'use strict';
const { Model } = require('sequelize');

// HU-6 · Acta de sustentación (tabla hu6.actas). La nota final vive en Sustentacion.calificacion.
module.exports = (sequelize, DataTypes) => {
  class Acta extends Model {
    static associate(db) {
      Acta.belongsTo(db.Sustentacion, { foreignKey: 'sustentacionId', as: 'sustentacion' });
      Acta.hasMany(db.Calificacion, { foreignKey: 'sustentacionId', as: 'notas', onDelete: 'CASCADE' });
    }
  }

  Acta.init(
    {
      sustentacionId: { type: DataTypes.STRING(24), primaryKey: true, field: 'sustentacion_id' },
      resultado: { type: DataTypes.STRING(30), validate: { isIn: [['Aprobado', 'Aprobado con observaciones', 'Desaprobado']] } },
      observaciones: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
      registrada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      registradaEl: { type: DataTypes.DATEONLY, field: 'registrada_el' },
      registradaHora: { type: DataTypes.TIME, field: 'registrada_hora' },
    },
    { sequelize, modelName: 'Acta', tableName: 'actas', schema: 'hu6', timestamps: false }
  );

  return Acta;
};
