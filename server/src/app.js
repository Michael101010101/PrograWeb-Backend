import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import rutas from './routes/index.js';
import { manejarErrores, rutaNoEncontrada } from './middlewares/manejarErrores.js';

const app = express();

app.use(cors({ origin: env.clientUrls }));
app.use(express.json());

app.get('/', (_req, res) => res.json({ mensaje: 'API de Trabajos de Fin de Carrera funcionando', docs: '/api/salud' }));
app.use('/api', rutas);

app.use(rutaNoEncontrada);
app.use(manejarErrores);

export default app;
