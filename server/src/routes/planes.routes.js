import { Router } from 'express';
import * as c from '../controllers/entregables.controller.js';
import { autenticar, autorizar } from '../middlewares/autenticar.js';
import { asincrono } from '../utils/asincrono.js';

// HU-4 · Asesor: define el plan de cada asesorado (pantalla 4.2).
// Se monta en /api/planes (ver routes/index.js).
const router = Router();
router.use(autenticar, autorizar('asesor'));

router.get('/', asincrono(c.listarPlanes));
router.get('/:trabajoId', asincrono(c.obtenerPlan));
router.post('/:trabajoId/entregables', asincrono(c.crearEntregable));
router.put('/:trabajoId/entregables/:id', asincrono(c.editarEntregable));
router.delete('/:trabajoId/entregables/:id', asincrono(c.eliminarEntregable));
router.post('/:trabajoId/plantilla', asincrono(c.aplicarPlantilla));
router.patch('/:trabajoId/ampliaciones/:id', asincrono(c.responderAmpliacion));

export default router;
