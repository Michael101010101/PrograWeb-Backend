'use strict';
// Datos semilla de la HU-4 · Plan de entregables (los mismos del front: hu4-entregables/data/datosSemilla.js).
//
// Las fechas se calculan desde el DÍA EN QUE SE CORRE EL SEEDER (dias(-7) = hace 7 días),
// para que el ejemplo siempre se vea como en los mockups: 3 entregables aprobados (55 %),
// el 4.º vencido hace 7 días y un requisito por vencer en los próximos 14 días.
//
// Los trabajos son los de la HU-2: TFC-2026-2-047 (Rosa y Diego, asesora u-101)
// y TFC-2026-2-012 (concluido, asesor u-102).

function dias(n) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + n);
  return fecha.toLocaleDateString('en-CA', { timeZone: 'America/Lima' }); // AAAA-MM-DD
}

const PLAN_047 = [
  { orden: 1, nombre: 'Plan de investigación', peso: 15, fechaLimite: dias(-80), descripcion: 'Problema, objetivos, justificación y cronograma.' },
  { orden: 2, nombre: 'Marco teórico', peso: 20, fechaLimite: dias(-55), descripcion: 'Antecedentes sobre deserción universitaria y modelos predictivos.' },
  { orden: 3, nombre: 'Diseño metodológico', peso: 20, fechaLimite: dias(-30), descripcion: 'Variables, muestra estratificada y técnica de validación.' },
  { orden: 4, nombre: 'Resultados preliminares', peso: 20, fechaLimite: dias(-7), descripcion: 'Primeros resultados del modelo entrenado con la base 2022-2025, con matriz de confusión y métricas de precisión y recall.' },
  { orden: 5, nombre: 'Informe final', peso: 25, fechaLimite: dias(20), descripcion: 'Documento completo con anexos de código.' },
];

const PLAN_012 = ['Plan de investigación', 'Marco teórico', 'Diseño metodológico', 'Resultados preliminares', 'Informe final'].map(
  (nombre, i) => ({ orden: i + 1, nombre, peso: [15, 20, 20, 20, 25][i], fechaLimite: dias(-90 + i * 15), descripcion: '' })
);

// Versiones por número de entregable del 047: [versión, días desde hoy, estado, descripción, comentario de la asesora]
const AVANCES_047 = {
  1: [
    [1, -90, 'observado', 'Primera versión del plan.', 'Delimita mejor la población: solo primer ciclo.'],
    [2, -86, 'observado', 'Población delimitada a primer ciclo.', 'Falta el cronograma por etapas.'],
    [3, -82, 'aprobado', 'Se agregó el cronograma por etapas.', 'Plan aprobado.'],
  ],
  2: [[1, -58, 'aprobado', 'Marco teórico con 18 fuentes.', 'Buen marco teórico.']],
  3: [
    [1, -36, 'observado', 'Diseño metodológico inicial.', 'La muestra no es representativa por carrera.'],
    [2, -32, 'aprobado', 'Muestra estratificada por carrera.', 'Metodología correcta. Pasa a resultados preliminares con la muestra estratificada por carrera.'],
  ],
};

module.exports = {
  async up(queryInterface) {
    const ahora = new Date();
    const conFechas = (codigo) => (e) => ({ ...e, trabajoCodigo: codigo, obligatorio: true, creadoEn: ahora, actualizadoEn: ahora });
    await queryInterface.bulkInsert('entregables', [...PLAN_047.map(conFechas('TFC-2026-2-047')), ...PLAN_012.map(conFechas('TFC-2026-2-012'))]);

    // Ids que la base asignó a cada entregable: { 'TFC-2026-2-047-1': 1, … }
    const [filas] = await queryInterface.sequelize.query('SELECT id, "trabajoCodigo", orden FROM entregables');
    const idDe = (codigo, orden) => filas.find((f) => f.trabajoCodigo === codigo && f.orden === orden).id;

    const avances = [];
    for (const [orden, versiones] of Object.entries(AVANCES_047)) {
      for (const [version, dia, estado, descripcion, comentario] of versiones) {
        avances.push({
          entregableId: idDe('TFC-2026-2-047', Number(orden)),
          version,
          fecha: dias(dia),
          diasRetraso: 0,
          estado,
          enlace: `https://drive.google.com/file/d/047-entregable-${orden}-v${version}`,
          descripcion,
          revisadoEn: dias(dia + 2),
          comentario,
          revisorId: 'u-101',
          creadoEn: ahora,
        });
      }
    }
    PLAN_012.forEach((e) => {
      avances.push({
        entregableId: idDe('TFC-2026-2-012', e.orden),
        version: 1,
        fecha: dias(-108 + e.orden * 15), // 3 días antes de su fecha límite
        diasRetraso: 0,
        estado: 'aprobado',
        enlace: `https://drive.google.com/file/d/012-entregable-${e.orden}`,
        descripcion: 'Versión final.',
        revisadoEn: dias(-106 + e.orden * 15),
        comentario: 'Aprobado.',
        revisorId: 'u-102',
        creadoEn: ahora,
      });
    });
    await queryInterface.bulkInsert('avances', avances);

    // Requisito administrativo del periodo activo (sale en "Próximos a vencer").
    const [[periodo]] = await queryInterface.sequelize.query('SELECT id FROM periodos WHERE activo = true LIMIT 1');
    await queryInterface.bulkInsert('requisitos', [
      {
        periodoId: periodo.id,
        nombre: 'Entrega de informe impreso',
        detalle: 'Requisito administrativo de la oficina TFC · no tiene peso',
        fechaLimite: dias(12),
        pasos: JSON.stringify([
          'Imprimir el informe del avance en A4, anillado.',
          'Incluir la carátula oficial con el código del trabajo.',
          'Entregarlo en la oficina TFC (pabellón A, 2.º piso), de 9:00 a 17:00.',
        ]),
      },
    ]);
  },

  async down(queryInterface) {
    // Solo borra las tablas que ya existen (db:reset deshace los seeders ANTES de crear las tablas).
    const tablas = await queryInterface.showAllTables();
    for (const tabla of ['requisitos', 'ampliaciones', 'avances', 'entregables']) {
      if (tablas.includes(tabla)) await queryInterface.bulkDelete(tabla, null, {});
    }
  },
};
