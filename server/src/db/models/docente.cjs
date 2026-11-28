'use strict';
const { Model } = require('sequelize');

// HU-6 · Docentes que pueden integrar un jurado (tabla hu6.docentes).
module.exports = (sequelize, DataTypes) => {
  class Docente extends Model {
    static associate(db) {
      Docente.belongsTo(db.Usuario, { foreignKey: 'usuarioId', as: 'usuario' });
      Docente.hasMany(db.Jurado, { foreignKey: 'docenteId', as: 'jurados' });
      Docente.hasMany(db.ConflictoTrabajo, { foreignKey: 'docenteId', as: 'conflictos' });
    }
  }

  Docente.init(
    {
      id: { type: DataTypes.STRING(24), primaryKey: true },
      usuarioId: { type: DataTypes.STRING(32), field: 'usuario_id' },
      titulo: { type: DataTypes.STRING(12), allowNull: false },
      nombres: { type: DataTypes.STRING(120), allowNull: false },
      apellidos: { type: DataTypes.STRING(120), allowNull: false },
      grado: { type: DataTypes.STRING(20), allowNull: false, validate: { isIn: [['doctor', 'magíster', 'ingeniero']] } },
      departamento: { type: DataTypes.STRING(120), allowNull: false },
      juradosPrevios: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'jurados_previos' },
    },
    { sequelize, modelName: 'Docente', tableName: 'docentes', schema: 'hu6', timestamps: false }
  );

  return Docente;
};
