# Trabajos de Fin de Carrera · Programación Web 2026-2 (Tema 10)

Entrega 2: interfaz en React + servicios web en Node.js/Express + PostgreSQL con Sequelize (ORM).

```
tfc/
├── client/   React + Vite (interfaz)
└── server/   Express + PostgreSQL (API REST)
```

## Requisitos

- Node.js 20 o superior
- PostgreSQL 14 o superior (local, o una base gratuita en la nube como Neon o Supabase)

## Puesta en marcha

### 1. Servidor y base de datos

```bash
cd server
cp .env.example .env        # completa DB_USER, DB_PASS y JWT_SECRET
npm install
npm run db:create           # crea la base DB_NAME (si ya la creaste en pgAdmin, omite este paso)
npm run db:migrate          # crea las tablas (migraciones de Sequelize)
npm run db:seed             # carga los datos semilla
npm run dev                 # API en http://localhost:3000/api
```

Los scripts usan `sequelize-cli` con `--options-path .sequelizerc.cjs`; no hace falta instalarlo de forma global.

### 2. Cliente (en otra terminal)

```bash
cd client
npm install
npm run dev                 # http://localhost:5173
```

En desarrollo, Vite redirige las peticiones `/api` al servidor (ver `client/vite.config.js`).

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

`npm run db:reset` deshace todo y vuelve a cargar estos datos en cualquier momento.

## Arquitectura del servidor (por capas)

```
routes → controllers → services → repositories → PostgreSQL
```

| Capa | Carpeta | Responsabilidad |
| --- | --- | --- |
| Rutas | `server/src/routes` | URL y método HTTP; aplican los middlewares de sesión y rol |
| Controladores | `server/src/controllers` | Traducen la petición HTTP al servicio y la respuesta a JSON. Sin acceso a datos |
| Servicios | `server/src/services` | Reglas de negocio y validaciones. No conocen Express ni SQL |
| Repositorios | `server/src/repositories` | Único acceso a la base de datos (patrón Repository sobre los modelos de Sequelize) |
| Base de datos | `server/src/db` | `config/`, `models/`, `migrations/` y `seeders/` de Sequelize (`.cjs`, porque sequelize-cli usa CommonJS) |
| Middlewares | `server/src/middlewares` | `autenticar` (JWT), `autorizar(...roles)` y manejo de errores |

- **Contraseñas:** se guardan con bcrypt.
- **Sesión:** JWT firmado con `JWT_SECRET`; el cliente lo envía en `Authorization: Bearer <token>`.
- **Validaciones:** el servidor repite las mismas reglas del cliente (`server/src/utils/validators.js`).
- **Errores:** cada servicio lanza `HttpError(status, mensaje, { campos })`; el middleware responde `{ mensaje, campos, datos }` con el código HTTP correspondiente.
- **Credenciales:** solo en `.env`, que no se sube al repositorio (`.env.example` muestra qué variables hacen falta).

## API de la HU-1 · Cuenta y acceso

| Método | Ruta | Acceso | Respuesta |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | Público | 200 `{ token, usuario, ingresoAnterior }` · 401 · 403 · 423 |
| POST | `/api/auth/registro/estudiante` | Público | 201 · 400 · 409 |
| POST | `/api/auth/registro/asesor` | Público | 201 · 400 · 409 |
| GET | `/api/auth/invitaciones/:codigo` | Público | 200 · 404 · 409 · 410 |
| POST | `/api/auth/registro/coordinador` | Público (con código) | 201 · 400 · 404 · 409 · 410 |
| POST | `/api/auth/verificar/:token` | Público | 200 · 404 · 409 · 410 |
| POST | `/api/auth/verificacion/reenviar` | Público | 200 · 404 · 409 |
| POST | `/api/auth/recuperar` | Público | 200 (igual exista o no la cuenta) |
| GET | `/api/auth/recuperar/:token` | Público | 200 · 404 · 409 · 410 |
| POST | `/api/auth/recuperar/:token` | Público | 204 · 400 |
| GET | `/api/cuenta` | Con sesión | 200 · 401 |
| PUT | `/api/cuenta` | Con sesión | 200 · 400 · 401 |
| GET | `/api/invitaciones` | Coordinador | 200 · 401 · 403 |
| POST | `/api/invitaciones` | Coordinador | 201 · 400 · 409 |
| DELETE | `/api/invitaciones/:codigo` | Coordinador | 204 · 404 · 409 |
| GET | `/api/catalogos` | Público | 200 |

## Correos

El servidor envía los correos con Nodemailer si se completan las variables `SMTP_*` del `.env`
(por ejemplo, con una cuenta de prueba de Ethereal o Mailtrap). Si no, el correo se muestra en la
consola del servidor. Con `EXPONER_ENLACES=true` (solo desarrollo), la API devuelve además el enlace
y la interfaz lo muestra en un recuadro para poder probar sin buzón.

## Cómo usan la HU-1 las demás historias

**En el servidor**, para proteger sus rutas:

```js
import { autenticar, autorizar } from '../middlewares/autenticar.js';

router.get('/', autenticar, asincrono(c.listar));                        // cualquier usuario con sesión
router.post('/', autenticar, autorizar('estudiante'), asincrono(c.crear)); // solo estudiantes
// En el controlador, el usuario está en req.usuario
```

Cada historia agrega su archivo de rutas en `server/src/routes/index.js`, y sus modelos, migraciones y seeders en `server/src/db/`.

**En el cliente**, para llamar a la API con la sesión ya incluida:

```js
import { api } from '../../shared/api.js';
const trabajos = await api('/trabajos');                        // GET
await api('/trabajos', { method: 'POST', body: datos });        // POST
```

Las páginas siguen usando `PageLayout`, `useAuth()` y `useToast()` como en la entrega 1.
