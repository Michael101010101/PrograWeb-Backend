import { Router } from 'express';
import * as c from '../controllers/usuarios.controller.js';
import { autenticar, autorizar } from '../middlewares/autenticar.js';
import { asincrono } from '../utils/asincrono.js';

// Solo la coordinación administra usuarios (HU-7).
const router = Router();
router.use(autenticar, autorizar('coordinador'));

router.get('/', asincrono(c.listar));
router.get('/:id', asincrono(c.obtener));
router.patch('/:id/estado', asincrono(c.cambiarEstado));

export default router;
