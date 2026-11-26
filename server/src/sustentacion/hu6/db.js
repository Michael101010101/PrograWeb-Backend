import pg from 'pg';
import config from '../../db/config/config.cjs';

const db = config[process.env.NODE_ENV || 'development'] || config.development;
export const pool = new pg.Pool({
  host: db.host, port: db.port, database: db.database, user: db.username, password: db.password,
  ssl: db.dialectOptions?.ssl || false,
  max: process.env.VERCEL ? 3 : 10,
  connectionTimeoutMillis: 8000,
  types: { getTypeParser: (oid, format) => oid === 1082 && format !== 'binary' ? String : pg.types.getTypeParser(oid, format) },
});
pool.on('error', (e) => console.error('Error en conexión inactiva de PostgreSQL:', e.message));

export async function transaccion(fn, { bloqueo = false } = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Bloqueo para evitar condiciones de carrera al reservar sala, asignar jurados y numerar ids.
    if (bloqueo) await client.query('LOCK TABLE public.sustentaciones, hu6.jurados, hu6.reservas_sala IN SHARE ROW EXCLUSIVE MODE');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
