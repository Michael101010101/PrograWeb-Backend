// PROVISIONAL, dueños HU-2, HU-3, HU-4, HU-5 y HU-6, se descarta cuando los dueños suban los suyos
'use strict';
// Datos de prueba de HU-7 en las tablas provisionales: trabajos, integrantes, asesorías, perfiles y líneas
// de asesor, entregables, avances, sustentaciones y jurados. Idempotente; down() borra solo sus ids.
const datos = require('./seed-data-hu7.json');
const s = require('../utils/semilla-hu7.cjs');

// En orden de inserción (las FK apuntan hacia arriba).
const TABLAS = [
  'trabajos',
  'integrantes_trabajo',
  'asesorias',
  'perfiles_asesor',
  'lineas_asesor',
  'entregables',
  'avances',
  'sustentaciones',
  'jurados_sustentacion',
];

const avancesDe = (e) => e.avances.map((a) => ({ ...a, entregableId: e.id, trabajoId: e.trabajoId, nombre: e.nombre }));
const AVANCES = datos.entregables.flatMap(avancesDe);

const IDS = {
  trabajos: datos.trabajos.map((t) => t.id),
  asesorias: datos.asesorias.map((a) => a.id),
  asesores: datos.perfilesAsesor.map((p) => p.asesorId),
  entregables: datos.entregables.map((e) => e.id),
  avances: AVANCES.map((a) => a.id),
  sustentaciones: datos.sustentaciones.map((x) => x.id),
};

/** Asesor del trabajo: el de la asesoría aceptada o finalizada (la rechazada y la pendiente no cuentan). */
function asesorPorTrabajo() {
  const mapa = new Map();
  for (const a of datos.asesorias) {
    if (a.estado === 'aceptada' || a.estado === 'finalizada') mapa.set(a.trabajoId, a.asesorId);
  }
  return mapa;
}

/** Reglas del contrato que la base no protege por sí sola. */
function validar(catalogos) {
  const trabajos = new Set(IDS.trabajos);
  const asesorDe = asesorPorTrabajo();

  for (const t of datos.trabajos) {
    const donde = `trabajo ${t.id}`;
    s.exigirCatalogo(catalogos, 'carreras', t.carrera, donde);
    s.exigir(t.integrantes.length >= 1 && t.integrantes.length <= 3, `${donde}: debe tener de 1 a 3 integrantes`);
    s.exigir(t.integrantes.filter((i) => i.responsable).length === 1, `${donde}: debe tener un solo responsable`);
    s.exigir(t.estado !== 'desistido' || t.motivoEstado, `${donde}: un trabajo desistido lleva motivoEstado`);
    s.exigir(t.palabrasClave.length > 0, `${donde}: necesita al menos una palabra clave`);
  }

  const vigentes = new Map();
  for (const a of datos.asesorias) {
    s.exigir(trabajos.has(a.trabajoId), `asesoría ${a.id}: trabajo desconocido`);
    s.exigir(a.estado !== 'rechazada' || a.motivoRechazo, `asesoría ${a.id}: una rechazada lleva motivoRechazo`);
    if (a.estado === 'aceptada') {
      s.exigir(!vigentes.has(a.trabajoId), `trabajo ${a.trabajoId}: tiene dos asesorías vigentes`);
      vigentes.set(a.trabajoId, a.id);
    }
  }

  const pesos = new Map();
  for (const e of datos.entregables) {
    s.exigir(trabajos.has(e.trabajoId), `entregable ${e.id}: trabajo desconocido`);
    pesos.set(e.trabajoId, (pesos.get(e.trabajoId) ?? 0) + e.peso);
    for (const a of e.avances) {
      const donde = `avance ${a.id}`;
      if (a.resultado === null) {
        s.exigir(a.revisionTras === null, `${donde}: sin revisar no lleva revisionTras`);
      } else {
        s.exigir(['aprobado', 'observado'].includes(a.resultado), `${donde}: resultado no válido`);
        s.exigir(a.revisionTras >= 1 && a.revisionTras <= 9, `${donde}: la revisión toma de 1 a 9 días`);
        s.exigir(a.entregaDias + a.revisionTras <= 0, `${donde}: la revisión no puede quedar en el futuro`);
      }
      s.exigir(asesorDe.has(e.trabajoId), `${donde}: el trabajo no tiene asesor que lo revise`);
    }
  }
  for (const [trabajoId, total] of pesos) {
    s.exigir(total === 100, `trabajo ${trabajoId}: los pesos suman ${total}, deben sumar 100`);
  }

  for (const x of datos.sustentaciones) {
    const donde = `sustentación ${x.id}`;
    s.exigir(x.jurado.length >= 2 && x.jurado.length <= 3, `${donde}: el jurado tiene 2 o 3 personas`);
    const presidentes = x.jurado.filter((j) => j.cargo === 'presidente');
    s.exigir(presidentes.length === 1, `${donde}: debe tener un solo presidente`);
    s.exigir(presidentes[0].id !== asesorDe.get(x.trabajoId), `${donde}: el asesor del trabajo no puede presidir el jurado`);
    s.exigir(x.modalidad !== 'presencial' || x.sala, `${donde}: una presencial lleva sala`);
    if (x.estado === 'realizada') s.exigir(x.calificacion >= 14 && x.calificacion <= 19, `${donde}: nota fuera de 14 a 19`);
    if (x.estado === 'desaprobada') s.exigir(x.calificacion >= 0 && x.calificacion < 11, `${donde}: nota desaprobatoria fuera de 0 a 10`);
    if (x.estado === 'programada' || x.estado === 'reprogramada') {
      s.exigir(x.calificacion === null && x.dias > 0, `${donde}: debe ser futura y sin nota`);
    }
  }
}

module.exports = {
  async up(queryInterface) {
    validar(await s.cargarCatalogos());
    const { fecha, dia } = s.crearFechas();
    const ahora = new Date();
    const asesorDe = asesorPorTrabajo();

    await queryInterface.sequelize.transaction(async (transaction) => {
      // Si un dueño ya subió su tabla real, no se escriben datos de prueba en ella.
      for (const tabla of TABLAS) {
        s.exigir(
          await s.esProvisional(queryInterface, tabla, transaction),
          `la tabla ${tabla} ya no es PROVISIONAL (o no existe). Este seeder no escribe en tablas de otra historia.`
        );
      }

      const usuarios = [
        ...new Set([
          ...datos.trabajos.flatMap((t) => t.integrantes.map((i) => i.id)),
          ...IDS.asesores,
          ...datos.sustentaciones.flatMap((x) => x.jurado.map((j) => j.id)),
        ]),
      ];
      await s.exigirIds(queryInterface, 'usuarios', usuarios, transaction);
      const periodos = await s.periodosPorSemestre(queryInterface, [...new Set(datos.trabajos.map((t) => t.periodo))], transaction);
      const lineas = await s.lineasPorId(queryInterface, datos.lineas, transaction);

      await s.insertar(
        queryInterface,
        'trabajos',
        datos.trabajos.map((t) => ({
          id: t.id,
          titulo: t.titulo,
          lineaId: lineas.get(t.lineaId),
          resumen: t.resumen,
          objetivos: t.objetivos,
          palabrasClave: t.palabrasClave,
          estado: t.estado,
          motivoEstado: t.motivoEstado ?? null,
          carrera: t.carrera,
          periodoId: periodos.get(t.periodo),
          fechaRegistro: fecha(t.registroDias, '11:00'),
          creadoEn: fecha(t.registroDias, '11:00'),
          actualizadoEn: ahora,
        })),
        transaction
      );
      await s.exigirIds(queryInterface, 'trabajos', IDS.trabajos, transaction);

      await s.insertar(
        queryInterface,
        'integrantes_trabajo',
        datos.trabajos.flatMap((t) =>
          t.integrantes.map((i) => ({
            trabajoId: t.id,
            estudianteId: i.id,
            esResponsable: i.responsable,
            creadoEn: fecha(t.registroDias, '11:00'),
          }))
        ),
        transaction
      );

      await s.insertar(
        queryInterface,
        'asesorias',
        datos.asesorias.map((a) => ({
          id: a.id,
          trabajoId: a.trabajoId,
          asesorId: a.asesorId,
          estado: a.estado,
          mensaje: a.mensaje ?? null,
          motivoRechazo: a.motivoRechazo ?? null,
          fechaSolicitud: fecha(a.solicitudDias, '16:00'),
          fechaInicio: a.inicioDias == null ? null : dia(a.inicioDias),
          fechaFin: a.finDias == null ? null : dia(a.finDias),
          motivoFin: a.motivoFin ?? null,
          creadoEn: fecha(a.solicitudDias, '16:00'),
          actualizadoEn: ahora,
        })),
        transaction
      );
      await s.exigirIds(queryInterface, 'asesorias', IDS.asesorias, transaction);

      await s.insertar(
        queryInterface,
        'perfiles_asesor',
        datos.perfilesAsesor.map((p) => ({
          asesorId: p.asesorId,
          experiencia: p.experiencia,
          cupoMaximo: p.cupoMaximo,
          creadoEn: ahora,
          actualizadoEn: ahora,
        })),
        transaction
      );

      await s.insertar(
        queryInterface,
        'lineas_asesor',
        datos.perfilesAsesor.flatMap((p) =>
          p.lineas.map((lineaId) => ({ asesorId: p.asesorId, lineaId: lineas.get(lineaId), creadoEn: ahora, actualizadoEn: ahora }))
        ),
        transaction
      );

      await s.insertar(
        queryInterface,
        'entregables',
        datos.entregables.map((e) => ({
          id: e.id,
          trabajoId: e.trabajoId,
          nombre: e.nombre,
          descripcion: e.descripcion ?? null,
          fechaLimite: fecha(e.limiteDias, '23:59'),
          peso: e.peso,
          obligatorio: true,
          estado: e.estado,
          creadoEn: ahora,
          actualizadoEn: ahora,
        })),
        transaction
      );
      await s.exigirIds(queryInterface, 'entregables', IDS.entregables, transaction);

      await s.insertar(
        queryInterface,
        'avances',
        AVANCES.map((a) => {
          const revisado = a.resultado !== null;
          return {
            id: a.id,
            entregableId: a.entregableId,
            version: a.version,
            enlace: `https://drive.ulima.edu.pe/tfc/${a.trabajoId}/${a.entregableId}-v${a.version}.pdf`,
            descripcion: `${a.nombre}, versión ${a.version}`,
            fechaEntrega: fecha(a.entregaDias, '18:00'),
            revisadoPor: revisado ? asesorDe.get(a.trabajoId) : null,
            fechaRevision: revisado ? fecha(a.entregaDias + a.revisionTras, '12:00') : null,
            comentarios: revisado ? a.comentarios ?? null : null,
            resultado: a.resultado,
            creadoEn: fecha(a.entregaDias, '18:00'),
            actualizadoEn: ahora,
          };
        }),
        transaction
      );
      await s.exigirIds(queryInterface, 'avances', IDS.avances, transaction);

      await s.insertar(
        queryInterface,
        'sustentaciones',
        datos.sustentaciones.map((x) => ({
          id: x.id,
          trabajoId: x.trabajoId,
          fecha: dia(x.dias),
          hora: `${x.hora}:00`,
          sala: x.sala,
          modalidad: x.modalidad,
          calificacion: x.calificacion,
          estado: x.estado,
          creadoEn: ahora,
          actualizadoEn: ahora,
        })),
        transaction
      );
      await s.exigirIds(queryInterface, 'sustentaciones', IDS.sustentaciones, transaction);

      await s.insertar(
        queryInterface,
        'jurados_sustentacion',
        datos.sustentaciones.flatMap((x) =>
          x.jurado.map((j) => ({ sustentacionId: x.id, juradoId: j.id, cargo: j.cargo, creadoEn: ahora, actualizadoEn: ahora }))
        ),
        transaction
      );
    });
  },

  async down(queryInterface) {
    // Orden inverso de FK. Las tablas puente se borran por las FK de este seeder.
    const borrar = [
      ['jurados_sustentacion', { sustentacionId: IDS.sustentaciones }],
      ['sustentaciones', { id: IDS.sustentaciones }],
      ['avances', { id: IDS.avances }],
      ['entregables', { id: IDS.entregables }],
      ['lineas_asesor', { asesorId: IDS.asesores }],
      ['perfiles_asesor', { asesorId: IDS.asesores }],
      ['asesorias', { id: IDS.asesorias }],
      ['integrantes_trabajo', { trabajoId: IDS.trabajos }],
      ['trabajos', { id: IDS.trabajos }],
    ];
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const [tabla, where] of borrar) {
        if (await s.tablaExiste(queryInterface, tabla, transaction)) {
          await queryInterface.bulkDelete(tabla, where, { transaction });
        }
      }
    });
  },
};
