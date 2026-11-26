// PROVISIONAL, dueño HU-3, se descarta cuando el dueño suba la suya
'use strict';
const { Model } = require('sequelize');
const { randomBytes } = require('node:crypto');

module.exports = (sequelize, DataTypes) => {
  class Asesoria extends Model {
    static associate(db) {
      Asesoria.belongsTo(db.Trabajo, { foreignKey: 'trabajoId', as: 'trabajo' });
      Asesoria.belongsTo(db.Usuario, { foreignKey: 'asesorId', as: 'asesor' });
    }
  }

  Asesoria.init(
    {
      id: { type: DataTypes.STRING(20), primaryKey: true, defaultValue: () => `as-${randomBytes(5).toString('hex')}` },
      trabajoId: { type: DataTypes.STRING(20), allowNull: false },
      asesorId: { type: DataTypes.STRING(20), allowNull: false },
      estado: {
        type: DataTypes.STRING(30),
        allowNull: false,
        validate: { isIn: [['pendiente', 'aceptada', 'rechazada', 'finalizada']] },
      },
      mensaje: DataTypes.TEXT,
      motivoRechazo: DataTypes.TEXT,
      fechaSolicitud: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      fechaInicio: DataTypes.DATEONLY,
      fechaFin: DataTypes.DATEONLY,
      motivoFin: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: 'Asesoria',
      tableName: 'asesorias',
      timestamps: true,
      createdAt: 'creadoEn',
      updatedAt: 'actualizadoEn',
    }
  );

  return Asesoria;
};
