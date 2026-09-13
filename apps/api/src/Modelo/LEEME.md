# Modelo

Acá vive el cliente que usa el resto del código para hablar con la base de datos.

- **`prisma.ts`** — la única instancia del cliente de Prisma. Todo controlador que necesita leer o escribir en la base hace `import { prisma } from "../Modelo/prisma"`.
- **Las tablas en sí (los modelos de datos)** están definidas en `apps/api/prisma/schema.prisma`, un nivel más arriba. Tienen que vivir ahí porque es la carpeta fija que espera la herramienta de Prisma para generar el cliente y las migraciones — moverlas rompería `npx prisma migrate` y `npx prisma generate`.

En resumen: **`prisma/schema.prisma`** = qué tablas existen y sus columnas. **`Modelo/prisma.ts`** = el objeto que se importa en el código para consultarlas.
