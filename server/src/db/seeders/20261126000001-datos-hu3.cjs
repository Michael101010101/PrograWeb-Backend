'use strict';
// HU-3 · Carga los asesores, los trabajos y las solicitudes de prueba (seed-hu3.json).
// Las fechas del archivo están referidas al 06/09/2026 (la semana de los mockups);
// aquí se corren al día de hoy para que los "días en espera" y las fechas se vean reales.
const datos = require('./seed-hu3.json');

const UN_DIA = 24 * 60 * 60 * 1000;

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
        lineas: JSON.stringify(a.lineas),
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

    await queryInterface.bulkInsert(
      'trabajos',
      datos.trabajos.map((t) => ({
        codigo: t.codigo,
        titulo: t.titulo,
        linea: t.linea,
        carrera: t.carrera ?? '',
        integrantes: JSON.stringify(t.integrantes),
        estado: t.estado,
        asesorId: t.asesorId,
        avance: t.avance,
        porRevisar: t.porRevisar,
        nota: t.nota ? JSON.stringify(t.nota) : null,
        creadoEn: ahora,
        actualizadoEn: ahora,
      }))
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
    await queryInterface.bulkDelete('trabajos', null, {});
    await queryInterface.bulkDelete('asesores', null, {});
  },
};
