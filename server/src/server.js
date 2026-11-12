import app from './app.js';
import { env } from './config/env.js';

app.listen(env.port, () => {
  console.log(`API de Trabajos de Fin de Carrera en http://localhost:${env.port}/api`);
});
