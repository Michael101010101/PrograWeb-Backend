import { Router } from 'express';
import * as c from '../controllers/adminAsesores.controller.js';
import { asincrono } from '../utils/asincrono.js';

// HU-7 · Tramo "Asesores". Se monta en admin.routes.js (ya protegido con autenticar + autorizar).

const router = Router();

router.get('/asesores', asincrono(c.listar));
router.get('/asesores/:id', asincrono(c.detalle));
router.patch('/asesores/:id/cupo', asincrono(c.ampliarCupo));
router.post('/asesores/:id/mensajes', asincrono(c.escribir));

export default router;
