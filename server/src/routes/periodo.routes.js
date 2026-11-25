import { Router } from 'express';
import * as c from '../controllers/periodo.controller.js';
import { asincrono } from '../utils/asincrono.js';

// Público: lo usan la landing, el proceso, el cronograma, el nav y el footer.
const router = Router();

router.get('/', asincrono(c.obtenerActivo));

export default router;
