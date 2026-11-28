import db from '../db/models/index.cjs';

// Punto único de acceso a la base de datos (Sequelize).
// - La conexión se configura con las variables DB_* del .env (ver db/config/config.cjs,
//   que también usa sequelize-cli para las migraciones y los seeders).
// - db/models/index.cjs crea la instancia de Sequelize, registra los modelos y sus asociaciones.
// Los repositorios importan desde aquí: import { models, sequelize } from '../config/database.js';

export const sequelize = db.sequelize;
export const models = db;

/** Comprueba la conexión (útil al arrancar el servidor o en /api/salud). */
export function probarConexion() {
  return sequelize.authenticate();
}

export default db;
