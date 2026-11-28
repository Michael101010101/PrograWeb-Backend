# PrograWeb-Backend · API de Trabajos de Fin de Carrera (Grupo 2)

API REST en Node.js + Express, con PostgreSQL (Neon) y Sequelize. Todo el código está en `server/`.

- **API desplegada:** https://progra-web-backend.vercel.app (ej.: `/api/salud`, `/api/periodo`)
- **Frontend desplegado:** https://progra-web-frontend.vercel.app
- **Repositorio del frontend:** https://github.com/progra-web-grupo-2-backend/PrograWeb-Frontend

### Ejecutar en local
```bash
cd server
npm install
cp .env.example .env   # completar DB_*, JWT_SECRET, CLIENT_URL
npm run db:create && npm run db:migrate && npm run db:seed
npm run dev            # http://localhost:3000/api
```

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
