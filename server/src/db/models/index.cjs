'use strict';
// Carga la conexión y todos los modelos. Los repositorios importan este archivo:
//   import db from '../db/models/index.cjs';  →  db.Usuario, db.Token, …
const Sequelize = require('sequelize');

const entorno = process.env.NODE_ENV || 'development';
const config = require('../config/config.cjs')[entorno];

const sequelize = new Sequelize(config.database, config.username, config.password, config);
const db = {};

// Lista explícita (y no fs.readdirSync) para que Vercel incluya cada archivo al empaquetar.
// Al agregar un modelo nuevo, súmalo aquí.
[
  require('./usuario.cjs'),
  require('./token.cjs'),
  require('./invitacion.cjs'),
  require('./intentoLogin.cjs'),
  require('./periodo.cjs'),
  require('./etapa.cjs'),
  require('./lineaInvestigacion.cjs'),
  require('./trabajo.cjs'),
  require('./trabajoIntegrante.cjs'),
  require('./trabajoHistorial.cjs'),
  // HU-3 · Asesores y asignación
  require('./asesor.cjs'),
  require('./solicitud.cjs'),
  require('./historialAsesoria.cjs'),
].forEach((definir) => {
  const modelo = definir(sequelize, Sequelize.DataTypes);
  db[modelo.name] = modelo;
});

Object.values(db).forEach((modelo) => modelo.associate?.(db));

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;