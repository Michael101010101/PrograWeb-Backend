import { Router } from 'express';
import * as c from '../controllers/auth.controller.js';
import { asincrono } from '../utils/asincrono.js';

const router = Router();

router.post('/login', asincrono(c.login));
router.post('/registro/estudiante', asincrono(c.registrarEstudiante));
router.post('/registro/asesor', asincrono(c.registrarAsesor));
router.post('/registro/coordinador', asincrono(c.registrarCoordinador));
router.get('/invitaciones/:codigo', asincrono(c.consultarInvitacion));
router.post('/verificar/:token', asincrono(c.verificarCorreo));
router.post('/verificacion/reenviar', asincrono(c.reenviarVerificacion));
router.post('/recuperar', asincrono(c.solicitarRecuperacion));
router.get('/recuperar/:token', asincrono(c.validarEnlaceRecuperacion));
router.post('/recuperar/:token', asincrono(c.restablecerPassword));

export default router;
