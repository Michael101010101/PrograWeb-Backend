// Puntos de integración entre historias (solo LECTURA de entidades ajenas).
// Cuando cada historia tenga su API, el dueño reemplaza el cuerpo por una llamada con api().

/** HU-2 · Trabajo vigente del estudiante: { codigo, titulo } | null */
export function obtenerTrabajoVigente(/* usuarioId */) {
  return null;
}

/** HU-3 · Asesores con cupo para la landing pública (datos de ejemplo hasta integrar la HU-3). */
export function obtenerAsesoresDestacados() {
  return [
    { id: 'u-101', iniciales: 'MQ', nombre: 'Dra. Mariela Quispe Ramos', departamento: 'Ing. de Sistemas', linea: 'Ciencia de datos aplicada', cupo: '3 de 6' },
    { id: 'u-102', iniciales: 'JV', nombre: 'Mg. Julio Vargas Aliaga', departamento: 'Ing. Industrial', linea: 'Gestión de operaciones', cupo: '2 de 5' },
    { id: 'u-104', iniciales: 'RC', nombre: 'Dr. Ricardo Cárdenas Loayza', departamento: 'Ing. Civil', linea: 'Sostenibilidad urbana', cupo: '1 de 4' },
  ];
}
