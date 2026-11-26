import { Router } from 'express';
import { autenticar, autorizar } from '../middlewares/autenticar.js';
import adminUsuariosRoutes from './adminUsuarios.routes.js';
import adminTrabajosRoutes from './adminTrabajos.routes.js';

// HU-7 · Router raíz de /api/admin. Protege todos los tramos una sola vez.
// Para agregar un tramo nuevo (trabajos, asesores, tablero) basta con montarlo aquí.

const router = Router();
router.use(autenticar, autorizar('coordinador'));

router.use(adminUsuariosRoutes);
router.use(adminTrabajosRoutes);

export default router;
