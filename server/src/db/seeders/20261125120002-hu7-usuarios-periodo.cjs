'use strict';
// Datos de prueba de HU-7 en tablas de HU-1: estudiantes y asesores nuevos, y el periodo 2026-1 si no existe.
// Contraseña: se reutiliza el passwordHash del coordinador del seed de HU-1 (Tfc2026!). Idempotente.
const datos = require('./seed-data-hu7.json');
const s = require('../utils/semilla-hu7.cjs');

const IDS = datos.usuarios.map((u) => u.id);
const SEMESTRES_NUEVOS = datos.periodos.map((p) => p.semestre);

function validar(catalogos) {
  for (const u of datos.usuarios) {
    const donde = `usuario ${u.id}`;
    s.exigir(['estudiante', 'asesor'].includes(u.rol), `${donde}: rol no válido`);
    s.exigir(['activo', 'sin_verificar', 'pendiente_validacion', 'bloqueado'].includes(u.estado), `${donde}: estado no válido`);
    if (u.rol === 'estudiante') {
      s.exigir(u.correo.endsWith('@aloe.ulima.edu.pe'), `${donde}: correo de estudiante no válido`);
      s.exigir(/^\d{8}$/.test(u.codigoAlumno), `${donde}: el código tiene 8 dígitos`);
      s.exigirCatalogo(catalogos, 'carreras', u.carrera, donde);
      s.exigirCatalogo(catalogos, 'ciclos', u.ciclo, donde);
    } else {
      s.exigir(u.correo.endsWith('@ulima.edu.pe'), `${donde}: correo de docente no válido`);
      s.exigirCatalogo(catalogos, 'gradosAcademicos', u.gradoAcademico, donde);
      s.exigirCatalogo(catalogos, 'departamentos', u.departamento, donde);
    }
    if (u.estado === 'bloqueado') {
      const largo = (u.motivoBloqueo ?? '').trim().length;
      s.exigir(largo >= 30 && largo <= 400, `${donde}: motivoBloqueo debe tener de 30 a 400 caracteres (tiene ${largo})`);
    } else {
      s.exigir(!u.motivoBloqueo, `${donde}: solo un usuario bloqueado lleva motivoBloqueo`);
    }
  }
}

module.exports = {
  async up(queryInterface) {
    validar(await s.cargarCatalogos());
    const { fecha } = s.crearFechas();
    const ahora = new Date();

    await queryInterface.sequelize.transaction(async (transaction) => {
      const [base] = await s.select(
        queryInterface,
        'SELECT "passwordHash" FROM usuarios WHERE id = :id',
        { id: datos.referencias.coordinador },
        transaction
      );
      s.exigir(base, `no existe ${datos.referencias.coordinador}. Corre primero el seeder de HU-1 (20261104000001-datos-hu1.cjs).`);
      await s.periodosPorSemestre(queryInterface, [datos.referencias.periodoActual], transaction);

      await s.insertar(
        queryInterface,
        'periodos',
        datos.periodos.map((p) => ({ ...p, creadoEn: ahora, actualizadoEn: ahora })),
        transaction
      );

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
          passwordHash: base.passwordHash,
          telefono: u.telefono ?? '',
          carrera: u.carrera ?? null,
          ciclo: u.ciclo ?? null,
          codigoAlumno: u.codigoAlumno ?? null,
          gradoAcademico: u.gradoAcademico ?? null,
          departamento: u.departamento ?? null,
          cargo: null,
          motivoBloqueo: u.motivoBloqueo ?? null,
          notificaciones: JSON.stringify({ entregables: true, retroalimentacion: true, resumenSemanal: false }),
          ultimoIngreso: u.ultimoIngresoDias == null ? null : fecha(u.ultimoIngresoDias, '08:30'),
          creadoEn: fecha(u.creadoDias, '09:00'),
          actualizadoEn: ahora,
        })),
        transaction
      );

      // Un id que ya existía con otro correo es de otra historia: no se mezcla con estos datos.
      const filas = await s.select(queryInterface, 'SELECT id, correo FROM usuarios WHERE id IN (:ids)', { ids: IDS }, transaction);
      const correos = new Map(filas.map((f) => [f.id, f.correo]));
      for (const u of datos.usuarios) {
        s.exigir(correos.has(u.id), `no se pudo insertar ${u.id} (${u.correo}): el correo o el código ya los usa otro usuario.`);
        s.exigir(correos.get(u.id) === u.correo, `el id ${u.id} ya existe con otro correo (${correos.get(u.id)}).`);
      }
      await s.periodosPorSemestre(queryInterface, SEMESTRES_NUEVOS, transaction);
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.bulkDelete('usuarios', { id: IDS }, { transaction });

      // periodos no guarda quién creó la fila: 2026-1 se borra solo si nada lo usa.
      const referencias = [];
      for (const tabla of ['etapas', 'trabajos', 'cupos_asesor']) {
        if (await s.tablaExiste(queryInterface, tabla, transaction)) {
          referencias.push(`NOT EXISTS (SELECT 1 FROM "${tabla}" x WHERE x."periodoId" = p.id)`);
        }
      }
      const condicion = referencias.length ? ` AND ${referencias.join(' AND ')}` : '';
      await queryInterface.sequelize.query(`DELETE FROM periodos p WHERE p.semestre IN (:semestres)${condicion}`, {
        replacements: { semestres: SEMESTRES_NUEVOS },
        transaction,
      });
    });
  },
};
