import { Router } from 'express';
import * as c from '../controllers/asesores.controller.js';
import * as s from '../controllers/solicitudes.controller.js';
import { autenticar, autorizar } from '../middlewares/autenticar.js';
import { asincrono } from '../utils/asincrono.js';

// HU-3 · /api/asesores
const router = Router();
const soloAsesor = [autenticar, autorizar('asesor')];

// Públicas: directorio (también lo ve el visitante sin sesión)
router.get('/', asincrono(c.listar));
router.get('/destacados', asincrono(c.destacados));

// Rol asesor: su ficha, su bandeja y sus asesorados (van antes de /:id para no confundirse)
router.get('/me', soloAsesor, asincrono(c.miFicha));
router.put('/me', soloAsesor, asincrono(c.actualizarFicha));
router.get('/me/solicitudes', soloAsesor, asincrono(s.bandeja));
router.get('/me/asesorados', soloAsesor, asincrono(c.misAsesorados));
router.get('/me/asesorados/:codigo', soloAsesor, asincrono(c.asesorado));
router.post('/me/asesorados/:codigo/terminar', soloAsesor, asincrono(c.terminarAsesoria));

// Pública: otros asesores de la misma línea con cupo
router.get('/:id/alternativas', asincrono(c.alternativas));

export default router;
