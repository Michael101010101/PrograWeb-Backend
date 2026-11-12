/**
 * Error con código HTTP. Los servicios lo lanzan y el middleware de errores
 * lo convierte en la respuesta JSON { mensaje, campos, datos }.
 */
export default class HttpError extends Error {
  constructor(status, mensaje, { campos = {}, datos = {} } = {}) {
    super(mensaje);
    this.name = 'HttpError';
    this.status = status;
    this.campos = campos;
    this.datos = datos;
  }
}
