'use strict';
const { readFileSync } = require('node:fs');
const path = require('node:path');
const seed = readFileSync(path.join(__dirname, '../../sustentacion/db/002_hu6_seed.sql'), 'utf8');

module.exports = {
  async up({ sequelize }) {
    await sequelize.transaction(transaction => sequelize.query(seed, { transaction }));
  },

  async down({ sequelize }) {
    // Una sustentación modificada por coordinación ya es un registro de negocio.
    await sequelize.transaction(async transaction => {
      await sequelize.query(`DELETE FROM public.sustentaciones s WHERE s.id='s-012' AND s."trabajoId"='t-012'
        AND s.estado='programada' AND s.fecha='2026-12-11' AND s.hora='10:00' AND s."salaId"='A-402'
        AND NOT EXISTS (SELECT FROM hu6.actas a WHERE a.sustentacion_id=s.id)
        AND NOT EXISTS (SELECT FROM hu6.historial_reprogramaciones h WHERE h.sustentacion_id=s.id)
        AND (SELECT array_agg(j.docente_id || ':' || j.presidente ORDER BY j.docente_id)
             FROM hu6.jurados j WHERE j.sustentacion_id=s.id) = ARRAY['d-01:true','d-02:false','d-03:false']`, { transaction });
    });
  },
};
