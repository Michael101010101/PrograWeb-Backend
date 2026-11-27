

## Cuentas de prueba (contraseña: `Tfc2026!`)

| Correo | Rol | Estado |
| --- | --- | --- |
| rquispe@aloe.ulima.edu.pe | Estudiante | Activo |
| drojas@aloe.ulima.edu.pe | Estudiante | Activo |
| bpalomino@aloe.ulima.edu.pe | Estudiante | Sin verificar |
| jtapia@aloe.ulima.edu.pe | Estudiante | Bloqueado |
| mquispe@ulima.edu.pe | Asesor | Activo |
| achavez@ulima.edu.pe | Asesor | Pendiente de validación |
| cvelasquez@ulima.edu.pe | Administrador | Activo |

Invitación de coordinación vigente: `/registro/coordinador?invitacion=INV-7K2P-94QX`.




## HU-6: Sustentaciones

En una copia nueva, instala las dependencias del backend con `npm ci` desde `server/`.
Configura `server/.env` a partir de `.env.example` con los datos de PostgreSQL y un JWT_SECRET propio.
Para una base nueva, desde `server/` ejecuta `npm run db:create`, `npm run db:migrate` y `npm run db:seed`.
Si la base del grupo ya tiene los datos de HU-2 y HU-3, ejecuta `npm run hu6:setup` desde `server/` con las variables de esa base. Aplica las migraciones pendientes y ejecuta únicamente el seeder de HU-6. Para una conexión que requiere DB_SSL configura también NODE_ENV=production. El servidor lee los trabajos y sus integrantes desde las tablas del grupo.

La migración enlaza `public.sustentaciones."trabajoId"` con `public.trabajos(id)`. Si ya se ejecutó el SQL anterior, conserva las sustentaciones que coinciden por ID y código. Los registros de demostración sin correspondencia se archivan con su acta, jurado, notas e historial en `hu6.archivo_pre_integracion`. Se recomienda respaldar la base antes de migrar. El ejemplo actual utiliza t-012, programado según el seed de HU-2. HU-7 puede consultar la tabla con:

```sql
SELECT s.id, s."trabajoId", t.titulo, s.fecha, s.estado
FROM public.sustentaciones s
JOIN public.trabajos t ON t.id = s."trabajoId";
```

Desde `server/`, ejecuta `npm run dev` para iniciar la API o `npm run hu6:test` para probar HU6.
La API utiliza el JWT del grupo y expone las rutas de sustentaciones en `/api/hu6`.

En Vercel, el proyecto del backend utiliza `server/` como directorio raíz.
Las pantallas de HU6 se despliegan desde el repositorio PrograWeb-frontend.
En el frontend, `VITE_API_URL` es la URL del backend sin el sufijo `/api`. En el servidor, `CLIENT_URL` debe incluir el origen del frontend.
