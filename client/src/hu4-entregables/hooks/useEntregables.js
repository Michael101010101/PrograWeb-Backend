import { useEffect, useState } from 'react';
import * as servicio from '../services/entregablesService.js';

/**
 * Hook propio de la HU-4: pide el plan a la API, lo guarda en un useState y expone las acciones.
 *   useEntregables()        → plan del estudiante que inició sesión (GET /api/entregables/mi-plan)
 *   useEntregables('t-047') → plan de ese trabajo, para su asesor   (GET /api/planes/t-047)
 * Cada acción espera la respuesta del servidor ({ plan, mensaje }) y actualiza el estado con el plan nuevo,
 * así React vuelve a pintar. Si el servidor responde un error, la acción lo lanza para que el modal o la
 * página muestre el mensaje.
 */
export default function useEntregables(trabajoId = null) {
  const [plan, setPlan] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Carga el plan al abrir la página (y si cambia el trabajo). Mismo patrón que DatosContext de la HU-1:
  // `activo` evita actualizar el estado si el usuario ya salió de la página antes de que responda el servidor.
  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const respuesta = trabajoId ? await servicio.obtenerPlan(trabajoId) : await servicio.obtenerMiPlan();
        if (activo) setPlan(respuesta);
      } catch (err) {
        if (activo) setError(err.message);
      } finally {
        if (activo) setCargando(false);
      }
    }
    cargar();
    return () => {
      activo = false;
    };
  }, [trabajoId]);

  // Ejecuta la petición y reemplaza el plan por el que devuelve el servidor.
  const ejecutar = async (peticion) => {
    const respuesta = await peticion;
    setPlan(respuesta.plan);
    return respuesta;
  };

  return {
    plan,
    cargando,
    error,
    // Estudiante
    registrarAvance: (entregableId, avance) => ejecutar(servicio.registrarAvance(entregableId, avance)),
    solicitarAmpliacion: (entregableId, solicitud) => ejecutar(servicio.solicitarAmpliacion(entregableId, solicitud)),
    // Asesor
    guardarEntregable: (formulario, entregableId) => ejecutar(servicio.guardarEntregable(trabajoId, formulario, entregableId)),
    eliminarEntregable: (entregableId) => ejecutar(servicio.eliminarEntregable(trabajoId, entregableId)),
    aplicarPlantilla: () => ejecutar(servicio.aplicarPlantilla(trabajoId)),
    responderAmpliacion: (ampliacionId, aceptar) => ejecutar(servicio.responderAmpliacion(trabajoId, ampliacionId, aceptar)),
  };
}
