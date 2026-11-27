'use strict';
// HU-7 · Semilla mínima sobre los datos de main: usuarios para bloqueo, validación y paginación,
// un historial de cupo y dos mensajes (a un asesor con cuenta y a otro sin cuenta).
// Requiere las semillas de HU-1, HU-2 y HU-3. Idempotente: se puede correr varias veces.
// Correr SOLO este archivo:  npx sequelize-cli db:seed --seed 20261126070001-datos-hu7.cjs --options-path .sequelizerc.cjs
const bcrypt = require('bcryptjs');
const datos = require('./seed-hu7.json');
const s = require('../utils/semilla-hu7.cjs');

const CLAVE_PRUEBA = 'Tfc2026!';
const NOTIFICACIONES = { entregables: true, retroalimentacion: true, resumenSemanal: false };

const IDS_USUARIOS = datos.usuarios.map((u) => u.id);
const IDS_CUPOS = datos.cuposAsesor.map((c) => c.id);
const IDS_MENSAJES = datos.mensajes.map((m) => m.id);
const COORDINADOR = datos.referencias.coordinador;

module.exports = {
  async up(queryInterface) {
    const { fecha } = s.crearFechas();
    const hash = await bcrypt.hash(CLAVE_PRUEBA, 10);
    const ahora = new Date();

    await queryInterface.sequelize.transaction(async (transaction) => {
      // Datos previos de otras historias que esta semilla solo referencia
      await s.exigirIds(queryInterface, 'usuarios', [COORDINADOR], transaction);
      const asesores = [...datos.cuposAsesor.map((c) => c.asesorId), ...datos.mensajes.map((m) => m.asesorId)];
      await s.exigirIds(queryInterface, 'asesores', [...new Set(asesores)], transaction);
      const trabajos = datos.mensajes.map((m) => m.trabajoId).filter(Boolean);
      await s.exigirIds(queryInterface, 'trabajos', [...new Set(trabajos)], transaction);
      const periodos = await s.periodosPorSemestre(queryInterface, [...new Set(datos.cuposAsesor.map((c) => c.periodo))], transaction);

      for (const u of datos.usuarios) {
        s.exigir(u.estado !== 'bloqueado' || (u.motivoBloqueo ?? '').length >= 30, `usuario ${u.id}: el motivo de bloqueo necesita 30 caracteres`);
      }
      for (const c of datos.cuposAsesor) s.exigir(c.cupoMaximo >= 1 && c.cupoAnterior >= 1, `cupo ${c.id}: los cupos deben ser mayores que 0`);

      await s.insertar(
        queryInterface,
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
          notificaciones: JSON.stringify(NOTIFICACIONES),
          ultimoIngreso: u.ultimoIngresoDias == null ? null : fecha(u.ultimoIngresoDias, '08:30'),
          creadoEn: fecha(u.creadoDias, '09:00'),
          actualizadoEn: ahora,
        })),
        transaction
      );
      await s.exigirIds(queryInterface, 'usuarios', IDS_USUARIOS, transaction);

      await s.insertar(
        queryInterface,
        'cupos_asesor',
        datos.cuposAsesor.map((c) => ({
          id: c.id,
          asesorId: c.asesorId,
          periodoId: periodos.get(c.periodo),
          cupoAnterior: c.cupoAnterior,
          cupoMaximo: c.cupoMaximo,
          motivo: c.motivo,
          modificadoPor: COORDINADOR,
          creadoEn: fecha(c.creadoDias, '10:30'),
        })),
        transaction
      );
      await s.exigirIds(queryInterface, 'cupos_asesor', IDS_CUPOS, transaction);

      await s.insertar(
        queryInterface,
        'mensajes',
        datos.mensajes.map((m) => ({
          id: m.id,
          remitenteId: COORDINADOR,
          asesorId: m.asesorId,
          trabajoId: m.trabajoId,
          asunto: m.asunto,
          cuerpo: m.cuerpo,
          leido: m.leido,
          creadoEn: fecha(m.creadoDias, '09:15'),
          actualizadoEn: fecha(m.creadoDias, '09:15'),
        })),
        transaction
      );
      await s.exigirIds(queryInterface, 'mensajes', IDS_MENSAJES, transaction);
    });
  },

  // Borra solo las filas de esta semilla.
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.bulkDelete('mensajes', { id: IDS_MENSAJES }, { transaction });
      await queryInterface.bulkDelete('cupos_asesor', { id: IDS_CUPOS }, { transaction });
      await queryInterface.bulkDelete('usuarios', { id: IDS_USUARIOS }, { transaction });
    });
  },
};
