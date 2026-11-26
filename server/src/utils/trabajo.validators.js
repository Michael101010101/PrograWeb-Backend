import { LIMITES } from '../config/trabajos.js';

// HU-2 · Validaciones del servidor (las mismas del front: no se confía en el cliente).
// Que la línea exista se comprueba en el servicio contra la tabla lineas_investigacion.

export function limpiar(texto) {
  return String(texto ?? '').trim().replace(/\s+/g, ' ');
}

function largo(texto) {
  return String(texto ?? '').trim().length;
}

export function validarTrabajo(t) {
  const errores = {};

  const titulo = limpiar(t.titulo);
  if (!titulo) errores.titulo = 'Escribe el título del trabajo';
  else if (titulo.length < LIMITES.tituloMin) errores.titulo = `El título debe tener al menos ${LIMITES.tituloMin} caracteres`;
  else if (titulo.length > LIMITES.tituloMax) errores.titulo = `El título admite hasta ${LIMITES.tituloMax} caracteres`;

  if (!t.linea) errores.linea = 'Debes elegir una línea de investigación';

  const nResumen = largo(t.resumen);
  if (nResumen === 0) errores.resumen = 'Escribe el resumen del trabajo';
  else if (nResumen < LIMITES.resumenMin) errores.resumen = `El resumen debe tener al menos ${LIMITES.resumenMin} caracteres`;
  else if (nResumen > LIMITES.resumenMax) errores.resumen = `El resumen admite hasta ${LIMITES.resumenMax} caracteres`;

  const nObjetivos = largo(t.objetivos);
  if (nObjetivos === 0) errores.objetivos = 'Escribe al menos un objetivo';
  else if (nObjetivos < LIMITES.objetivosMin) errores.objetivos = `Los objetivos deben tener al menos ${LIMITES.objetivosMin} caracteres`;
  else if (nObjetivos > LIMITES.objetivosMax) errores.objetivos = `Los objetivos admiten hasta ${LIMITES.objetivosMax} caracteres`;

  const palabras = t.palabrasClave;
  if (!Array.isArray(palabras)) errores.palabrasClave = 'Las palabras clave deben ser una lista';
  else if (palabras.length < LIMITES.palabrasMin) errores.palabrasClave = `Agrega al menos ${LIMITES.palabrasMin} palabras clave`;
  else if (palabras.length > LIMITES.palabrasMax) errores.palabrasClave = `Máximo ${LIMITES.palabrasMax} palabras clave`;
  else if (palabras.some((p) => p.length < LIMITES.palabraMin || p.length > LIMITES.palabraMax)) {
    errores.palabrasClave = `Cada palabra clave debe tener entre ${LIMITES.palabraMin} y ${LIMITES.palabraMax} caracteres`;
  } else if (new Set(palabras).size !== palabras.length) errores.palabrasClave = 'Hay palabras clave repetidas';

  return errores;
}

export function validarMotivo(valor) {
  const n = largo(valor);
  if (n === 0) return 'El motivo es obligatorio';
  if (n < LIMITES.motivoMin) return `El motivo debe tener al menos ${LIMITES.motivoMin} caracteres`;
  if (n > LIMITES.motivoMax) return `El motivo admite hasta ${LIMITES.motivoMax} caracteres`;
  return null;
}