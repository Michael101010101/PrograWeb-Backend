'use strict';
const { Model } = require('sequelize');
const { randomBytes } = require('node:crypto');

module.exports = (sequelize, DataTypes) => {
  class Mensaje extends Model {
    static associate(db) {
      Mensaje.belongsTo(db.Usuario, { foreignKey: 'remitenteId', as: 'remitente' });
      Mensaje.belongsTo(db.Usuario, { foreignKey: 'destinatarioId', as: 'destinatario' });
      Mensaje.belongsTo(db.Trabajo, { foreignKey: 'trabajoId', as: 'trabajo' });
    }
  }

  Mensaje.init(
    {
      id: { type: DataTypes.STRING(20), primaryKey: true, defaultValue: () => `m-${randomBytes(5).toString('hex')}` },
      remitenteId: { type: DataTypes.STRING(20), allowNull: false },
      destinatarioId: { type: DataTypes.STRING(20), allowNull: false },
      trabajoId: DataTypes.STRING(20),
      asunto: { type: DataTypes.STRING(120), allowNull: false },
      cuerpo: { type: DataTypes.TEXT, allowNull: false },
      leido: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      sequelize,
      modelName: 'Mensaje',
      tableName: 'mensajes',
      timestamps: true,
      createdAt: 'creadoEn',
      updatedAt: 'actualizadoEn',
    }
  );

  return Mensaje;
};
