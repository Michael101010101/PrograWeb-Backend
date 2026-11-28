'use strict';
// Datos de demostración: el trabajo concluido TFC-2026-2-007 tiene su plan de entregables (HU-4)
// completo y aprobado. Así la coordinación puede programar su sustentación en la HU-6
// (la programación exige que todos los entregables estén aprobados).

const ENTREGABLES = [
  { id: 'e-701', orden: 1, nombre: 'Plan de investigación', peso: 30, fechaLimite: '2026-09-11' },
  { id: 'e-702', orden: 2, nombre: 'Desarrollo y resultados', peso: 40, fechaLimite: '2026-10-23' },
  { id: 'e-703', orden: 3, nombre: 'Informe final', peso: 30, fechaLimite: '2026-11-13' },
];

module.exports = {
  async up(queryInterface) {
    const ahora = new Date();
    await queryInterface.bulkInsert(
      'entregables',
      ENTREGABLES.map((e) => ({
        ...e,
        trabajoId: 't-007',
        descripcion: '',
        obligatorio: true,
        estado: 'aprobado',
        creadoEn: ahora,
        actualizadoEn: ahora,
      })),
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('entregables', { id: ENTREGABLES.map((e) => e.id) });
  },
};
