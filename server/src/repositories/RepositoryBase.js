/**
 * Repositorio base (patrón Repository).
 * Encapsula las operaciones CRUD comunes sobre un modelo de Sequelize para que los
 * repositorios concretos solo agreguen las consultas propias de su entidad.
 * Siempre devuelve objetos simples (no instancias de Sequelize), así los servicios
 * no dependen del ORM.
 */
export default class RepositoryBase {
  /** @param {import('sequelize').ModelStatic<any>} modelo */
  constructor(modelo) {
    this.modelo = modelo;
  }

  /** Convierte una instancia de Sequelize en objeto simple. Los hijos pueden redefinirlo. */
  aObjeto(instancia) {
    return instancia ? instancia.get({ plain: true }) : null;
  }

  async buscarTodos(opciones = {}) {
    const filas = await this.modelo.findAll(opciones);
    return filas.map((fila) => this.aObjeto(fila));
  }

  async buscarUno(where, opciones = {}) {
    return this.aObjeto(await this.modelo.findOne({ where, ...opciones }));
  }

  async buscarPorId(id, opciones = {}) {
    return this.aObjeto(await this.modelo.findByPk(id, opciones));
  }

  async crear(datos, opciones = {}) {
    return this.aObjeto(await this.modelo.create(datos, opciones));
  }

  /** Actualiza un registro por su clave primaria. Devuelve null si no existe. */
  async actualizar(id, cambios, opciones = {}) {
    const instancia = await this.modelo.findByPk(id, opciones);
    if (!instancia) return null;
    await instancia.update(cambios, opciones);
    return this.aObjeto(instancia);
  }

  /** Actualiza todos los registros que cumplen el filtro. Devuelve cuántos cambió. */
  async actualizarDonde(cambios, where, opciones = {}) {
    const [cantidad] = await this.modelo.update(cambios, { where, ...opciones });
    return cantidad;
  }

  async crearOActualizar(datos, opciones = {}) {
    await this.modelo.upsert(datos, opciones);
  }

  async eliminarDonde(where, opciones = {}) {
    return this.modelo.destroy({ where, ...opciones });
  }
}
