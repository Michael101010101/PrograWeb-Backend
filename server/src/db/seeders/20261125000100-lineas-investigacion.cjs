'use strict';

const LINEAS = [
  { id: 'li-01', nombre: 'Ciencia de datos aplicada' },
  { id: 'li-02', nombre: 'Automatización y control' },
  { id: 'li-03', nombre: 'Gestión de operaciones' },
  { id: 'li-04', nombre: 'Innovación educativa' },
  { id: 'li-05', nombre: 'Ingeniería de software' },
  { id: 'li-06', nombre: 'Sostenibilidad urbana' },
];

module.exports = {
  LINEAS,
  async up(queryInterface) {
    for (const l of LINEAS) {
      await queryInterface.sequelize.query(
        'INSERT INTO lineas_investigacion (id, nombre) VALUES (:id, :nombre) ON CONFLICT DO NOTHING',
        { replacements: l }
      );
    }
  },

  async down() {},
};