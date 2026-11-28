'use strict';
const { Model } = require('sequelize');

// HU-6 · Sustentación de un trabajo concluido (tabla public.sustentaciones, la que lee la HU-7).
module.exports = (sequelize, DataTypes) => {
  class Sustentacion extends Model {
    static associate(db) {
      Sustentacion.belongsTo(db.Trabajo, { foreignKey: 'trabajoId', as: 'trabajo' });
      Sustentacion.belongsTo(db.Sala, { foreignKey: 'salaId', as: 'sala' });
      Sustentacion.hasMany(db.Jurado, { foreignKey: 'sustentacionId', as: 'jurado', onDelete: 'CASCADE' });
      Sustentacion.hasOne(db.Acta, { foreignKey: 'sustentacionId', as: 'acta', onDelete: 'CASCADE' });
      Sustentacion.hasMany(db.Reprogramacion, { foreignKey: 'sustentacionId', as: 'historial', onDelete: 'CASCADE' });

      // Lado inverso en Trabajo (HU-2): un trabajo tiene a lo sumo una sustentación,
      // sus conflictos de jurado y sus entregables (HU-4).
      db.Trabajo.hasOne(Sustentacion, { foreignKey: 'trabajoId', as: 'sustentacionProgramada' });
      db.Trabajo.hasMany(db.ConflictoTrabajo, { foreignKey: 'trabajoId', as: 'conflictosJurado' });
      if (!db.Trabajo.associations.entregables) {
        db.Trabajo.hasMany(db.Entregable, { foreignKey: 'trabajoId', as: 'entregables' });
      }
    }
  }

  Sustentacion.init(
    {
      id: { type: DataTypes.STRING(24), primaryKey: true, validate: { is: /^s-\d+$/ } },
      trabajoId: { type: DataTypes.STRING(24), allowNull: false, unique: true },
      fecha: { type: DataTypes.DATEONLY, allowNull: false },
      hora: { type: DataTypes.TIME, allowNull: false },
      modalidad: { type: DataTypes.STRING(12), allowNull: false, validate: { isIn: [['Presencial', 'Virtual', 'Híbrida']] } },
      calificacion: { type: DataTypes.SMALLINT, validate: { min: 0, max: 20 } },
      estado: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'programada',
        validate: { isIn: [['programada', 'realizada', 'reprogramada', 'desaprobada']] },
      },
      salaId: DataTypes.STRING(24),
      programadaEl: { type: DataTypes.DATEONLY, allowNull: false },
    },
    { sequelize, modelName: 'Sustentacion', tableName: 'sustentaciones', timestamps: false }
  );

  return Sustentacion;
};
