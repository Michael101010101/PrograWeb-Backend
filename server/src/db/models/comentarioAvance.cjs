'use strict';
const { randomBytes } = require('crypto');
const { Model } = require('sequelize');

// HU-5 · Conversación sobre un avance: el asesor comenta y el estudiante responde.
// rol: asesor | estudiante. respuestaAId apunta al comentario al que se responde.
module.exports = (sequelize, DataTypes) => {
  class ComentarioAvance extends Model {
    static associate(db) {
      ComentarioAvance.belongsTo(db.Avance, { foreignKey: 'avanceId', as: 'avance' }); // HU-4
      ComentarioAvance.belongsTo(db.Usuario, { foreignKey: 'autorId', as: 'autor' });
      ComentarioAvance.belongsTo(ComentarioAvance, { foreignKey: 'respuestaAId', as: 'respuestaA' });
    }
  }

  ComentarioAvance.init(
    {
      id: { type: DataTypes.STRING(20), primaryKey: true, defaultValue: () => `c-${randomBytes(5).toString('hex')}` },
      avanceId: { type: DataTypes.STRING(20), allowNull: false },
      autorId: { type: DataTypes.STRING(20), allowNull: false },
      rol: { type: DataTypes.STRING(20), allowNull: false },
      texto: { type: DataTypes.TEXT, allowNull: false },
      respuestaAId: DataTypes.STRING(20),
    },
    {
      sequelize,
      modelName: 'ComentarioAvance',
      tableName: 'comentarios_avance',
      timestamps: true,
      createdAt: 'creadoEn',
      updatedAt: false,
    }
  );

  return ComentarioAvance;
};
