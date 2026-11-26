import { pool, transaccion } from '../hu6/db.js';
import { DATOS_SEMILLA, SALAS } from '../hu6/domain/datosSemilla.js';
import { notaFinal } from '../hu6/domain/sustentacionesService.js';
import { idTrabajo } from '../hu6/domain/ids.js';
import { guardarActa, insertarProgramacion, reemplazarJurado } from '../hu6/repositories/sustentacionesRepository.js';

try {
  await transaccion(async (db) => {
    for (const d of DATOS_SEMILLA.docentes) {
      await db.query(`INSERT INTO hu6.docentes(id,usuario_id,titulo,nombres,apellidos,grado,departamento,jurados_previos)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO NOTHING`,[d.id,d.usuarioId,d.titulo,d.nombres,d.apellidos,d.grado,d.departamento,d.juradosPrevios]);
    }
    for (const s of SALAS) await db.query(`INSERT INTO hu6.salas(id,pabellon,ubicacion,asientos) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING`,[s.id,s.pabellon,s.ubicacion,s.asientos]);
    for (const t of DATOS_SEMILLA.trabajos) {
      await db.query(`INSERT INTO hu6.trabajos_ref(id,codigo,titulo,linea,departamento,estado,asesor_id,asesor,aprobados,total,informe_aprobado_el)
        VALUES($1,$2,$3,$4,$5,'concluido',$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
      [idTrabajo(t.codigo),t.codigo,t.titulo,t.linea,t.departamento,t.asesorId,t.asesor,t.entregables.aprobados,t.entregables.total,t.informeAprobadoEl]);
      for (const i of t.equipo) await db.query(`INSERT INTO hu6.integrantes_ref(trabajo_codigo,usuario_id,nombre,corto,responsable)
        SELECT $1,$2,$3,$4,$5 WHERE NOT EXISTS (SELECT 1 FROM hu6.integrantes_ref WHERE trabajo_codigo=$1 AND nombre=$3)`,
        [t.codigo,i.usuarioId,i.nombre,i.corto,i.responsable]);
      for (const c of t.conflictos) await db.query('INSERT INTO hu6.conflictos_ref(trabajo_codigo,docente_id,motivo) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [t.codigo,c.docenteId,c.motivo]);
    }
    for (const r of DATOS_SEMILLA.reservas) await db.query('INSERT INTO hu6.reservas_sala(sala_id,fecha,hora,motivo) VALUES($1,$2,$3,$4) ON CONFLICT(sala_id,fecha,hora) DO NOTHING', [r.salaId,r.fecha,r.hora,r.motivo]);
    for (const s of DATOS_SEMILLA.sustentaciones) {
      const ya = await db.query('SELECT "id" FROM public.sustentaciones WHERE "id"=$1 OR "trabajoId"=$2', [s.id,idTrabajo(s.trabajoCodigo)]);
      if (ya.rowCount) continue;
      // La calificación final queda en la tabla del contrato cuando el acta ya está registrada.
      await insertarProgramacion(db, { ...s, calificacion: s.acta?.registrada ? notaFinal(s.acta.notas) : null });
      if (s.jurado.length) await reemplazarJurado(db,s);
      if (s.acta) await guardarActa(db,s);
    }
  });
  console.log('Datos de prueba HU-6 insertados. Ejecutar otra vez no duplica registros.');
} catch (error) { console.error(error); process.exitCode = 1; }
finally { await pool.end(); }
