'use strict';
const { Model } = require('sequelize');

// HU-6 · Nota de un criterio dentro del acta (tabla hu6.calificaciones).
module.exports = (sequelize, DataTypes) => {
  class Calificacion extends Model {
    static associate(db) {
      Calificacion.belongsTo(db.Acta, { foreignKey: 'sustentacionId', as: 'acta' });
    }
  }

  Calificacion.init(
    {
      sustentacionId: { type: DataTypes.STRING(24), primaryKey: true, field: 'sustentacion_id' },
      criterioId: {
        type: DataTypes.STRING(24),
        primaryKey: true,
        field: 'criterio_id',
        validate: { isIn: [['rigor', 'resultados', 'informe', 'exposicion']] },
      },
      nota: { type: DataTypes.SMALLINT, allowNull: false, validate: { min: 0, max: 20 } },
    },
    { sequelize, modelName: 'Calificacion', tableName: 'calificaciones', schema: 'hu6', timestamps: false }
  );

  return Calificacion;
};
