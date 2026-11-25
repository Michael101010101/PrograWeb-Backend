// src/db/config/config.cjs — parámetros de conexión, leídos del .env
const dotenv = require('dotenv');
dotenv.config();

const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  dialect: 'postgres',
  logging: false,
};

module.exports = {
  development: base,
  test: base,
  production: {
    ...base,
    // Las bases en la nube (Neon, Supabase, Render) exigen conexión cifrada.
    dialectOptions: process.env.DB_SSL === 'true' ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  },
};
