// Único lugar donde se escriben/leen tablas de la HU-6. No hay SQL en controladores.
// Contrato: public.sustentaciones (id, trabajoId, fecha, hora, modalidad, calificacion, estado) + extras salaId, programadaEl.
import { CRITERIOS, SALAS } from '../domain/datosSemilla.js';

// Convierte DATE y TIME de PostgreSQL al contrato JSON ya usado por la interfaz React.
const fecha = (v) => v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? null : String(v).slice(0, 10);
const hora = (v) => v == null ? null : String(v).slice(0, 5);

export async function obtenerDatos(db, { usuarioId = null, rol = 'coordinador' } = {}) {
  const admin = rol === 'coordinador' || rol === 'administrador';
  if (!admin && rol !== 'estudiante') throw Object.assign(new Error('Rol sin permisos para esta historia.'), { status: 403 });

  // Los datos referenciales están restringidos para que un estudiante solo vea su propio trabajo.
  const filtroTrabajo = admin ? '' : ` WHERE t.id IN (SELECT "trabajoId" FROM public.integrantes_trabajo WHERE "estudianteId" = $1)`;
  const params = admin ? [] : [usuarioId];
  const [d, t, e, c, r, s, j, a, n, h] = await Promise.all([
    db.query('SELECT * FROM hu6.docentes ORDER BY id'),
    db.query(`SELECT t.id, t.codigo, t.titulo, l.nombre AS linea, t.estado,
      COALESCE(a.departamento, t.asesor->>'departamento', t.carrera) AS departamento,
      d.id AS asesor_id, COALESCE(t.asesor->>'nombre', concat_ws(' ', a.titulo, a.nombres, a.apellidos)) AS asesor,
      plan.aprobados, plan.total, t."cerradoEn"::date AS informe_aprobado_el
      FROM public.trabajos t JOIN public.lineas_investigacion l ON l.id = t."lineaId"
      LEFT JOIN public.asesores a ON a.id = t."asesorId"
      LEFT JOIN hu6.docentes d ON d.usuario_id = COALESCE(a."usuarioId", t.asesor->>'id')
      CROSS JOIN LATERAL (SELECT count(*)::int AS total,
        (count(*) FILTER (WHERE item->>'estado' = 'aprobado'))::int AS aprobados
        FROM jsonb_array_elements(CASE WHEN jsonb_typeof(t.plan) = 'array' THEN t.plan ELSE '[]'::jsonb END) item) plan
      ` + filtroTrabajo + ' ORDER BY t.codigo', params),
    db.query( `SELECT t.codigo AS trabajo_codigo, u.id AS usuario_id, concat_ws(' ', u.nombres, u.apellidos) AS nombre,
      concat_ws(' ', split_part(u.nombres, ' ', 1), u.apellidos) AS corto, i."esResponsable" AS responsable
      FROM public.integrantes_trabajo i JOIN public.trabajos t ON t.id=i."trabajoId"
      JOIN public.usuarios u ON u.id=i."estudianteId" ORDER BY i.id`),
    db.query('SELECT c.*, t.codigo AS trabajo_codigo FROM hu6.conflictos_trabajo c JOIN public.trabajos t ON t.id=c.trabajo_id'),
    db.query('SELECT * FROM hu6.reservas_sala'),
    db.query('SELECT * FROM public.sustentaciones ORDER BY "fecha","hora","id"'),
    db.query('SELECT * FROM hu6.jurados ORDER BY sustentacion_id, presidente DESC,docente_id'),
    db.query('SELECT * FROM hu6.actas'),
    db.query('SELECT * FROM hu6.calificaciones'),
    db.query('SELECT * FROM hu6.historial_reprogramaciones ORDER BY id'),
  ]);
  const trabajos = t.rows.map((x) => ({
    id: x.id, codigo: x.codigo, titulo: x.titulo, linea: x.linea, departamento: x.departamento,
    estado: x.estado, asesorId: x.asesor_id, asesor: x.asesor,
    equipo: e.rows.filter((i) => i.trabajo_codigo === x.codigo).map((i) => ({ usuarioId: i.usuario_id, nombre: i.nombre, corto: i.corto, responsable: i.responsable })),
    entregables: { aprobados: x.aprobados, total: x.total },
    informeAprobadoEl: fecha(x.informe_aprobado_el),
    conflictos: c.rows.filter((i) => i.trabajo_codigo === x.codigo).map((i) => ({ docenteId: i.docente_id, motivo: i.motivo })),
  }));
  // La tabla del contrato referencia al trabajo por su id (t-012); la interfaz usa el código visible.
  const codigoDe = new Map(t.rows.map((x) => [x.id, x.codigo]));
  const sustentaciones = s.rows.filter((x) => codigoDe.has(x.trabajoId)).map((x) => {
    const acta = a.rows.find((z) => z.sustentacion_id === x.id);
    return {
      id: x.id, trabajoId: x.trabajoId, trabajoCodigo: codigoDe.get(x.trabajoId), estado: x.estado,
      programadaEl: fecha(x.programadaEl), fecha: fecha(x.fecha), hora: hora(x.hora),
      salaId: x.salaId, modalidad: x.modalidad, calificacion: x.calificacion,
      jurado: j.rows.filter((z) => z.sustentacion_id === x.id).map((z) => ({ docenteId: z.docente_id, presidente: z.presidente })),
      acta: !acta || (!admin && !acta.registrada) ? null : {
        notas: Object.fromEntries(CRITERIOS.map((criterio) => {
          const encontrada = n.rows.find((v) => v.sustentacion_id === x.id && v.criterio_id === criterio.id);
          return [criterio.id, encontrada ? encontrada.nota : ''];
        })),
        resultado: acta.resultado ?? '', observaciones: acta.observaciones,
        registrada: acta.registrada, registradaEl: fecha(acta.registrada_el), registradaHora: hora(acta.registrada_hora),
      },
      historial: admin ? h.rows.filter((z) => z.sustentacion_id === x.id).map((z) => ({ fecha: fecha(z.fecha_anterior), hora: hora(z.hora_anterior), salaId: z.sala_anterior, motivo: z.motivo, el: fecha(z.registrado_el) })) : [],
    };
  });
  const docentes = d.rows.map((x) => ({ id: x.id, usuarioId: x.usuario_id, titulo: x.titulo, nombres: x.nombres, apellidos: x.apellidos, grado: x.grado, departamento: x.departamento, juradosPrevios: x.jurados_previos }));
  return {
    docentes,
    trabajos,
    sustentaciones,
    reservas: admin ? r.rows.map((x) => ({ salaId: x.sala_id, fecha: fecha(x.fecha), hora: hora(x.hora), motivo: x.motivo })) : [],
    salas: SALAS,
  };
}

export async function insertarProgramacion(db, s) {
  await db.query(`INSERT INTO public.sustentaciones ("id","trabajoId","estado","programadaEl","fecha","hora","salaId","modalidad","calificacion")
    VALUES ($1,(SELECT id FROM public.trabajos WHERE codigo=$2),$3,$4,$5,$6,$7,$8,$9)`,
    [s.id,s.trabajoCodigo,s.estado,s.programadaEl,s.fecha,s.hora,s.salaId,s.modalidad,s.calificacion ?? null]);
}
export async function actualizarProgramacion(db, s, anterior) {
  await db.query(`UPDATE public.sustentaciones SET "estado"=$2,"fecha"=$3,"hora"=$4,"salaId"=$5,"modalidad"=$6 WHERE "id"=$1`,
    [s.id,s.estado,s.fecha,s.hora,s.salaId,s.modalidad]);
  await db.query(`INSERT INTO hu6.historial_reprogramaciones(sustentacion_id,fecha_anterior,hora_anterior,sala_anterior,motivo,registrado_el)
    VALUES ($1,$2,$3,$4,$5,(NOW() AT TIME ZONE 'America/Lima')::date)`, [s.id,anterior.fecha,anterior.hora,anterior.salaId,s.historial.at(-1).motivo]);
}
export async function reemplazarJurado(db, s) {
  await db.query('DELETE FROM hu6.jurados WHERE sustentacion_id=$1', [s.id]);
  for (const m of s.jurado) await db.query('INSERT INTO hu6.jurados(sustentacion_id,docente_id,presidente) VALUES($1,$2,$3)', [s.id,m.docenteId,m.presidente]);
}
export async function guardarActa(db, s) {
  const a = s.acta;
  const final = a.registrada ? Math.round(CRITERIOS.reduce((suma, c) => suma + Number(a.notas[c.id]) * c.peso, 0) / 100) : null;
  await db.query(`INSERT INTO hu6.actas(sustentacion_id,resultado,observaciones,registrada,registrada_el,registrada_hora)
      VALUES($1,$2,$3,$4,$5,$6)
      ON CONFLICT(sustentacion_id) DO UPDATE SET resultado=EXCLUDED.resultado,observaciones=EXCLUDED.observaciones,
      registrada=EXCLUDED.registrada,registrada_el=EXCLUDED.registrada_el,registrada_hora=EXCLUDED.registrada_hora`,
    [s.id,a.resultado || null,a.observaciones ?? '',a.registrada, a.registradaEl ?? null, a.registradaHora ?? null]);
  await db.query('DELETE FROM hu6.calificaciones WHERE sustentacion_id=$1', [s.id]);
  for (const c of CRITERIOS) if (a.notas[c.id] !== '' && a.notas[c.id] != null) {
    await db.query('INSERT INTO hu6.calificaciones(sustentacion_id,criterio_id,nota) VALUES($1,$2,$3)', [s.id,c.id,Number(a.notas[c.id])]);
  }
  // Al registrar el acta definitiva se cierra la sustentación: estado (realizada/desaprobada) y calificacion final.
  if (a.registrada) await db.query('UPDATE public.sustentaciones SET "estado"=$2,"calificacion"=$3 WHERE "id"=$1', [s.id,s.estado,final]);
}
