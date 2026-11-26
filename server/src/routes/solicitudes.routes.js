import { Router } from 'express';
import * as c from '../controllers/solicitudes.controller.js';
import { autenticar, autorizar } from '../middlewares/autenticar.js';
import { asincrono } from '../utils/asincrono.js';

// HU-3 · /api/solicitudes (todas exigen sesión)
const router = Router();
router.use(autenticar);

// Estudiante: enviar, ver el estado y retirar su solicitud
router.get('/mia', autorizar('estudiante'), asincrono(c.mia));
router.post('/', autorizar('estudiante'), asincrono(c.crear));
router.patch('/:id/retirar', autorizar('estudiante'), asincrono(c.retirar));

// Asesor: responder las solicitudes que recibió
router.patch('/:id/aceptar', autorizar('asesor'), asincrono(c.aceptar));
router.patch('/:id/rechazar', autorizar('asesor'), asincrono(c.rechazar));

export default router;
