import * as repo from '../repositories/adminTablero.repository.js';
import * as fuentes from '../repositories/adminFuentes.repository.js';
import * as periodos from '../repositories/periodos.repository.js';
import { porcentaje, ESTADOS } from './adminTrabajos.service.js';
import { CATALOGOS } from '../config/catalogos.js';
import HttpError from '../utils/HttpError.js';
import { hoyEnLima } from '../utils/fechas.js';

// HU-7 · Tablero y Distribución (coordinación). Solo lectura. No conoce Express ni Sequelize.
// Trabajos y líneas desde adminTablero.repository; entregables y sustentaciones (HU-4/HU-6) desde adminFuentes.

const ESTADOS_SUSTENTACION = [
  { valor: 'programada', etiqueta: 'Programada' },
  { valor: 'realizada', etiqueta: 'Realizada' },
  { valor: 'reprogramada', etiqueta: 'Reprogramada' },
  { valor: 'desaprobada', etiqueta: 'Desaprobada' },
];
/** Aún por ocurrir. */
const SUSTENTACION_PENDIENTE = fuentes.SUSTENTACION_PENDIENTE;
/** Ya ocurrieron (aprobada o no). */
const SUSTENTACION_OCURRIDA = ['realizada', 'desaprobada'];

const ESTADO_EN_DESARROLLO = 'en_desarrollo';
const VENCIDOS_LIMITE = 10;
const PROXIMAS_LIMITE = 5;
const MS_POR_DIA = 86400000;
const RE_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Lima no tiene horario de verano: siempre UTC−5. */
const DESFASE_LIMA = '-05:00';
/** Agrupa los trabajos sin carrera (HU-3 guarda '' o null). */
const SIN_CARRERA = 'Sin carrera';

/* ─────────── Utilidades ─────────── */

/** Entero positivo opcional de la query: undefined → valor por defecto; inválido → { error }. */
function leerEntero(valor, porDefecto) {
  if (valor === undefined || valor === '') return { valor: porDefecto };
  if (typeof valor !== 'string' || !/^\d+$/.test(valor)) return { error: true };
  return { valor: Number(valor) };
}

function leerPeriodoId(valor) {
  const p = leerEntero(valor, undefined);
  return p.error || (p.valor !== undefined && p.valor < 1) ? { error: 'Periodo no válido.' } : p;
}

/** Fecha AAAA-MM-DD opcional → { texto } si existe en el calendario; inválida → { error }. */
function leerFecha(valor) {
  if (valor === undefined || valor === '') return {};
  const m = typeof valor === 'string' ? RE_FECHA.exec(valor) : null;
  if (!m) return { error: 'Usa el formato AAAA-MM-DD.' };
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const fecha = new Date(Date.UTC(a, mes - 1, d));
  if (fecha.getUTCFullYear() !== a || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== d) {
    return { error: 'La fecha no existe.' };
  }
  return { texto: valor };
}

/** 'AAAA-MM-DD' → instante de la medianoche de ese día en Lima. */
const inicioDelDiaEnLima = (texto) => new Date(`${texto}T00:00:00${DESFASE_LIMA}`);

/** 'AAAA-MM-DD' → 'AAAA-MM-DD' del día siguiente. */
function diaSiguiente(texto) {
  const d = new Date(`${texto}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Días de calendario entre dos fechas 'AAAA-MM-DD' (hasta − desde). */
const diasEntre = (desde, hasta) => Math.round((new Date(`${hasta}T00:00:00Z`) - new Date(`${desde}T00:00:00Z`)) / MS_POR_DIA);

/** Cuenta por valor de un catálogo [{ valor, etiqueta }], con 0 en los que no aparecen. */
function conTotales(catalogo, conteos) {
  const mapa = new Map(conteos.map((c) => [c.estado, c.total]));
  return catalogo.map((e) => ({ ...e, total: mapa.get(e.valor) ?? 0 }));
}

const vistaPeriodo = (p) => (p ? { id: p.id, semestre: p.semestre } : null);
const vistaTrabajo = (t) => ({ id: t.id, codigo: t.codigo, titulo: t.titulo });

async function buscarPeriodoOFallar(id) {
  const periodo = await repo.buscarPeriodo(id);
  if (!periodo) throw new HttpError(404, 'No existe el periodo.');
  return periodo;
}

/* ─────────── Tablero ─────────── */

export async function tablero({ periodoId } = {}) {
  const p = leerPeriodoId(periodoId);
  if (p.error) throw new HttpError(400, 'Revisa los filtros del tablero.', { campos: { periodoId: p.error } });

  let periodo;
  if (p.valor !== undefined) periodo = await buscarPeriodoOFallar(p.valor);
  else {
    periodo = await periodos.buscarActivo();
    if (!periodo) throw new HttpError(409, 'No hay un periodo activo.');
  }

  const hoy = hoyEnLima();
  const [porEstado, idsEnDesarrollo, vencidos, sustentaciones, proximas] = await Promise.all([
    repo.conteoPorEstado(periodo.id),
    repo.idsPorEstado(periodo.id, ESTADO_EN_DESARROLLO),
    fuentes.entregablesVencidos({ periodoId: periodo.id, limite: VENCIDOS_LIMITE }),
    fuentes.sustentacionesPorEstado(periodo.id),
    fuentes.proximasSustentaciones({ periodoId: periodo.id, hoy, limite: PROXIMAS_LIMITE }),
  ]);

  // Promedio simple del avance de los trabajos en desarrollo; uno sin plan cuenta como 0 %.
  const pesos = await fuentes.pesosPorTrabajo(idsEnDesarrollo);
  const avances = new Map(pesos.map((x) => [x.trabajoId, porcentaje(x)]));
  const suma = idsEnDesarrollo.reduce((acc, id) => acc + (avances.get(id) ?? 0), 0);

  const sustPorEstado = conTotales(ESTADOS_SUSTENTACION, sustentaciones);
  const sumar = (valores) => sustPorEstado.filter((e) => valores.includes(e.valor)).reduce((a, e) => a + e.total, 0);

  return {
    periodo: vistaPeriodo(periodo),
    trabajosPorEstado: conTotales(ESTADOS, porEstado),
    avancePromedio: idsEnDesarrollo.length ? Math.round(suma / idsEnDesarrollo.length) : null,
    entregablesVencidos: {
      total: vencidos.total,
      lista: vencidos.filas.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        trabajo: vistaTrabajo(e.trabajo),
        fechaLimite: e.fechaLimite,
        diasVencido: diasEntre(e.fechaLimite, hoy),
      })),
    },
    sustentaciones: {
      porEstado: sustPorEstado,
      programadas: sumar(SUSTENTACION_PENDIENTE),
      realizadas: sumar(SUSTENTACION_OCURRIDA),
      proximas: proximas.map((s) => ({
        id: s.id,
        trabajo: vistaTrabajo(s.trabajo),
        fecha: s.fecha,
        hora: s.hora,
        modalidad: s.modalidad,
        estado: s.estado,
        lugar: s.lugar,
      })),
    },
  };
}

/* ─────────── Distribución ─────────── */

export async function distribucion({ desde, hasta, periodoId } = {}) {
  const campos = {};
  const d = leerFecha(desde);
  if (d.error) campos.desde = d.error;
  const h = leerFecha(hasta);
  if (h.error) campos.hasta = h.error;
  if (!campos.desde && !campos.hasta && d.texto && h.texto && d.texto > h.texto) {
    campos.hasta = 'Debe ser igual o posterior a la fecha de inicio.';
  }
  const p = leerPeriodoId(periodoId);
  if (p.error) campos.periodoId = p.error;
  if (Object.keys(campos).length) throw new HttpError(400, 'Revisa el rango de fechas.', { campos });

  const periodo = p.valor !== undefined ? await buscarPeriodoOFallar(p.valor) : null;

  const [lineas, conteos] = await Promise.all([
    repo.todasLasLineas(),
    repo.conteoPorLineaYCarrera({
      inicio: d.texto ? inicioDelDiaEnLima(d.texto) : undefined,
      finExclusivo: h.texto ? inicioDelDiaEnLima(diaSiguiente(h.texto)) : undefined,
      periodoId: periodo?.id,
    }),
  ]);

  const porLineaMapa = new Map();
  const porCarreraMapa = new Map(CATALOGOS.carreras.map((c) => [c, 0]));
  let totalTrabajos = 0;
  for (const { lineaId, carrera, total } of conteos) {
    porLineaMapa.set(lineaId, (porLineaMapa.get(lineaId) ?? 0) + total);
    // Sin carrera, o una fuera del catálogo, se agrega al final para que la suma cuadre.
    const clave = carrera ? carrera : SIN_CARRERA;
    porCarreraMapa.set(clave, (porCarreraMapa.get(clave) ?? 0) + total);
    totalTrabajos += total;
  }

  return {
    porLinea: lineas.map((l) => ({ lineaId: l.id, nombre: l.nombre, total: porLineaMapa.get(l.id) ?? 0 })),
    porCarrera: [...porCarreraMapa].map(([carrera, total]) => ({ carrera, total })),
    totalTrabajos,
    rango: { desde: d.texto ?? null, hasta: h.texto ?? null },
    periodo: vistaPeriodo(periodo),
  };
}
