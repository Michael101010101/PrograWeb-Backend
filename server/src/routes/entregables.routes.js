import { Router } from 'express';
import * as c from '../controllers/entregables.controller.js';
import { autenticar, autorizar } from '../middlewares/autenticar.js';
import { asincrono } from '../utils/asincrono.js';

// HU-4 · Estudiante: su plan de entregables (pantallas 4.1, 4.3 y 4.4).
// Se monta en /api/entregables (ver routes/index.js).
const router = Router();
router.use(autenticar, autorizar('estudiante'));

router.get('/mi-plan', asincrono(c.miPlan));
router.post('/:id/avances', asincrono(c.registrarAvance));
router.post('/:id/ampliaciones', asincrono(c.solicitarAmpliacion));

export default router;
