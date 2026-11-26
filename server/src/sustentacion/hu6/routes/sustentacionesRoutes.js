import { Router } from 'express';
import { autenticar, autorizar } from '../../../middlewares/autenticar.js';
import HttpError from '../../../utils/HttpError.js';
import * as ctrl from '../controllers.js';

const router = Router();
const responder = (f) => (req,res,next) => Promise.resolve().then(() => f(req,res)).catch(next);
const soloCoordinacion = autorizar('coordinador');
const soloEstudiante = autorizar('estudiante');
router.use(autenticar);
router.get('/datos', responder(ctrl.datos));
router.get('/mi-sustentacion', soloEstudiante, responder(ctrl.propia));
router.get('/trabajos/concluidos', soloCoordinacion, responder(ctrl.trabajosConcluidos));
router.get('/sustentaciones', soloCoordinacion, responder(ctrl.listado));
router.get('/sustentaciones/:id', responder(ctrl.detalle));
router.get('/sustentaciones/:id/acta', responder(ctrl.acta));
router.post('/sustentaciones', soloCoordinacion, responder(ctrl.programar));
router.patch('/sustentaciones/:id/reprogramar', soloCoordinacion, responder(ctrl.reprogramar));
router.put('/sustentaciones/:id/jurado', soloCoordinacion, responder(ctrl.jurado));
router.put('/sustentaciones/:id/acta/borrador', soloCoordinacion, responder(ctrl.borrador));
router.post('/sustentaciones/:id/acta/registrar', soloCoordinacion, responder(ctrl.registrar));
router.use((error, _req, _res, next) => {
  if (error instanceof HttpError) return next(error);
  if (error.status >= 400 && error.status < 500) return next(new HttpError(error.status, error.message));
  if (error.code === '23505') return next(new HttpError(409, 'El registro ya existe.'));
  if (['23503', '23514'].includes(error.code)) return next(new HttpError(400, 'Los datos no cumplen las restricciones.'));
  next(error);
});
export default router;
