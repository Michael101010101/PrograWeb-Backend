import { Router } from 'express';
import * as c from '../controllers/adminTablero.controller.js';
import { asincrono } from '../utils/asincrono.js';

// HU-7 · Tramo "Tablero y Distribución". Se monta en admin.routes.js (ya protegido con autenticar + autorizar).

const router = Router();

router.get('/tablero', asincrono(c.tablero));
router.get('/distribucion', asincrono(c.distribucion));

export default router;
