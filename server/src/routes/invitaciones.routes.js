import { Router } from 'express';
import * as c from '../controllers/invitaciones.controller.js';
import { autenticar, autorizar } from '../middlewares/autenticar.js';
import { asincrono } from '../utils/asincrono.js';

const router = Router();

router.use(autenticar, autorizar('coordinador'));
router.get('/', asincrono(c.listar));
router.post('/', asincrono(c.crear));
router.delete('/:codigo', asincrono(c.anular));

export default router;
