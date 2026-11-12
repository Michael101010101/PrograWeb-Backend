'use strict';
// Carga la conexión y todos los modelos. Los repositorios importan este archivo:
//   import db from '../db/models/index.cjs';  →  db.Usuario, db.Token, …
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

const entorno = process.env.NODE_ENV || 'development';
const config = require(path.join(__dirname, '..', 'config', 'config.cjs'))[entorno];

const sequelize = new Sequelize(config.database, config.username, config.password, config);
const db = {};

fs.readdirSync(__dirname)
  .filter((archivo) => archivo !== 'index.cjs' && archivo.endsWith('.cjs'))
  .forEach((archivo) => {
    const modelo = require(path.join(__dirname, archivo))(sequelize, Sequelize.DataTypes);
    db[modelo.name] = modelo;
  });

Object.values(db).forEach((modelo) => modelo.associate?.(db));

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
