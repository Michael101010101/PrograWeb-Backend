import * as repo from '../repositories/adminTablero.repository.js';
import * as periodos from '../repositories/periodos.repository.js';
import { pesosPorTrabajo } from '../repositories/adminTrabajos.repository.js';
import { codigo, porcentaje, ESTADOS, ESTADOS_VENCIBLES } from './adminTrabajos.service.js';
import { CATALOGOS } from '../config/catalogos.js';
import HttpError from '../utils/HttpError.js';

// HU-7 · Tablero y Distribución (coordinación). Solo lectura. No conoce Express ni Sequelize.

const ESTADOS_SUSTENTACION = [
  { valor: 'programada', etiqueta: 'Programada' },
  { valor: 'realizada', etiqueta: 'Realizada' },
  { valor: 'reprogramada', etiqueta: 'Reprogramada' },
  { valor: 'desaprobada', etiqueta: 'Desaprobada' },
];
/** Aún por ocurrir. */
const SUSTENTACION_PENDIENTE = ['programada', 'reprogramada'];
/** Ya ocurrieron (aprobada o no). */
const SUSTENTACION_OCURRIDA = ['realizada', 'desaprobada'];

const ESTADO_EN_DESARROLLO = 'en_desarrollo';
const VENCIDOS_LIMITE = 10;
const PROXIMAS_LIMITE = 5;
const MS_POR_DIA = 86400000;
const RE_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

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

/** Fecha AAAA-MM-DD opcional → { texto, fecha } (medianoche local); inválida → { error }. */
function leerFecha(valor) {
  if (valor === undefined || valor === '') return {};
  const m = typeof valor === 'string' ? RE_FECHA.exec(valor) : null;
  if (!m) return { error: 'Usa el formato AAAA-MM-DD.' };
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const fecha = new Date(a, mes - 1, d);
  if (fecha.getFullYear() !== a || fecha.getMonth() !== mes - 1 || fecha.getDate() !== d) {
    return { error: 'La fecha no existe.' };
  }
  return { texto: valor, fecha };
}

const inicioDelDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const diaSiguiente = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

function textoFecha(d) {
  const dd = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`;
}

/** Días de calendario (hora local) desde `fecha` hasta `ahora`. */
function diasDesde(fecha, ahora) {
  return Math.round((inicioDelDia(ahora) - inicioDelDia(new Date(fecha))) / MS_POR_DIA);
}

/** Cuenta por valor de un catálogo [{ valor, etiqueta }], con 0 en los que no aparecen. */
function conTotales(catalogo, conteos) {
  const mapa = new Map(conteos.map((c) => [c.estado, c.total]));
  return catalogo.map((e) => ({ ...e, total: mapa.get(e.valor) ?? 0 }));
}

const vistaPeriodo = (p) => (p ? { id: p.id, semestre: p.semestre } : null);
const vistaTrabajo = (t) => ({ id: t.id, codigo: codigo(t), titulo: t.titulo });

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

  const ahora = new Date();
  const [porEstado, idsEnDesarrollo, vencidos, sustentaciones, proximas] = await Promise.all([
    repo.conteoPorEstado(periodo.id),
    repo.idsPorEstado(periodo.id, ESTADO_EN_DESARROLLO),
    repo.entregablesVencidos({
      periodoId: periodo.id,
      estadoTrabajo: ESTADO_EN_DESARROLLO,
      ahora,
      estados: ESTADOS_VENCIBLES,
      limite: VENCIDOS_LIMITE,
    }),
    repo.sustentacionesPorEstado(periodo.id),
    repo.proximasSustentaciones({
      periodoId: periodo.id,
      hoy: textoFecha(ahora),
      estados: SUSTENTACION_PENDIENTE,
      limite: PROXIMAS_LIMITE,
    }),
  ]);

  // Un trabajo sin entregables cuenta como 0 %, igual que en el listado de trabajos.
  const pesos = await pesosPorTrabajo(idsEnDesarrollo);
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
        diasVencido: diasDesde(e.fechaLimite, ahora),
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
        lugar: s.sala ?? null,
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
  if (!campos.desde && !campos.hasta && d.fecha && h.fecha && d.fecha > h.fecha) {
    campos.hasta = 'Debe ser igual o posterior a la fecha de inicio.';
  }
  const p = leerPeriodoId(periodoId);
  if (p.error) campos.periodoId = p.error;
  if (Object.keys(campos).length) throw new HttpError(400, 'Revisa el rango de fechas.', { campos });

  const periodo = p.valor !== undefined ? await buscarPeriodoOFallar(p.valor) : null;

  const [lineas, conteos] = await Promise.all([
    repo.todasLasLineas(),
    repo.conteoPorLineaYCarrera({
      inicio: d.fecha,
      finExclusivo: h.fecha ? diaSiguiente(h.fecha) : undefined,
      periodoId: periodo?.id,
    }),
  ]);

  const porLineaMapa = new Map();
  const porCarreraMapa = new Map(CATALOGOS.carreras.map((c) => [c, 0]));
  let totalTrabajos = 0;
  for (const { lineaId, carrera, total } of conteos) {
    porLineaMapa.set(lineaId, (porLineaMapa.get(lineaId) ?? 0) + total);
    // Una carrera fuera del catálogo se agrega al final para que la suma cuadre.
    porCarreraMapa.set(carrera, (porCarreraMapa.get(carrera) ?? 0) + total);
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
