import { Router } from 'express';
import * as c from '../controllers/revisiones.controller.js';
import { autenticar, autorizar } from '../middlewares/autenticar.js';
import { asincrono } from '../utils/asincrono.js';

// HU-5 · Revisión y retroalimentación de avances.
// Se monta en /api/revision (ver routes/index.js).
const router = Router();
router.use(autenticar);

// Datos completos de la HU-5 para quien inició sesión (asesor o estudiante).
router.get('/mis-datos', autorizar('asesor', 'estudiante'), asincrono(c.misDatos));

// Solo el asesor revisa.
router.get('/bandeja', autorizar('asesor'), asincrono(c.bandeja));
router.post('/avances/:id/aprobar', autorizar('asesor'), asincrono(c.aprobar));
router.post('/avances/:id/observar', autorizar('asesor'), asincrono(c.observar));

// Asesor y estudiante (el servicio comprueba que sean del trabajo).
router.get('/avances/:id', autorizar('asesor', 'estudiante'), asincrono(c.detalle));
router.post('/avances/:id/comentarios', autorizar('asesor', 'estudiante'), asincrono(c.comentar));
router.get('/trabajos/:trabajoId/consolidado', autorizar('asesor', 'estudiante'), asincrono(c.consolidado));

export default router;
