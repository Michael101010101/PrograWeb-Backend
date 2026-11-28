// Repositorio de la HU-6 sobre modelos de Sequelize (patrón Repository).
// Único lugar que lee y escribe las tablas de sustentaciones; los controladores no conocen el ORM.
// Contrato: public.sustentaciones (id, trabajoId, fecha, hora, modalidad, calificacion, estado) + extras salaId, programadaEl.
import { Op } from 'sequelize';
import { models } from '../../../config/database.js';
import { CRITERIOS } from '../domain/datosSemilla.js';

const {
  Trabajo, TrabajoIntegrante, Usuario, LineaInvestigacion, Asesor, Entregable,
  Docente, Sala, ReservaSala, ConflictoTrabajo, Sustentacion, Jurado, Acta, Calificacion, Reprogramacion,
} = models;

// DATE y TIME de PostgreSQL al formato JSON que usa la interfaz React.
const fecha = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? null : String(v).slice(0, 10));
const hora = (v) => (v == null ? null : String(v).slice(0, 5));
const nombreCompleto = (...partes) => partes.filter(Boolean).join(' ');
const esAdmin = (rol) => rol === 'coordinador' || rol === 'administrador';

/** Trabajos (HU-2) con su línea, asesor, equipo, entregables (HU-4) y conflictos de jurado. */
async function leerTrabajos({ admin, usuarioId, transaction }) {
  const where = {};
  if (!admin) {
    const propios = await TrabajoIntegrante.findAll({ where: { estudianteId: usuarioId }, attributes: ['trabajoId'], transaction });
    where.id = { [Op.in]: propios.map((p) => p.trabajoId) };
  }
  return Trabajo.findAll({
    where,
    include: [
      { model: LineaInvestigacion, as: 'lineaInvestigacion', attributes: ['nombre'] },
      { model: Asesor, as: 'asesorAsignado', attributes: ['usuarioId', 'titulo', 'nombres', 'apellidos', 'departamento'] },
      { model: Entregable, as: 'entregables', attributes: ['estado'] },
      { model: ConflictoTrabajo, as: 'conflictosJurado' },
      {
        model: TrabajoIntegrante,
        as: 'integrantes',
        include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombres', 'apellidos'] }],
      },
    ],
    order: [['codigo', 'ASC'], [{ model: TrabajoIntegrante, as: 'integrantes' }, 'id', 'ASC']],
    transaction,
  });
}

/** Cuenta los entregables del plan (tabla de la HU-4; si no hay, usa el plan guardado en el trabajo). */
function contarEntregables(t) {
  if (t.entregables?.length) {
    return { total: t.entregables.length, aprobados: t.entregables.filter((e) => e.estado === 'aprobado').length };
  }
  const plan = Array.isArray(t.plan) ? t.plan : [];
  return { total: plan.length, aprobados: plan.filter((e) => e?.estado === 'aprobado').length };
}

export async function obtenerDatos({ usuarioId = null, rol = 'coordinador', transaction } = {}) {
  const admin = esAdmin(rol);
  if (!admin && rol !== 'estudiante') throw Object.assign(new Error('Rol sin permisos para esta historia.'), { status: 403 });

  // Dentro de una transacción la conexión es una sola: las consultas van una tras otra.
  // Fuera de ella se lanzan en paralelo.
  const consultas = [
    () => Docente.findAll({ order: [['id', 'ASC']], transaction }),
    () => leerTrabajos({ admin, usuarioId, transaction }),
    () => Sala.findAll({ order: [['id', 'ASC']], transaction }),
    () => (admin ? ReservaSala.findAll({ transaction }) : []),
    () => Sustentacion.findAll({
      include: [
        { model: Jurado, as: 'jurado' },
        { model: Acta, as: 'acta', include: [{ model: Calificacion, as: 'notas' }] },
        { model: Reprogramacion, as: 'historial' },
      ],
      order: [['fecha', 'ASC'], ['hora', 'ASC'], ['id', 'ASC'],
        [{ model: Jurado, as: 'jurado' }, 'presidente', 'DESC'], [{ model: Jurado, as: 'jurado' }, 'docenteId', 'ASC'],
        [{ model: Reprogramacion, as: 'historial' }, 'id', 'ASC']],
      transaction,
    }),
  ];
  const resultados = [];
  if (transaction) for (const consulta of consultas) resultados.push(await consulta());
  const [docentesFilas, trabajosFilas, salasFilas, reservasFilas, sustentacionesFilas] =
    transaction ? resultados : await Promise.all(consultas.map((consulta) => consulta()));

  const docenteDeUsuario = new Map(docentesFilas.filter((d) => d.usuarioId).map((d) => [d.usuarioId, d.id]));

  const trabajos = trabajosFilas.map((t) => {
    const asesorJson = t.asesor ?? {};
    const a = t.asesorAsignado;
    return {
      id: t.id,
      codigo: t.codigo,
      titulo: t.titulo,
      linea: t.lineaInvestigacion?.nombre ?? null,
      departamento: a?.departamento ?? asesorJson.departamento ?? t.carrera ?? null,
      estado: t.estado,
      asesorId: docenteDeUsuario.get(a?.usuarioId ?? asesorJson.id) ?? null,
      asesor: asesorJson.nombre ?? (a ? nombreCompleto(a.titulo, a.nombres, a.apellidos) : ''),
      equipo: t.integrantes.map((i) => ({
        usuarioId: i.usuario.id,
        nombre: nombreCompleto(i.usuario.nombres, i.usuario.apellidos),
        corto: nombreCompleto(i.usuario.nombres.split(' ')[0], i.usuario.apellidos),
        responsable: i.esResponsable,
      })),
      entregables: contarEntregables(t),
      informeAprobadoEl: fecha(t.cerradoEn),
      conflictos: t.conflictosJurado.map((c) => ({ docenteId: c.docenteId, motivo: c.motivo })),
    };
  });

  // public.sustentaciones referencia al trabajo por id (t-012); la interfaz usa el código visible.
  const codigoDe = new Map(trabajos.map((t) => [t.id, t.codigo]));
  const sustentaciones = sustentacionesFilas
    .filter((s) => codigoDe.has(s.trabajoId))
    .map((s) => {
      const acta = s.acta;
      return {
        id: s.id,
        trabajoId: s.trabajoId,
        trabajoCodigo: codigoDe.get(s.trabajoId),
        estado: s.estado,
        programadaEl: fecha(s.programadaEl),
        fecha: fecha(s.fecha),
        hora: hora(s.hora),
        salaId: s.salaId,
        modalidad: s.modalidad,
        calificacion: s.calificacion,
        jurado: s.jurado.map((j) => ({ docenteId: j.docenteId, presidente: j.presidente })),
        acta: !acta || (!admin && !acta.registrada) ? null : {
          notas: Object.fromEntries(CRITERIOS.map((c) => {
            const nota = acta.notas.find((n) => n.criterioId === c.id);
            return [c.id, nota ? nota.nota : ''];
          })),
          resultado: acta.resultado ?? '',
          observaciones: acta.observaciones,
          registrada: acta.registrada,
          registradaEl: fecha(acta.registradaEl),
          registradaHora: hora(acta.registradaHora),
        },
        historial: admin
          ? s.historial.map((h) => ({ fecha: fecha(h.fechaAnterior), hora: hora(h.horaAnterior), salaId: h.salaAnterior, motivo: h.motivo, el: fecha(h.registradoEl) }))
          : [],
      };
    });

  return {
    docentes: docentesFilas.map((d) => ({
      id: d.id, usuarioId: d.usuarioId, titulo: d.titulo, nombres: d.nombres, apellidos: d.apellidos,
      grado: d.grado, departamento: d.departamento, juradosPrevios: d.juradosPrevios,
    })),
    trabajos,
    sustentaciones,
    reservas: reservasFilas.map((r) => ({ salaId: r.salaId, fecha: fecha(r.fecha), hora: hora(r.hora), motivo: r.motivo })),
    salas: salasFilas.map((x) => ({ id: x.id, pabellon: x.pabellon, ubicacion: x.ubicacion, asientos: x.asientos })),
  };
}

export async function insertarProgramacion(s, { transaction } = {}) {
  const trabajo = await Trabajo.findOne({ where: { codigo: s.trabajoCodigo }, attributes: ['id'], transaction });
  await Sustentacion.create({
    id: s.id,
    trabajoId: trabajo.id,
    estado: s.estado,
    programadaEl: s.programadaEl,
    fecha: s.fecha,
    hora: s.hora,
    salaId: s.salaId,
    modalidad: s.modalidad,
    calificacion: s.calificacion ?? null,
  }, { transaction });
}

export async function actualizarProgramacion(s, anterior, { transaction } = {}) {
  await Sustentacion.update(
    { estado: s.estado, fecha: s.fecha, hora: s.hora, salaId: s.salaId, modalidad: s.modalidad },
    { where: { id: s.id }, transaction }
  );
  await Reprogramacion.create({
    sustentacionId: s.id,
    fechaAnterior: anterior.fecha,
    horaAnterior: anterior.hora,
    salaAnterior: anterior.salaId,
    motivo: s.historial.at(-1).motivo,
    registradoEl: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }),
  }, { transaction });
}

export async function reemplazarJurado(s, { transaction } = {}) {
  await Jurado.destroy({ where: { sustentacionId: s.id }, transaction });
  await Jurado.bulkCreate(
    s.jurado.map((m) => ({ sustentacionId: s.id, docenteId: m.docenteId, presidente: m.presidente })),
    { transaction }
  );
}

export async function guardarActa(s, { transaction } = {}) {
  const a = s.acta;
  const final = a.registrada ? Math.round(CRITERIOS.reduce((suma, c) => suma + Number(a.notas[c.id]) * c.peso, 0) / 100) : null;
  await Acta.upsert({
    sustentacionId: s.id,
    resultado: a.resultado || null,
    observaciones: a.observaciones ?? '',
    registrada: a.registrada,
    registradaEl: a.registradaEl ?? null,
    registradaHora: a.registradaHora ?? null,
  }, { transaction });
  await Calificacion.destroy({ where: { sustentacionId: s.id }, transaction });
  const notas = CRITERIOS.filter((c) => a.notas[c.id] !== '' && a.notas[c.id] != null)
    .map((c) => ({ sustentacionId: s.id, criterioId: c.id, nota: Number(a.notas[c.id]) }));
  if (notas.length) await Calificacion.bulkCreate(notas, { transaction });
  // Al registrar el acta definitiva se cierra la sustentación: estado (realizada/desaprobada) y calificación final.
  if (a.registrada) await Sustentacion.update({ estado: s.estado, calificacion: final }, { where: { id: s.id }, transaction });
}
