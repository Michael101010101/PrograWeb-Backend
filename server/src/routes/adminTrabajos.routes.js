import { Router } from 'express';
import * as c from '../controllers/adminTrabajos.controller.js';
import { asincrono } from '../utils/asincrono.js';

// HU-7 · Tramo "Trabajos". Se monta en admin.routes.js (ya protegido con autenticar + autorizar).

const router = Router();

// /filtros va antes que /:id para que no se lea como un id.
router.get('/trabajos/filtros', asincrono(c.filtros));
router.get('/trabajos', asincrono(c.listar));
router.get('/trabajos/:id', asincrono(c.detalle));

export default router;
