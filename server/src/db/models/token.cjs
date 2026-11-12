'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Token extends Model {
    static associate(models) {
      Token.belongsTo(models.Usuario, { foreignKey: 'usuarioId', as: 'usuario' });
    }
  }

  Token.init(
    {
      token: { type: DataTypes.STRING(64), primaryKey: true },
      tipo: { type: DataTypes.STRING(20), allowNull: false, validate: { isIn: [['verificacion', 'recuperacion']] } },
      usuarioId: { type: DataTypes.STRING(20), allowNull: false },
      venceEn: { type: DataTypes.DATE, allowNull: false },
      usado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { sequelize, modelName: 'Token', tableName: 'tokens', timestamps: true, createdAt: 'creadoEn', updatedAt: false }
  );

  return Token;
};
