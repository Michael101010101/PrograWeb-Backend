'use strict';
// Carga los datos semilla del grupo (seed-data.json). Contraseña de todas las cuentas: Tfc2026!
const bcrypt = require('bcryptjs');
const datos = require('./seed-data.json');

const CLAVE_PRUEBA = 'Tfc2026!';

module.exports = {
  async up(queryInterface) {
    const hash = await bcrypt.hash(CLAVE_PRUEBA, 10);
    const ahora = new Date();

    await queryInterface.bulkInsert(
      'usuarios',
      datos.usuarios.map((u) => ({
        id: u.id,
        rol: u.rol,
        estado: u.estado,
        nombres: u.nombres,
        apellidos: u.apellidos,
        correo: u.correo,
        passwordHash: hash,
        telefono: u.telefono ?? '',
        carrera: u.carrera ?? null,
        ciclo: u.ciclo ?? null,
        codigoAlumno: u.codigoAlumno ?? null,
        gradoAcademico: u.gradoAcademico ?? null,
        departamento: u.departamento ?? null,
        cargo: u.cargo ?? null,
        motivoBloqueo: u.motivoBloqueo ?? null,
        notificaciones: JSON.stringify(u.notificaciones),
        ultimoIngreso: u.ultimoIngreso ? new Date(u.ultimoIngreso) : null,
        creadoEn: new Date(u.creadoEn),
        actualizadoEn: ahora,
      }))
    );

    await queryInterface.bulkInsert(
      'invitaciones',
      datos.invitaciones.map((i) => ({
        codigo: i.codigo,
        correo: i.correo,
        invitadoPor: i.invitadoPor,
        venceEn: new Date(i.venceEn),
        usada: i.usada,
        creadaEn: new Date(i.creadaEn),
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('invitaciones', null, {});
    await queryInterface.bulkDelete('usuarios', null, {});
  },
};
