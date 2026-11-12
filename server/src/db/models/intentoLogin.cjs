'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class IntentoLogin extends Model {}

  IntentoLogin.init(
    {
      correo: { type: DataTypes.STRING(120), primaryKey: true },
      fallidos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      bloqueadoHasta: DataTypes.DATE,
    },
    { sequelize, modelName: 'IntentoLogin', tableName: 'intentos_login', timestamps: false }
  );

  return IntentoLogin;
};
