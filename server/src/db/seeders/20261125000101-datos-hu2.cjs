'use strict';
const datos = require('./seed-hu2.json');
const { LINEAS } = require('./20261125000100-lineas-investigacion.cjs');

function lineaId(nombre) {
  const l = LINEAS.find((x) => x.nombre === nombre);
  if (!l) throw new Error(`Línea desconocida en seed-hu2.json: ${nombre}`);
  return l.id;
}

const json = (valor) => (valor == null ? null : JSON.stringify(valor));

module.exports = {
  async up(queryInterface) {
    const ahora = new Date();
    const [[periodo]] = await queryInterface.sequelize.query('SELECT id FROM periodos WHERE activo = true LIMIT 1');
    if (!periodo) throw new Error('Primero carga el periodo activo (seeder de HU-1).');

    await queryInterface.bulkInsert(
      'trabajos',
      datos.trabajos.map((t) => ({
        id: t.id,
        codigo: t.codigo,
        titulo: t.titulo,
        lineaId: lineaId(t.linea),
        carrera: t.carrera ?? null,
        resumen: t.resumen,
        objetivos: t.objetivos,
        palabrasClave: json(t.palabrasClave ?? []),
        estado: t.estado,
        asesor: json(t.asesor),
        plan: json(t.plan),
        sustentacion: json(t.sustentacion),
        periodoId: periodo.id,
        fechaRegistro: new Date(t.registradoEn),
        cerradoEn: t.cerradoEn ? new Date(t.cerradoEn) : null,
        actualizadoEn: ahora,
      }))
    );

    await queryInterface.bulkInsert(
      'integrantes_trabajo',
      datos.trabajos.flatMap((t) =>
        t.integrantes.map((i) => ({ trabajoId: t.id, estudianteId: i.usuarioId, esResponsable: i.responsable }))
      )
    );

    await queryInterface.bulkInsert(
      'trabajo_historial',
      datos.trabajos.flatMap((t) =>
        (t.historial ?? []).map((h) => ({
          trabajoId: t.id,
          de: h.de,
          a: h.a,
          motivo: h.motivo,
          fecha: new Date(h.fecha),
          usuarioId: h.usuarioId ?? null,
        }))
      )
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('trabajo_historial', null, {});
    await queryInterface.bulkDelete('integrantes_trabajo', null, {});
    await queryInterface.bulkDelete('trabajos', null, {});
  },
};