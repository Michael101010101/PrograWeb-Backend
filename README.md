

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

En una copia nueva, instala las dependencias con `npm ci` tanto en `client/` como en `server/`.
Configura `server/.env` a partir de `.env.example` con los datos de PostgreSQL y un JWT_SECRET propio.
Para una base nueva, desde `server/` ejecuta `npm run db:create`, `npm run db:migrate` y `npm run db:seed`.
Si el grupo ya tiene HU-1 en su base, conserva esa base y ejecuta solo `npm run hu6:setup` para agregar las tablas y los ejemplos de sustentaciones.

Inicia `npm run dev` desde `server/` y, en otra terminal, desde `client/`.
Con la sesi?n del grupo, coordinaci?n accede a `/admin/sustentaciones` y cada estudiante a `/estudiante/sustentacion`.
La API se monta en `/api/hu6` y utiliza el JWT de HU-1. Las pruebas se ejecutan desde `server/` con `npm run hu6:test`.

Para Vercel, selecciona la ra?z del repositorio. La entrada api/index.mjs sirve la misma aplicaci?n Express que en local. Configura las variables del servidor y CLIENT_URL para tu dominio, prepara PostgreSQL antes del primer uso y deja VITE_API_URL vac?o para acceder a la API del mismo dominio.
