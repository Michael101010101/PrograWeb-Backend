import { Router } from 'express';
import authRoutes from './auth.routes.js';
import cuentaRoutes from './cuenta.routes.js';
import invitacionesRoutes from './invitaciones.routes.js';
import usuariosRoutes from './usuarios.routes.js';
import periodoRoutes from './periodo.routes.js';
import trabajosRoutes from './trabajos.routes.js';
import asesoresRoutes from './asesores.routes.js';
import solicitudesRoutes from './solicitudes.routes.js';
import adminRoutes from './admin.routes.js';
import { CATALOGOS } from '../config/catalogos.js';

// Punto único donde cada historia monta sus rutas.
const router = Router();

router.get('/salud', (_req, res) => res.json({ estado: 'ok' }));
router.get('/catalogos', (_req, res) => res.json(CATALOGOS));
router.use('/periodo', periodoRoutes);

// HU-1 · Cuenta y acceso
router.use('/auth', authRoutes);
router.use('/cuenta', cuentaRoutes);
router.use('/invitaciones', invitacionesRoutes);

// HU-7 · Administración de usuarios (servicio expuesto por HU-1)
router.use('/usuarios', usuariosRoutes);
router.use('/admin', adminRoutes);

// HU-2 · Registro del trabajo
router.use('/trabajos', trabajosRoutes);

// HU-3 · Asesores y asignación
router.use('/asesores', asesoresRoutes);
router.use('/solicitudes', solicitudesRoutes);

export default router;