'use strict';
// Periodo 2026-2 con su cronograma de 5 etapas y los datos de contacto de la oficina TFC.

const ETAPAS = [
  {
    numero: 1, nombre: 'Registro de propuestas', titulo: 'Registro del trabajo y del equipo', responsable: 'Estudiante',
    descripcion: 'Registra tu trabajo con título, línea de investigación, resumen, objetivos y palabras clave. Puedes sumar hasta dos compañeros que no tengan otro trabajo vigente.',
    inicio: '2026-08-10', fin: '2026-08-28',
  },
  {
    numero: 2, nombre: 'Asignación de asesores', titulo: 'Solicitud y asignación de asesor', responsable: 'Estudiante y asesor',
    descripcion: 'Elige un asesor con cupo en tu línea y envíale una solicitud con un mensaje de sustento. Solo puedes tener una solicitud activa; el asesor la acepta o la rechaza con un motivo.',
    inicio: '2026-08-31', fin: '2026-09-11',
  },
  {
    numero: 3, nombre: 'Desarrollo y entregables', titulo: 'Plan de entregables', responsable: 'Asesor',
    descripcion: 'Tu asesor define los entregables con fecha límite y peso. Los pesos suman 100 y el avance del trabajo se calcula con los entregables aprobados.',
    inicio: '2026-09-14', fin: '2026-11-20',
  },
  {
    numero: 4, nombre: 'Informe final', titulo: 'Revisión de avances', responsable: 'Estudiante y asesor',
    descripcion: 'Registras cada avance con el enlace al documento. El asesor lo aprueba u observa; si lo observa, subes una nueva versión. Recibes alertas de vencimientos.',
    inicio: '2026-11-23', fin: '2026-12-04',
  },
  {
    numero: 5, nombre: 'Sustentaciones', titulo: 'Sustentación y acta', responsable: 'Coordinación',
    descripcion: 'Con el trabajo concluido, la coordinación programa la sustentación, conforma el jurado y registra el acta con la calificación por criterios.',
    inicio: '2026-12-07', fin: '2026-12-19',
  },
];

module.exports = {
  async up(queryInterface) {
    const ahora = new Date();
    await queryInterface.bulkInsert('periodos', [
      {
        semestre: '2026-2',
        activo: true,
        correoContacto: 'tfc@ulima.edu.pe',
        anexo: '30412',
        mesaAyuda: '30100',
        direccion: 'Av. Javier Prado Este 4600, Santiago de Surco',
        creadoEn: ahora,
        actualizadoEn: ahora,
      },
    ]);
    const [[periodo]] = await queryInterface.sequelize.query("SELECT id FROM periodos WHERE semestre = '2026-2'");
    await queryInterface.bulkInsert('etapas', ETAPAS.map((e) => ({ ...e, periodoId: periodo.id })));
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('etapas', null, {});
    await queryInterface.bulkDelete('periodos', null, {});
  },
};
