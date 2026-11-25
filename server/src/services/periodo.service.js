import * as periodos from '../repositories/periodos.repository.js';
import HttpError from '../utils/HttpError.js';

// Datos del periodo activo: semestre, cronograma y contacto de la oficina.
// El estado de cada etapa se calcula con la fecha de hoy (hora de Lima).

function hoyEnLima() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }); // AAAA-MM-DD
}

function diaMes(fecha) {
  const [, mes, dia] = fecha.split('-');
  return `${dia}/${mes}`;
}

function estadoDe(etapa, hoy) {
  if (hoy > etapa.fin) return 'cerrada';
  if (hoy >= etapa.inicio) return 'en_curso';
  return 'pendiente';
}

export async function obtenerPeriodoActivo() {
  const periodo = await periodos.buscarActivo();
  if (!periodo) throw new HttpError(404, 'No hay un periodo activo configurado.');

  const hoy = hoyEnLima();
  const etapas = periodo.etapas.map((e) => ({
    numero: e.numero,
    nombre: e.nombre,
    titulo: e.titulo,
    responsable: e.responsable,
    descripcion: e.descripcion,
    inicio: e.inicio,
    fin: e.fin,
    rango: `${diaMes(e.inicio)} – ${diaMes(e.fin)}`,
    estado: estadoDe(e, hoy),
  }));
  const actual = etapas.find((e) => e.estado === 'en_curso') ?? null;

  return {
    semestre: periodo.semestre,
    totalEtapas: etapas.length,
    etapaActual: actual ? { numero: actual.numero, nombre: actual.nombre, fin: actual.fin } : null,
    etapas,
    contacto: {
      correo: periodo.correoContacto,
      anexo: periodo.anexo,
      mesaAyuda: periodo.mesaAyuda,
      direccion: periodo.direccion,
    },
  };
}
