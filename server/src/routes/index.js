import { Router } from 'express';
import authRoutes from './auth.routes.js';
import cuentaRoutes from './cuenta.routes.js';
import invitacionesRoutes from './invitaciones.routes.js';
import { CATALOGOS } from '../config/catalogos.js';

// Punto único donde cada historia monta sus rutas.
const router = Router();

router.get('/salud', (_req, res) => res.json({ estado: 'ok' }));
router.get('/catalogos', (_req, res) => res.json(CATALOGOS));

// HU-1 · Cuenta y acceso
router.use('/auth', authRoutes);
router.use('/cuenta', cuentaRoutes);
router.use('/invitaciones', invitacionesRoutes);

// HU-2 a HU-7: router.use('/trabajos', trabajosRoutes); …

export default router;
