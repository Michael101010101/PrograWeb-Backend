// ⚠️ TEMPORAL · Punto de integración con la HU-2 (Trabajo).
// La HU-4 solo necesita LEER tres cosas del trabajo: su estado, quiénes son los integrantes y quién es el asesor.
// Mientras la HU-2 no suba su tabla `trabajos`, se usan los mismos trabajos de ejemplo de su seed.
// Cuando esté lista, se reemplaza el cuerpo de estas funciones por consultas a su modelo
// (db.Trabajo); el resto de la HU-4 no cambia porque solo usa estas funciones.

const TRABAJOS = [
  {
    id: 't-047',
    codigo: 'TFC-2026-2-047',
    titulo: 'Modelo predictivo de deserción en estudiantes de primer ciclo',
    linea: 'Ciencia de datos aplicada',
    estado: 'en_desarrollo',
    integrantes: ['u-001', 'u-002'],
    asesor: { usuarioId: 'u-101', nombre: 'Dra. Mariela Quispe Ramos', correo: 'mquispe@ulima.edu.pe', trato: 'tu asesora' },
  },
  {
    // Trabajo sin plan todavía: sirve para probar "Usar plantilla del ciclo" con la asesora u-101.
    id: 't-015',
    codigo: 'TFC-2026-2-015',
    titulo: 'Plataforma de tutoría entre pares para cursos de matemática básica',
    linea: 'Innovación educativa',
    estado: 'en_desarrollo',
    integrantes: [],
    asesor: { usuarioId: 'u-101', nombre: 'Dra. Mariela Quispe Ramos', correo: 'mquispe@ulima.edu.pe', trato: 'tu asesora' },
  },
  {
    id: 't-012',
    codigo: 'TFC-2026-2-012',
    titulo: 'Optimización de rutas de reparto para comercios de Lima Metropolitana',
    linea: 'Gestión de operaciones',
    estado: 'concluido',
    integrantes: ['u-004', 'u-003'],
    asesor: { usuarioId: 'u-102', nombre: 'Mg. Julio Vargas Aliaga', correo: 'jvargas@ulima.edu.pe', trato: 'tu asesor' },
  },
];

/** Trabajo con ese id ('t-047'), o null. */
export async function buscarPorId(id) {
  return TRABAJOS.find((t) => t.id === id) ?? null;
}

/** Trabajo vigente del estudiante (lo integra), o null. */
export async function buscarDeEstudiante(usuarioId) {
  return TRABAJOS.find((t) => t.integrantes.includes(usuarioId)) ?? null;
}

/** Trabajos que asesora el usuario. */
export async function listarDeAsesor(usuarioId) {
  return TRABAJOS.filter((t) => t.asesor?.usuarioId === usuarioId);
}
