# Documentación

Guía de la arquitectura del proyecto: qué es cada carpeta/archivo, para qué sirve, y dónde encontrarlo. Pensada para poder ubicarse rápido en el código sin tener que leer todo.

## 1. El proyecto

**La Vaquita** es una app para grupos (viajes, convivencia, proyectos) que permite:

- Cargar y dividir **gastos** entre los integrantes (con reparto de quién pagó y entre quiénes se divide).
- Escanear un **comprobante/ticket** con la cámara y que la app lea automáticamente el monto, la fecha y los ítems (OCR).
- Organizar **tareas** (con asignación manual o por turnos rotativos, y con cronómetro opcional).
- Ver el **saldo** de cada uno (quién le debe a quién) y registrar pagos para saldar cuentas.
- Invitar participantes por link, WhatsApp o email.

Es un **monorepo** con tres partes independientes que comparten una sola base de datos a través de la API:

```
la-vaquita/
├── apps/api/      el servidor: la única puerta a la base de datos
├── apps/web/      la app de navegador (React)
└── apps/mobile/   la app de celular (React Native y Expo)
```

**Tecnologías principales:**

| Parte | Tecnología |
|---|---|
| Backend | Node.js + Express + Prisma (ORM) + PostgreSQL |
| Web | React + Vite + Tailwind CSS + React Router |
| Mobile | React Native + Expo + React Navigation |
| Autenticación | JWT (token en el header `Authorization`) |
| Lectura de comprobantes | Tesseract.js y sharp, corriendo en la propia máquina |
| Email | Nodemailer (Gmail) |
| Tests automáticos | Vitest (sobre los cálculos del backend) |

Ni web ni mobile hablan directo con la base de datos: **todo pasa por la API** (`apps/api`). Eso significa que cualquier regla de negocio (cómo se calcula un saldo, quién puede borrar qué) vive en un solo lugar, no duplicada en cada cliente.

Dentro de cada app, las carpetas de código llevan el nombre de la capa a la que pertenecen (**Modelo**, **Controlador**, **Vista**), para que sea evidente qué es cada cosa con solo mirar el explorador de archivos.

---

## 2. Backend

Es el equivalente al **Modelo + Controlador** de una arquitectura MVC clásica: acá vive la base de datos, las reglas de negocio, y las rutas que las exponen. Ni web ni mobile guardan ninguna lógica de negocio: solo la piden a la API y muestran el resultado.

```
apps/api/
├── prisma/schema.prisma   donde se definen las tablas (lo exige Prisma)
└── src/
    ├── Modelo/          EL MODELO: el cliente que consulta la base de datos
    ├── Controlador/     EL CONTROLADOR: la lógica de cada acción
    ├── Rutas/           conecta cada URL con su controlador
    ├── Intermediarios/  chequeos previos al controlador (login, permisos)
    └── Utilidades/      cálculos y utilidades reutilizables
```

### 2.1 Modelo

Las **tablas de la base de datos** (los modelos de datos en sí) están definidas en `apps/api/prisma/schema.prisma`, un solo archivo con todas ellas. Tienen que vivir en esa carpeta fija porque es la que espera la herramienta de Prisma para generar el cliente y las migraciones: moverlas rompería `npx prisma migrate` y `npx prisma generate`.

`apps/api/src/Modelo/baseDeDatos.ts` es **el cliente** que el resto del código importa para leer y escribir esas tablas (`import { prisma } from "../Modelo/prisma"`). En resumen: `prisma/schema.prisma` = qué tablas existen. `Modelo/baseDeDatos.ts` = el objeto que se usa en el código para consultarlas.

| Modelo (tabla) | Qué representa |
|---|---|
| `User` | Una persona con cuenta en la app (nombre, email, contraseña encriptada, apodo, color de avatar). |
| `PasswordResetToken` | El link temporal que se manda por email para "olvidé mi contraseña" (vence en 1 hora). |
| `Trip` | Un proyecto/viaje (nombre, fechas, moneda). Es el contenedor de todo lo demás. |
| `TripMember` | Tabla puente: qué usuarios pertenecen a qué viaje, y con qué rol (`ORGANIZER` o `MEMBER`). |
| `Invitation` | Una invitación pendiente a un viaje (link con token, con o sin email asociado). |
| `Category` | Una categoría de gasto dentro de un viaje (ej. "Alimentación"), con color e ícono. Se puede crear, renombrar y borrar (si no tiene gastos). |
| `Expense` | Un gasto: descripción, monto, categoría, fecha, si vino de OCR o carga manual. |
| `ExpensePayer` | **Quién puso la plata** de un gasto, y cuánto puso cada uno (permite que más de una persona haya pagado, ej. una cena donde uno puso más y otro contribuyó). La suma de todos los `ExpensePayer` de un gasto siempre debe dar el monto total. |
| `ExpenseSplit` | **Entre quiénes se divide** un gasto, y cuánto le toca a cada uno. Es independiente de quién pagó: alguien puede pagar todo y que se divida entre varios. |
| `Payment` | Un pago registrado entre dos integrantes para saldar deuda (ej. "Juan le pagó $500 a María"), por fuera de los gastos. |
| `Task` | Una tarea del viaje: título, a quién está asignada (o si es rotativa), si usa cronómetro o fechas manuales. |
| `RotationGroup` | El orden de turnos de una tarea rotativa (una lista ordenada de usuarios y un cursor que indica a quién le toca ahora). |
| `TaskCompletion` | El registro histórico de cada vez que se completó una tarea (quién, cuándo, cuánto tardó si tenía cronómetro). |

**Cómo se calcula el saldo:** nunca se guarda un "saldo" en la base: siempre se recalcula en el momento a partir de `Expense` + `ExpensePayer` + `ExpenseSplit` + `Payment`. Eso evita que un saldo guardado quede desactualizado.

### 2.2 Controlador

Cada archivo agrupa las acciones sobre un mismo tema. Reciben el pedido, validan los datos (con la librería `zod`), hacen la consulta a la base con Prisma, y devuelven la respuesta.

| Archivo | Nombre | Qué hace |
|---|---|---|
| `ControladorCuentas.ts` | Controlador de Cuenta | Registro, login, ver/editar mi perfil, "olvidé mi contraseña" y "restablecer contraseña". |
| `ControladorProyectos.ts` | Controlador de Viajes | Crear/editar/borrar un viaje, listar mis viajes, invitar participantes, aceptar una invitación, y armar el **resumen del dashboard** (saldo, últimos gastos, gráfico por categoría, tareas pendientes). |
| `ControladorCategorias.ts` | Controlador de Categorías | Crear, renombrar y borrar categorías de gasto (no deja borrar una que ya tiene gastos cargados). |
| `ControladorGastos.ts` | Controlador de Gastos | Listar/crear/editar/borrar gastos, y **escanear un comprobante** (recibe la foto, la pasa por OCR, y devuelve los datos leídos para que el usuario los confirme). |
| `ControladorTareas.ts` | Controlador de Tareas | Listar/crear/editar/borrar tareas, marcarlas como completadas (calculando el tiempo si usan cronómetro), y rotar el turno si son rotativas. |
| `ControladorPagos.ts` | Controlador de Pagos | Registrar y deshacer un pago entre dos integrantes (para saldar cuentas). |

### 2.3 Rutas

El "mapa" que conecta cada URL con la función del controlador que la atiende.

| Archivo | Qué agrupa |
|---|---|
| `rutasDeCuentas.ts` | Todo lo que empieza con `/api/auth/...` (registro, login, perfil, recuperar contraseña). |
| `rutasDeProyectos.ts` | Todo lo que empieza con `/api/trips/...` (viajes, gastos, tareas, pagos, categorías, invitaciones). Casi todo pasa primero por `requireAuth` (¿estás logueado?) y `requireTripMember` (¿sos parte de este viaje?). |

### 2.4 Intermediarios

Funciones que corren **antes** que el controlador, y pueden cortar el pedido si algo no está bien.

| Archivo | Qué chequea |
|---|---|
| `exigirSesion.ts` | Que el pedido traiga un token válido (`Authorization: Bearer ...`). Si no, responde 401 antes de llegar al controlador. |
| `exigirMiembro.ts` | Que el usuario logueado sea efectivamente miembro del viaje que está pidiendo. Evita que alguien vea/edite un viaje ajeno. |

### 2.5 Utilidades

Cálculos que varios controladores necesitan, separados para no repetir código y poder testearlos solos (`*.test.ts` son los tests automáticos de cada uno).

| Archivo | Qué hace |
|---|---|
| `saldos.ts` | El corazón del cálculo de saldos: cuánto pagó y cuánto debe cada integrante, y el algoritmo que simplifica las deudas al mínimo número de transferencias posibles. |
| `divisiones.ts` | Divide un monto en partes iguales entre una lista de personas (manejando el redondeo de centavos). |
| `pagadores.ts` | Valida que la suma de "quién pagó cuánto" coincida con el total del gasto. |
| `lectorDeComprobantes.ts` | Las heurísticas que leen el texto crudo que devuelve el OCR y extraen el monto, la fecha, el comercio, y cada ítem del ticket. Explicado en detalle en la sección 6. |
| `turnos.ts` | La lógica de turnos rotativos: a quién le toca después, y cuánto duró una tarea con cronómetro. |
| `miembros.ts` | Chequea que los usuarios que llegan en un pedido (pagadores, asignados, entre quiénes se divide) sean realmente miembros del viaje. |
| `correo.ts` | Arma y envía los emails (invitación a un viaje, recuperación de contraseña) usando Gmail. |
| `sesion.ts` | Genera y valida el token de sesión. |
| `camposPublicos.ts` | Qué campos de `User` es seguro devolver al cliente (nunca se manda `passwordHash`). |

Los archivos `*.test.ts` de esta carpeta son los tests automáticos: se corren con `npm test` desde `apps/api/` y verifican los cálculos (saldos, divisiones, pagadores, turnos, lectura de tickets) sin necesidad de levantar el servidor ni la base.

---

## 3. Web

```
apps/web/src/
├── Vista/         LA VISTA: una pantalla completa por ruta
├── Componentes/   piezas reutilizables (modales, barra lateral)
├── Contexto/      estado compartido por toda la app
└── Utilidades/    cliente de la API, tipos, formateo
```

### 3.1 Vista

Cada archivo es una pantalla completa, asociada a una URL (definidas en `Aplicacion.tsx`).

| Archivo | Pantalla | Ruta |
|---|---|---|
| `Ingreso.tsx` | Ingresar | `/login` |
| `Registro.tsx` | Registrarse | `/register` |
| `OlvideContrasena.tsx` | Recuperar contraseña | `/forgot-password` |
| `RestablecerContrasena.tsx` | Elegir nueva contraseña | `/reset-password/:token` |
| `AceptarInvitacion.tsx` | Aceptar invitación a un viaje | `/invite/:token` |
| `ListaDeProyectos.tsx` | Lista de mis proyectos | `/trips` |
| `Panel.tsx` | Panel del viaje (saldo, gráfico, últimos gastos/tareas) | `/trips/:id` |
| `Resumen.tsx` | Resumen detallado: cada KPI se despliega para ver qué gastos lo componen | `/trips/:id/resumen` |
| `Gastos.tsx` | Lista de gastos del viaje | `/trips/:id/gastos` |
| `Tareas.tsx` | Lista de tareas del viaje | `/trips/:id/tareas` |
| `Participantes.tsx` | Integrantes del viaje | `/trips/:id/participantes` |

### 3.2 Componentes

Piezas de UI que se reusan desde varias pantallas (la mayoría son modales/ventanas emergentes).

| Archivo | Qué es |
|---|---|
| `MarcoDelProyecto.tsx` | El "marco" de todas las pantallas de un viaje: header con el nombre, botón invitar, y navegación: engloba a `Dashboard`, `Expenses`, `Tasks`, `Participants`. |
| `BarraLateral.tsx` | La barra lateral de navegación (proyectos, cerrar sesión, modo oscuro). |
| `ModalNuevoGasto.tsx` | Ventana para crear/editar un gasto: incluye la carga manual, el escaneo de comprobante con OCR, y la revisión de varios ítems detectados a la vez. |
| `ModalNuevaTarea.tsx` | Ventana para crear/editar una tarea (manual o rotativa, con fechas o cronómetro). |
| `ModalEditarProyecto.tsx` | Ventana para editar nombre/fechas del viaje, **administrar categorías** (crear, renombrar, borrar), y eliminar el viaje. |
| `ModalInvitar.tsx` | Ventana para invitar participantes (genera el link, compartir por WhatsApp, o mandar por email). |
| `ModalEditarPerfil.tsx` | Ventana para editar mi apodo y color de avatar. |
| `ModalCompletarTarea.tsx` | Ventana que aparece al marcar como hecha una tarea con cronómetro, para ajustar el tiempo si hace falta. |
| `ModalDetalleDeSaldo.tsx` | Ventana con el detalle de cómo se compone el saldo de una persona (gasto por gasto). |
| `TarjetaDeDato.tsx` | Tarjetita reutilizable para mostrar un número destacado (ej. gasto total). |
| `BotonDeTema.tsx` | El botón de sol/luna para cambiar entre modo claro y oscuro. |
| `Cronometro.tsx` | El cronómetro que se actualiza en vivo en una tarea con `timeTracked`. |
| `Logo.tsx` | El logo de la app (SVG). |

### 3.3 Contexto

Estado global disponible en cualquier componente sin tener que pasarlo a mano por props.

| Archivo | Qué guarda |
|---|---|
| `ContextoDeSesion.tsx` | El usuario logueado y su token; funciones de login/registro/logout/editar perfil. |
| `ContextoDeTema.tsx` | Si el modo es claro u oscuro, guardado en `localStorage`. |

### 3.4 Utilidades

| Archivo | Qué hace |
|---|---|
| `api.ts` | El único lugar que hace `fetch` a la API: una función por endpoint (`api.createExpense(...)`, `api.login(...)`, etc.). Agrega el token de sesión automáticamente. |
| `tipos.ts` | Las formas (`interface`) de los datos que devuelve la API: `User`, `Trip`, `Expense`, `Task`, etc. |
| `formato.ts` | Funciones de formateo: plata (`formatMoney`), fechas, iniciales de un nombre, color de avatar, y `paidBySummary` (arma el texto "Pagó: X" para uno o varios pagadores). |
| `useActualizacionAutomatica.ts` | Vuelve a pedir los datos cada pocos segundos y al volver a la pestaña, para que lo que carga un integrante aparezca solo en la pantalla de los demás. |

---

## 4. Celular

Misma idea que la web, adaptada a React Native (no hay URLs, la navegación es por pila de pantallas con React Navigation, definida en `Aplicacion.tsx`).

```
apps/mobile/src/
├── Vista/         una pantalla por acción, como en la web
├── Componentes/   piezas reutilizables
├── Contexto/      estado compartido
└── Utilidades/    cliente de la API, tipos, formateo, colores
```

### 4.1 Vista

| Archivo | Pantalla |
|---|---|
| `PantallaIngreso.tsx` | Ingresar |
| `PantallaRegistro.tsx` | Registrarse |
| `PantallaOlvideContrasena.tsx` | Recuperar contraseña |
| `PantallaListaDeProyectos.tsx` | Lista de mis proyectos |
| `PantallaNuevoProyecto.tsx` | Crear un proyecto nuevo |
| `PantallaPanel.tsx` | Panel del viaje (equivalente al Dashboard web) |
| `PantallaResumen.tsx` | Resumen detallado, con los mismos KPI desplegables que la web |
| `PantallaGastos.tsx` | Lista de gastos |
| `PantallaNuevoGasto.tsx` | Crear/editar un gasto (manual, OCR, categorías, pagadores múltiples) |
| `PantallaTareas.tsx` | Lista de tareas |
| `PantallaNuevaTarea.tsx` | Crear/editar una tarea |
| `PantallaParticipantes.tsx` | Integrantes del viaje |
| `PantallaInvitar.tsx` | Invitar participantes |
| `PantallaDetalleDeSaldo.tsx` | Detalle de cómo se compone mi saldo |
| `PantallaEditarProyecto.tsx` | Editar el viaje y **administrar categorías** |
| `PantallaEditarPerfil.tsx` | Editar mi perfil |
| `PantallaAjustes.tsx` | Ajustes: mi perfil, modo oscuro, volver a proyectos, eliminar viaje |

### 4.2 Componentes

| Archivo | Qué es |
|---|---|
| `Avatar.tsx` | El círculo con iniciales y color de cada usuario. |
| `ModalCompletarTarea.tsx` | Igual que en web: ajustar el tiempo al completar una tarea con cronómetro. |
| `Cronometro.tsx` | Cronómetro en vivo. |
| `Logo.tsx` | Logo de la app. |

### 4.3 Contexto

| Archivo | Qué guarda |
|---|---|
| `ContextoDeSesion.tsx` | Usuario logueado y token (persistido con `AsyncStorage`). |
| `ContextoDeTema.tsx` | Modo claro/oscuro. |
| `ContextoDeProyecto.tsx` | **Cuál es el viaje actualmente abierto**: no existe en la web porque ahí el viaje activo se identifica por la URL (`/trips/:id`); en mobile no hay URL, así que se guarda acá. |

### 4.4 Utilidades

| Archivo | Qué hace |
|---|---|
| `api.ts` | Cliente HTTP hacia la API (mismo rol que en web). |
| `tipos.ts` | Tipos de los datos. |
| `formato.ts` | Formateo (plata, fechas, nombres, `paidBySummary`). |
| `tema.ts` | Los colores de la app para modo claro y oscuro. |
| `useActualizacionAutomatica.ts` | Igual que en web: recarga los datos sola cada pocos segundos y al volver a la app. |

---

## 5. Un pedido completo

Para ver las piezas trabajando juntas, así es el camino de **"crear un gasto"** desde el celular:

1. El usuario completa el formulario en `PantallaNuevoGasto.tsx` (carpeta `Vista/` de mobile) y toca "Guardar".
2. Esa pantalla llama a `api.createExpense(tripId, datos)`, definida en `apps/mobile/src/Utilidades/api.ts`.
3. Esa función hace un `POST` HTTP a `/api/trips/:tripId/expenses`.
4. En el servidor, `Rutas/rutasDeProyectos.ts` recibe esa URL y primero pasa por los intermediarios `requireAuth` (¿hay sesión?) y `requireTripMember` (¿es parte de este viaje?).
5. Si pasa, llama a `createExpense` en `Controlador/ControladorGastos.ts`, que valida los datos con `zod`, usa `buildEqualSplits` (de `Utilidades/divisiones.ts`) para dividir el monto, valida los pagadores con `validatePayersSum` (de `Utilidades/pagadores.ts`), y guarda todo en la base a través del cliente de `Modelo/baseDeDatos.ts` (tablas `Expense` + `ExpensePayer` + `ExpenseSplit`, definidas en `prisma/schema.prisma`).
6. La respuesta vuelve al celular, que navega hacia atrás y refresca la lista.
7. La próxima vez que alguien mira el Dashboard, `getTripSummary` (en `Controlador/ControladorProyectos.ts`) usa `computeTripBalances` (en `Utilidades/saldos.ts`) para recalcular el saldo de todos, leyendo ese gasto recién creado.

Ese mismo camino (Vista `api.ts` Rutas Intermediarios Controlador Modelo base de datos) se repite para cualquier acción de la app, cambiando solo el archivo/función de cada paso.

---

## 6. Lectura de comprobantes

Es la parte con más trabajo del proyecto y la más fácil de malinterpretar, así que va explicada aparte. Todo el camino arranca en `scanReceipt` (`Controlador/ControladorGastos.ts`).

### 6.1 El motor

El reconocimiento lo hace **Tesseract**, un OCR que corre en la propia máquina: no sale nada a internet y no tiene costo. A cambio devuelve un texto plano lleno de ruido, que hay que interpretar con reglas propias (`lectorDeComprobantes.ts`).

Antes de pasarlo por el OCR, la foto se preprocesa con `sharp`: se endereza según el dato de orientación de la cámara, se pasa a escala de grises y se agranda a 2400 px de ancho. Eso sube bastante el reconocimiento en fotos sacadas a mano.

El escaneo nunca corta la carga del gasto: si la lectura falla, devuelve vacío y el formulario queda para completar a mano.

### 6.2 Del texto a los ítems

El OCR no devuelve una tabla, devuelve renglones sueltos y sucios como este:

```
- l - CEBOLLA No 1 1 18 500 00
```

Ahí hay ruido del borde del papel (`- l -`), el nombre, el código de renglón (`No 1`), la cantidad (`1`) y recién al final el importe, al que le faltan los separadores. Las reglas que lo desarman:

1. **Reconocer el importe.** El punto, la coma y el espacio se tratan igual como separadores, porque en una impresión gastada el OCR devuelve `43,000 00` o `18 500 00` donde el papel dice 43.000,00. Del último grupo se decide si son centavos (dos dígitos) o miles. Si el número vino todo pegado (`900000`), se toman los dos últimos dígitos como centavos.
2. **Cortar el nombre.** Se saltea el ruido del borde izquierdo (pedazos impronunciables como `NNN.EW`, detectados por no tener vocales o repetir una letra tres veces), y se corta en el código de renglón (`N°1`, `N5`, `No`) o en el primer token sin letras, que es donde empieza la columna de cantidad.
3. **Descartar el pie.** Las líneas de subtotal, total, saldo anterior, bultos, vacíos e IVA no son productos y se filtran por palabra clave.
4. **Devolverle el importe a su producto.** Cuando el OCR corre las columnas y el importe cae en el renglón del envase ("BOLSA 27.000,00"), se lo reasigna al producto de arriba, que había quedado sin importe.
5. **Multiplicar por la cantidad cuando corresponde.** La columna de importes puede traer el precio unitario o el total del renglón. Para decidirlo se prueban las dos interpretaciones y gana la que más se acerca al total impreso. Sin un total legible no se multiplica, para no inflar un gasto.
6. **Rescatar lo ilegible.** Si el monto se lee pero el nombre no, el ítem entra igual como "Sin descripción": perder un gasto de la división es peor que tener que renombrarlo.

### 6.3 El total

`amount` puede venir de dos lugares distintos, y no significan lo mismo:

- De una línea que dice **TOTAL**: es el total de verdad. El campo `totalConfiable` viene en `true`.
- Del **número más grande** del ticket, cuando no hay línea de total legible: es apenas una sugerencia. `totalConfiable` viene en `false`.

Esa distinción es la que permite decidir si hay que multiplicar por la cantidad: solo se compara contra el total cuando el total es de verdad. El formulario no usa el total para nada más, porque lo que se carga son los ítems.

### 6.4 Qué esperar

La lectura es **un punto de partida, no un resultado final**: la pantalla de carga muestra todos los ítems con casilleros para revisarlos, editarlos o descartarlos antes de guardar. Sobre una foto real de un ticket de verdulería con la impresión gastada recupera alrededor de 10 de los 14 renglones con el monto correcto.

---

## 7. Limitaciones

Cosas que el proyecto **no** resuelve hoy, anotadas a propósito para no dar por hecho lo que no está:

| Tema | Estado |
|---|---|
| Fotos de comprobantes | Se guardan en `apps/api/uploads/` y se sirven por URL sin pedir sesión. El nombre del archivo es aleatorio (no se puede adivinar), pero quien tenga el link ve la foto. |
| Intentos de login | No hay límite de intentos ni demora entre uno y otro, así que no hay defensa contra prueba y error de contraseñas. |
| Roles | Solo el organizador puede eliminar el viaje. El resto de las acciones (invitar, editar el viaje, administrar categorías) las puede hacer cualquier integrante. |
| Tests automáticos | Cubren los cálculos del backend (saldos, divisiones, pagadores, turnos, lectura de tickets). Las pantallas de web y mobile se prueban a mano. |
| Publicación | El proyecto corre local. Para probarlo desde otro dispositivo se usan túneles temporales, que vencen a las pocas horas y obligan a actualizar las URLs de los `.env`. |
| Moneda | El monto se guarda sin conversión: un viaje mezcla monedas si se cargan gastos en distintas. |
