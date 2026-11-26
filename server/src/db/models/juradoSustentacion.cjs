// PROVISIONAL, dueño HU-6, se descarta cuando el dueño suba la suya
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class JuradoSustentacion extends Model {
    static associate(db) {
      JuradoSustentacion.belongsTo(db.Sustentacion, { foreignKey: 'sustentacionId', as: 'sustentacion' });
      JuradoSustentacion.belongsTo(db.Usuario, { foreignKey: 'juradoId', as: 'jurado' });
    }
  }

  JuradoSustentacion.init(
    {
      sustentacionId: { type: DataTypes.STRING(20), primaryKey: true },
      juradoId: { type: DataTypes.STRING(20), primaryKey: true },
      cargo: DataTypes.STRING(30), // valores por definir con HU-6
    },
    {
      sequelize,
      modelName: 'JuradoSustentacion',
      tableName: 'jurados_sustentacion',
      timestamps: true,
      createdAt: 'creadoEn',
      updatedAt: 'actualizadoEn',
    }
  );

  return JuradoSustentacion;
};
