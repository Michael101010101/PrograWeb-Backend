// .sequelizerc.cjs — rutas que usa sequelize-cli (migraciones, modelos, seeders y configuración)
const path = require('path');

module.exports = {
  config: path.resolve('src/db/config', 'config.cjs'),
  'models-path': path.resolve('src/db', 'models'),
  'seeders-path': path.resolve('src/db', 'seeders'),
  'migrations-path': path.resolve('src/db', 'migrations'),
};
