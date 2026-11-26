// PROVISIONAL, dueño HU-6, se descarta cuando el dueño suba la suya
'use strict';
const { Model } = require('sequelize');
const { randomBytes } = require('node:crypto');

module.exports = (sequelize, DataTypes) => {
  class Sustentacion extends Model {
    static associate(db) {
      Sustentacion.belongsTo(db.Trabajo, { foreignKey: 'trabajoId', as: 'trabajo' });
      Sustentacion.hasMany(db.JuradoSustentacion, { foreignKey: 'sustentacionId', as: 'jurados' });
    }
  }

  Sustentacion.init(
    {
      id: { type: DataTypes.STRING(20), primaryKey: true, defaultValue: () => `s-${randomBytes(5).toString('hex')}` },
      trabajoId: { type: DataTypes.STRING(20), allowNull: false },
      fecha: { type: DataTypes.DATEONLY, allowNull: false },
      hora: { type: DataTypes.TIME, allowNull: false },
      sala: DataTypes.STRING(60),
      modalidad: {
        type: DataTypes.STRING(30),
        allowNull: false,
        validate: { isIn: [['presencial', 'virtual']] },
      },
      calificacion: { type: DataTypes.DECIMAL(4, 2), validate: { min: 0, max: 20 } },
      estado: {
        type: DataTypes.STRING(30),
        allowNull: false,
        validate: { isIn: [['programada', 'realizada', 'reprogramada', 'desaprobada']] },
      },
    },
    {
      sequelize,
      modelName: 'Sustentacion',
      tableName: 'sustentaciones',
      timestamps: true,
      createdAt: 'creadoEn',
      updatedAt: 'actualizadoEn',
    }
  );

  return Sustentacion;
};
