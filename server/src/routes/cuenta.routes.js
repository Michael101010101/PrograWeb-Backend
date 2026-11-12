import { Router } from 'express';
import * as c from '../controllers/cuenta.controller.js';
import { autenticar } from '../middlewares/autenticar.js';
import { asincrono } from '../utils/asincrono.js';

const router = Router();

router.get('/', autenticar, asincrono(c.obtener));
router.put('/', autenticar, asincrono(c.actualizar));

export default router;
