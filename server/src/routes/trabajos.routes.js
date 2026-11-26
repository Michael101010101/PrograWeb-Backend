import { Router } from 'express';
import * as c from '../controllers/trabajos.controller.js';
import { autenticar, autorizar } from '../middlewares/autenticar.js';
import { asincrono } from '../utils/asincrono.js';

const router = Router();
const estudiante = [autenticar, autorizar('estudiante')];

router.get('/catalogos', asincrono(c.catalogos));

router.get('/mio', ...estudiante, asincrono(c.miTrabajo));
router.get('/mio/resumen', ...estudiante, asincrono(c.resumen));
router.get('/mios', ...estudiante, asincrono(c.misTrabajos));
router.get('/estudiantes', ...estudiante, asincrono(c.buscarEstudiantes));
router.post('/', ...estudiante, asincrono(c.crear));
router.put('/:id', ...estudiante, asincrono(c.actualizar));
router.put('/:id/equipo', ...estudiante, asincrono(c.guardarEquipo));
router.patch('/:id/estado', ...estudiante, asincrono(c.cambiarEstado));

router.get('/:id', autenticar, asincrono(c.obtener));

export default router;