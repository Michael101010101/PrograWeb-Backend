import 'dotenv/config';

// Lee y valida las variables de entorno. Si falta una obligatoria, el servidor no arranca.
function obligatoria(nombre) {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}. Revisa tu archivo .env`);
  return valor;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  db: {
    host: obligatoria('DB_HOST'),
    name: obligatoria('DB_NAME'),
    user: obligatoria('DB_USER'),
  },
  jwtSecret: obligatoria('JWT_SECRET'),
  jwtExpira: process.env.JWT_EXPIRA ?? '8h',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  exponerEnlaces: process.env.EXPONER_ENLACES === 'true',
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM ?? 'Oficina TFC · ULIMA <tfc@ulima.edu.pe>',
  },
};
