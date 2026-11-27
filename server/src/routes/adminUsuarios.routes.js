import { Router } from 'express';
import * as c from '../controllers/adminUsuarios.controller.js';
import { asincrono } from '../utils/asincrono.js';

// HU-7 · Tramo "Usuarios". Se monta en admin.routes.js (ya protegido con autenticar + autorizar).

const router = Router();

router.get('/usuarios', asincrono(c.listar));
router.patch('/usuarios/:id/bloquear', asincrono(c.bloquear));
router.patch('/usuarios/:id/desbloquear', asincrono(c.desbloquear));
router.patch('/usuarios/:id/validar', asincrono(c.validar));

export default router;
