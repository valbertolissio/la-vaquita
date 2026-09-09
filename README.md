# La Vaquita 🐄

App para gestionar de forma colaborativa los gastos y las tareas de un proyecto grupal: cada gasto se puede dividir entre los participantes que corresponda, el sistema calcula automáticamente cuánto le debe cada uno a cada uno, y las tareas del viaje (cocinar, lavar los platos, limpiar...) se pueden asignar de forma manual o por turnos rotativos.

## Estructura del proyecto (monorepo)

```
la-vaquita/
├── apps/
│   ├── api/      Backend: Node + Express + TypeScript + Prisma + PostgreSQL
│   ├── web/      Web: React + Vite + TypeScript + Tailwind (vista "escritorio")
│   └── mobile/   App móvil: React Native + Expo + TypeScript
└── packages/
    └── shared/   Tipos compartidos (referencia)
```

Las tres apps consumen la **misma API REST**, así que la lógica de negocio (cálculo de saldos, turnos rotativos, invitaciones) vive en un solo lugar.

## Modelo de base de datos

Definido en [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma). Tablas principales:

- **users** — cuentas de usuario
- **trips** — viajes, con fecha de inicio/fin y moneda
- **trip_members** — tabla puente usuario↔viaje (rol: organizador o integrante)
- **invitations** — invitaciones pendientes por email
- **categories** — categorías de gasto por viaje (Alimentación, Transporte, etc.)
- **expenses** + **expense_splits** — cada gasto y entre quiénes se divide (el saldo de cada persona se **calcula** a partir de estas dos tablas, no se guarda duplicado)
- **tasks** + **rotation_groups** + **task_completions** — tareas del viaje, con asignación manual o rotativa (al completarse una tarea rotativa, el turno pasa automáticamente al siguiente integrante)

## Requisitos previos

- [Node.js 20+](https://nodejs.org/) (ya tenés Node 24 instalado)
- [PostgreSQL](https://www.postgresql.org/download/) corriendo localmente (o una instancia en la nube, ej. [Neon](https://neon.tech) o [Supabase](https://supabase.com), gratis)
- [VS Code](https://code.visualstudio.com/) con las extensiones: **Prisma**, **ESLint**, **Tailwind CSS IntelliSense**
- Para probar la app móvil: la app **Expo Go** en tu celular (App Store / Play Store), o Android Studio / Xcode si preferís un emulador

## Puesta en marcha

### 1. Instalar dependencias

Desde la raíz `la-vaquita/`:

```bash
npm install
```

Esto instala las dependencias de las 4 carpetas del workspace (api, web, mobile, shared) de una sola vez.

### 2. Configurar la base de datos

```bash
cp apps/api/.env.example apps/api/.env
```

Editá `apps/api/.env` y poné tu cadena de conexión real en `DATABASE_URL`. Si tenés PostgreSQL instalado localmente y creaste una base `la_vaquita`, algo así:

```
DATABASE_URL="postgresql://postgres:tu_password@localhost:5432/la_vaquita?schema=public"
```

Después corré las migraciones (esto crea todas las tablas) y cargá datos de ejemplo:

```bash
npm run db:migrate
npm run --workspace=apps/api prisma:seed
```

El seed crea un viaje "Bariloche 2025" con 6 integrantes y gastos/tareas de ejemplo, igual al de la maqueta. Todos los usuarios de prueba usan la contraseña `vaquita123` (ej. `valentina@lavaquita.app`).

### 3. Levantar el backend

```bash
npm run dev:api
```

Corre en `http://localhost:4000`. Podés revisar `http://localhost:4000/health` para confirmar que está arriba.

### 4. Levantar la web

En otra terminal:

```bash
npm run dev:web
```

Se abre en `http://localhost:5173`. Iniciá sesión con un usuario del seed (o registrate) y vas a ver el dashboard tal como en la maqueta: stat cards, saldos entre participantes, últimos gastos, tareas y el gráfico de gastos por categoría.

### 5. Levantar la app móvil (opcional)

```bash
npm run dev:mobile
```

Esto abre Expo. Escaneá el QR con la app **Expo Go** desde tu celular (tiene que estar en la misma red Wi-Fi que tu compu). Si probás en el emulador de Android, cambiá `API_URL` en `apps/mobile/src/lib/api.ts` de `localhost` a `10.0.2.2`.

## Cómo trabajar esto en VS Code

1. Abrí la carpeta `la-vaquita/` como carpeta raíz del workspace (`File > Open Folder`).
2. Usá tres terminales integradas (`` Ctrl+` ``) para correr API, web y mobile en simultáneo.
3. Prisma Studio (interfaz visual para ver/editar los datos de la base) se levanta con:
   ```bash
   npm run db:studio
   ```
4. Cuando cambies el `schema.prisma`, corré `npm run db:migrate` de nuevo para generar y aplicar la migración.

## Tests

La lógica más sensible del proyecto (cálculo de saldos, simplificación de deudas, división de gastos, avance de turnos rotativos) tiene tests unitarios con Vitest en `apps/api/src/lib/*.test.ts`. Para correrlos:

```bash
npm run test:api
```

## Próximos pasos sugeridos

- Conectar un proveedor real de OCR (ej. Google Cloud Vision o Tesseract.js) en `apps/api/src/controllers/expenseController.ts` → `scanReceipt`, que hoy es un placeholder que sólo guarda la imagen.
- Subir comprobantes/imágenes a un storage externo (S3, Cloudinary) en vez de al disco local (`apps/api/uploads/`), pensando en producción.
- Mandar las invitaciones por email de verdad (hoy generan un link que hay que compartir a mano) — necesita una cuenta en un proveedor tipo Resend o SendGrid.
- Recordatorios/notificaciones para tareas con fecha límite o cuyo turno rotativo cambió.
- Deploy: API en Railway/Render, web en Vercel/Netlify, base de datos en Neon/Supabase.
