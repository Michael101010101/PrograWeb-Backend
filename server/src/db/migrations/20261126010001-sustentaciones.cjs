'use strict';
const { readFileSync } = require('node:fs');
const path = require('node:path');
const esquema = readFileSync(path.join(__dirname, '../../sustentacion/db/001_hu6_schema.sql'), 'utf8');

module.exports = {
  async up({ sequelize }) {
    await sequelize.transaction(async transaction => {
      const query = sql => sequelize.query(sql, { transaction });
      await query(esquema);
      const [anteriores] = await query(`SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.sustentaciones'::regclass AND contype = 'f'
          AND confrelid = to_regclass('hu6.trabajos_ref')`);
      if (!anteriores.length) return;

      await query('LOCK TABLE public.sustentaciones IN ACCESS EXCLUSIVE MODE');
      // Conserva el registro completo, incluyendo acta e historial, si su trabajo solo existía en el demo.
      await query(`CREATE TABLE hu6.archivo_pre_integracion AS
        SELECT s.*, to_jsonb(t) AS trabajo,
          (SELECT jsonb_agg(j) FROM hu6.jurados j WHERE j.sustentacion_id=s.id) AS jurados,
          (SELECT to_jsonb(a) FROM hu6.actas a WHERE a.sustentacion_id=s.id) AS acta,
          (SELECT jsonb_agg(c) FROM hu6.calificaciones c WHERE c.sustentacion_id=s.id) AS calificaciones,
          (SELECT jsonb_agg(h) FROM hu6.historial_reprogramaciones h WHERE h.sustentacion_id=s.id) AS historial
        FROM public.sustentaciones s JOIN hu6.trabajos_ref t ON t.id=s."trabajoId"
        WHERE NOT EXISTS (SELECT FROM public.trabajos real WHERE real.id=t.id AND real.codigo=t.codigo)`);
      await query('DELETE FROM public.sustentaciones s USING hu6.archivo_pre_integracion a WHERE s.id=a.id');
      for (const { conname } of anteriores) {
        await query('ALTER TABLE public.sustentaciones DROP CONSTRAINT ' + sequelize.getQueryInterface().quoteIdentifier(conname));
      }
      await query(`ALTER TABLE public.sustentaciones ADD CONSTRAINT sustentaciones_trabajo_fk
        FOREIGN KEY ("trabajoId") REFERENCES public.trabajos(id)`);
      await query(`INSERT INTO hu6.conflictos_trabajo (trabajo_id, docente_id, motivo)
        SELECT t.id, c.docente_id, c.motivo FROM hu6.conflictos_ref c
        JOIN hu6.trabajos_ref viejo ON viejo.codigo=c.trabajo_codigo
        JOIN public.trabajos t ON t.id=viejo.id AND t.codigo=viejo.codigo
        ON CONFLICT DO NOTHING`);
    });
  },

  async down({ sequelize }) {
    await sequelize.transaction(async transaction => {
      const [[{ legado }]] = await sequelize.query("SELECT to_regclass('hu6.archivo_pre_integracion') AS legado", { transaction });
      if (legado) throw new Error('Esta base tenía HU6 antes de Sequelize. Restaura un respaldo para volver al esquema anterior conservando las actas.');
      await sequelize.query(`DROP TABLE hu6.historial_reprogramaciones, hu6.calificaciones, hu6.actas, hu6.jurados,
        public.sustentaciones, hu6.reservas_sala, hu6.conflictos_trabajo, hu6.salas, hu6.docentes;
        DROP SCHEMA hu6;`, { transaction });
    });
  },
};
