import HttpError from '../utils/HttpError.js';

/** Ruta inexistente → 404. */
export function rutaNoEncontrada(req, _res, next) {
  next(new HttpError(404, `No existe la ruta ${req.method} ${req.originalUrl}`));
}

/** Convierte cualquier error en una respuesta JSON con su código HTTP. */
// eslint-disable-next-line no-unused-vars
export function manejarErrores(error, _req, res, _next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ mensaje: error.message, campos: error.campos, datos: error.datos });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ mensaje: 'El cuerpo de la petición no es un JSON válido.' });
  }
  if (error.name === 'SequelizeUniqueConstraintError') {
    // Restricción UNIQUE (Sequelize) (por ejemplo, dos registros simultáneos con el mismo correo)
    return res.status(409).json({ mensaje: 'Ya existe un registro con esos datos.' });
  }
  console.error(error);
  return res.status(500).json({ mensaje: 'Ocurrió un error inesperado en el servidor.' });
}
