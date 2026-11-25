

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


