'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Invitacion extends Model {
    static associate(models) {
      Invitacion.belongsTo(models.Usuario, { foreignKey: 'invitadoPor', as: 'invitador' });
      Invitacion.belongsTo(models.Usuario, { foreignKey: 'usadaPor', as: 'usuarioCreado' });
    }
  }

  Invitacion.init(
    {
      codigo: { type: DataTypes.STRING(15), primaryKey: true },
      correo: { type: DataTypes.STRING(120), allowNull: false },
      invitadoPor: DataTypes.STRING(20),
      venceEn: { type: DataTypes.DATE, allowNull: false },
      usada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      revocada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      usadaPor: DataTypes.STRING(20),
      usadaEn: DataTypes.DATE,
    },
    { sequelize, modelName: 'Invitacion', tableName: 'invitaciones', timestamps: true, createdAt: 'creadaEn', updatedAt: false }
  );

  return Invitacion;
};
