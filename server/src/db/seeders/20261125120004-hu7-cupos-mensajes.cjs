'use strict';
// Datos de prueba de HU-7: una ampliación de cupo (cupos_asesor) y dos mensajes al asesor (mensajes). Tablas propias de HU-7.
// Requiere los seeders 120002 (usuarios y periodos) y 120003 (trabajos). Idempotente.
const datos = require('./seed-data-hu7.json');
const s = require('../utils/semilla-hu7.cjs');

const IDS_CUPOS = datos.cuposAsesor.map((c) => c.id);
const IDS_MENSAJES = datos.mensajes.map((m) => m.id);
const COORDINADOR = datos.referencias.coordinador;

module.exports = {
  async up(queryInterface) {
    const { fecha } = s.crearFechas();

    await queryInterface.sequelize.transaction(async (transaction) => {
      const usuarios = [
        COORDINADOR,
        ...datos.cuposAsesor.map((c) => c.asesorId),
        ...datos.mensajes.map((m) => m.destinatarioId),
      ];
      await s.exigirIds(queryInterface, 'usuarios', [...new Set(usuarios)], transaction);
      const trabajos = datos.mensajes.map((m) => m.trabajoId).filter(Boolean);
      await s.exigirIds(queryInterface, 'trabajos', [...new Set(trabajos)], transaction);
      const periodos = await s.periodosPorSemestre(queryInterface, [...new Set(datos.cuposAsesor.map((c) => c.periodo))], transaction);

      for (const c of datos.cuposAsesor) s.exigir(c.cupoMaximo > 0, `cupo ${c.id}: cupoMaximo debe ser mayor que 0`);

      await s.insertar(
        queryInterface,
        'cupos_asesor',
        datos.cuposAsesor.map((c) => ({
          id: c.id,
          asesorId: c.asesorId,
          periodoId: periodos.get(c.periodo),
          cupoMaximo: c.cupoMaximo,
          motivo: c.motivo ?? null,
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
          destinatarioId: m.destinatarioId,
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

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.bulkDelete('mensajes', { id: IDS_MENSAJES }, { transaction });
      await queryInterface.bulkDelete('cupos_asesor', { id: IDS_CUPOS }, { transaction });
    });
  },
};
