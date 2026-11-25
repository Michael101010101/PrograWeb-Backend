'use strict';
// Datos semilla de la HU-4 · Plan de entregables (los mismos del front: hu4-entregables/data/datosSemilla.js).
//
// Las fechas se calculan desde el DÍA EN QUE SE CORRE EL SEEDER (dias(-7) = hace 7 días),
// para que el ejemplo siempre se vea como en los mockups: 3 entregables aprobados (55 %),
// el 4.º vencido hace 7 días y un requisito por vencer en los próximos 14 días.
//
// Los trabajos son los de la HU-2: t-047 (Rosa y Diego, asesora u-101) y t-012 (concluido, asesor u-102).

function dias(n) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + n);
  return fecha.toLocaleDateString('en-CA', { timeZone: 'America/Lima' }); // AAAA-MM-DD
}

// 'e-006', 'e-007', … 'e-010'
const idE = (n) => `e-${String(n).padStart(3, '0')}`;

const NOMBRES = ['Plan de investigación', 'Marco teórico', 'Diseño metodológico', 'Resultados preliminares', 'Informe final'];
const PESOS = [15, 20, 20, 20, 25];

const ENTREGABLES = [
  // t-047 · plan del mockup 4.1 / 4.2
  { id: 'e-001', trabajoId: 't-047', orden: 1, fechaLimite: dias(-80), estado: 'aprobado', descripcion: 'Problema, objetivos, justificación y cronograma.' },
  { id: 'e-002', trabajoId: 't-047', orden: 2, fechaLimite: dias(-55), estado: 'aprobado', descripcion: 'Antecedentes sobre deserción universitaria y modelos predictivos.' },
  { id: 'e-003', trabajoId: 't-047', orden: 3, fechaLimite: dias(-30), estado: 'aprobado', descripcion: 'Variables, muestra estratificada y técnica de validación.' },
  { id: 'e-004', trabajoId: 't-047', orden: 4, fechaLimite: dias(-7), estado: 'pendiente', descripcion: 'Primeros resultados del modelo entrenado con la base 2022-2025, con matriz de confusión y métricas de precisión y recall.' },
  { id: 'e-005', trabajoId: 't-047', orden: 5, fechaLimite: dias(20), estado: 'pendiente', descripcion: 'Documento completo con anexos de código.' },
  // t-012 · trabajo concluido, todo aprobado (plan en modo lectura)
  ...[1, 2, 3, 4, 5].map((orden) => ({
    id: idE(orden + 5),
    trabajoId: 't-012',
    orden,
    fechaLimite: dias(-105 + orden * 15),
    estado: 'aprobado',
    descripcion: '',
  })),
].map((e) => ({ ...e, nombre: NOMBRES[e.orden - 1], peso: PESOS[e.orden - 1], obligatorio: true }));

// [entregableId, versión, días desde hoy, resultado, descripción, comentario del asesor, revisor]
const AVANCES = [
  ['e-001', 1, -90, 'observado', 'Primera versión del plan.', 'Delimita mejor la población: solo primer ciclo.', 'u-101'],
  ['e-001', 2, -86, 'observado', 'Población delimitada a primer ciclo.', 'Falta el cronograma por etapas.', 'u-101'],
  ['e-001', 3, -82, 'aprobado', 'Se agregó el cronograma por etapas.', 'Plan aprobado.', 'u-101'],
  ['e-002', 1, -58, 'aprobado', 'Marco teórico con 18 fuentes.', 'Buen marco teórico.', 'u-101'],
  ['e-003', 1, -36, 'observado', 'Diseño metodológico inicial.', 'La muestra no es representativa por carrera.', 'u-101'],
  ['e-003', 2, -32, 'aprobado', 'Muestra estratificada por carrera.', 'Metodología correcta. Pasa a resultados preliminares con la muestra estratificada por carrera.', 'u-101'],
  // t-012: una versión aprobada por entregable, 3 días antes de su fecha límite
  ...[1, 2, 3, 4, 5].map((orden) => [idE(orden + 5), 1, -108 + orden * 15, 'aprobado', 'Versión final.', 'Aprobado.', 'u-102']),
];

module.exports = {
  async up(queryInterface) {
    const ahora = new Date();
    await queryInterface.bulkInsert(
      'entregables',
      ENTREGABLES.map((e) => ({ ...e, creadoEn: ahora, actualizadoEn: ahora }))
    );

    await queryInterface.bulkInsert(
      'avances',
      AVANCES.map(([entregableId, version, dia, resultado, descripcion, comentario, revisorId], i) => ({
        id: `av-${String(i + 1).padStart(3, '0')}`,
        entregableId,
        version,
        fechaEntrega: dias(dia),
        diasRetraso: 0,
        enlace: `https://drive.google.com/file/d/${entregableId}-v${version}`,
        descripcion,
        fechaRevision: dias(dia + 2),
        resultado,
        comentario,
        revisorId,
        creadoEn: ahora,
      }))
    );

    // Requisito administrativo del periodo activo (sale en "Próximos a vencer").
    const [[periodo]] = await queryInterface.sequelize.query('SELECT id FROM periodos WHERE activo = true LIMIT 1');
    await queryInterface.bulkInsert('requisitos', [
      {
        id: 'r-001',
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
