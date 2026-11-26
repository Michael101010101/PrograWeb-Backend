'use strict';
// HU-3 · Carga los asesores y las solicitudes de prueba (seed-hu3.json), y completa los trabajos de la HU-2.
// Las fechas del archivo están referidas al 06/09/2026 (la semana de los mockups);
// aquí se corren al día de hoy para que los "días en espera" y las fechas se vean reales.
const datos = require('./seed-hu3.json');

const UN_DIA = 24 * 60 * 60 * 1000;

const ALIAS = { 'Ing. de software': 'Ingeniería de software' };
const nombreLinea = (nombre) => ALIAS[nombre] ?? nombre;

function hoyEnLima() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }); // AAAA-MM-DD
}

module.exports = {
  async up(queryInterface) {
    const desfase = Math.round((new Date(hoyEnLima()) - new Date(datos.fechaBase)) / UN_DIA);
    const correr = (fecha) => (fecha ? new Date(new Date(fecha).getTime() + desfase * UN_DIA).toISOString().slice(0, 10) : null);
    const ahora = new Date();

    await queryInterface.bulkInsert(
      'asesores',
      datos.asesores.map((a) => ({
        id: a.id,
        usuarioId: a.usuarioId,
        titulo: a.titulo,
        gradoAcademico: a.gradoAcademico,
        nombres: a.nombres,
        apellidos: a.apellidos,
        correo: a.correo,
        departamento: a.departamento,
        lineas: JSON.stringify(a.lineas.map(nombreLinea)),
        especialidad: a.especialidad ?? '',
        experiencia: a.experiencia ?? null,
        trabajosAsesorados: a.trabajosAsesorados,
        concluidos: a.concluidos ?? null,
        tiempoRevision: a.tiempoRevision ?? null,
        sustentacionesJurado: a.sustentacionesJurado ?? null,
        cupoMaximo: a.cupoMaximo,
        cupoOcupado: a.cupoOcupado,
        sinCupoDesde: correr(a.sinCupoDesde),
        creadoEn: ahora,
        actualizadoEn: ahora,
      }))
    );

    const sql = queryInterface.sequelize;
    const [[periodo]] = await sql.query('SELECT id FROM periodos WHERE activo = true LIMIT 1');
    const [lineas] = await sql.query('SELECT id, nombre FROM lineas_investigacion');
    const lineaId = (nombre) => lineas.find((l) => l.nombre === nombreLinea(nombre))?.id;
    const [ocupados] = await sql.query('SELECT DISTINCT "estudianteId" FROM integrantes_trabajo');
    const enOtroTrabajo = new Set(ocupados.map((o) => o.estudianteId));

    for (const t of datos.trabajos) {
      const nota = t.nota ? JSON.stringify(t.nota) : null;
      const [[existe]] = await sql.query('SELECT id FROM trabajos WHERE codigo = :codigo', { replacements: { codigo: t.codigo } });
      if (existe) {
        await sql.query('UPDATE trabajos SET "asesorId" = :asesorId, "porRevisar" = :porRevisar, nota = :nota WHERE codigo = :codigo', {
          replacements: { codigo: t.codigo, asesorId: t.asesorId, porRevisar: t.porRevisar, nota },
        });
        continue;
      }
      const id = `t-${t.codigo.split('-').pop()}`;
      await queryInterface.bulkInsert('trabajos', [
        {
          id,
          codigo: t.codigo,
          titulo: t.titulo,
          lineaId: lineaId(t.linea),
          carrera: t.carrera ?? null,
          resumen: `Trabajo de ejemplo de la HU-3: ${t.titulo}.`,
          objetivos: 'Objetivos por completar.',
          palabrasClave: JSON.stringify([]),
          estado: t.estado,
          periodoId: periodo.id,
          fechaRegistro: ahora,
          cerradoEn: t.estado === 'concluido' ? ahora : null,
          actualizadoEn: ahora,
          asesorId: t.asesorId,
          porRevisar: t.porRevisar,
          nota,
        },
      ]);
      const integrantes = t.integrantes.filter((i) => i.usuarioId && !enOtroTrabajo.has(i.usuarioId));
      integrantes.forEach((i) => enOtroTrabajo.add(i.usuarioId));
      if (integrantes.length) {
        await queryInterface.bulkInsert(
          'integrantes_trabajo',
          integrantes.map((i, indice) => ({ trabajoId: id, estudianteId: i.usuarioId, esResponsable: indice === 0 }))
        );
      }
    }

    await sql.query(
      `UPDATE trabajos t SET "asesorId" = a.id FROM asesores a WHERE t."asesorId" IS NULL AND t.asesor->>'id' = a."usuarioId"`
    );

    await queryInterface.bulkInsert(
      'solicitudes',
      datos.solicitudes.map((s) => ({
        id: s.id,
        asesorId: s.asesorId,
        trabajoCodigo: s.trabajoCodigo,
        estado: s.estado,
        fecha: correr(s.fecha),
        equipo: JSON.stringify(s.equipo),
        mensaje: s.mensaje,
        motivo: s.motivo,
        resueltaEl: correr(s.resueltaEl),
        creadoEn: new Date(correr(s.fecha)),
        actualizadoEn: ahora,
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('historial_asesorias', null, {});
    await queryInterface.bulkDelete('solicitudes', null, {});
    await queryInterface.sequelize.query(`DELETE FROM trabajos WHERE resumen LIKE 'Trabajo de ejemplo de la HU-3:%'`);
    await queryInterface.sequelize.query('UPDATE trabajos SET "asesorId" = NULL, "porRevisar" = 0, nota = NULL');
    await queryInterface.bulkDelete('asesores', null, {});
  },
};