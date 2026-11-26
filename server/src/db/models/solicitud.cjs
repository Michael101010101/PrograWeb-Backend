'use strict';
const { Model } = require('sequelize');
const { randomBytes } = require('node:crypto');

module.exports = (sequelize, DataTypes) => {
  class Solicitud extends Model {
    static associate(db) {
      Solicitud.belongsTo(db.Asesor, { foreignKey: 'asesorId', as: 'asesor' });
      Solicitud.belongsTo(db.Trabajo, { foreignKey: 'trabajoCodigo', as: 'trabajo' });
    }
  }

  Solicitud.init(
    {
      id: { type: DataTypes.STRING(30), primaryKey: true, defaultValue: () => `s-${randomBytes(5).toString('hex')}` },
      asesorId: { type: DataTypes.STRING(20), allowNull: false },
      trabajoCodigo: { type: DataTypes.STRING(20), allowNull: false },
      estado: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pendiente',
        validate: { isIn: [['pendiente', 'aceptada', 'rechazada', 'retirada']] },
      },
      fecha: { type: DataTypes.DATEONLY, allowNull: false },
      equipo: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      mensaje: { type: DataTypes.TEXT, allowNull: false },
      motivo: DataTypes.TEXT,
      resueltaEl: DataTypes.DATEONLY,
    },
    {
      sequelize,
      modelName: 'Solicitud',
      tableName: 'solicitudes',
      timestamps: true,
      createdAt: 'creadoEn',
      updatedAt: 'actualizadoEn',
    }
  );

  return Solicitud;
};
