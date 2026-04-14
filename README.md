# TicketBarber

Aplicacion Angular 20 para gestionar cola de barberia en tres pantallas:

- `kiosk` publico para que el cliente se apunte sin login.
- `tv` publica con turno actual y proximos turnos.
- `staff` privada para barberos con login Google.

## Stack

- Angular `20.x` + standalone components
- Signals para estado de UI
- Firebase Auth (Google)
- Firestore en tiempo real

## Configuracion

1. Crea un proyecto en Firebase.
2. Habilita `Authentication > Google`.
3. Habilita `Firestore Database`.
4. Edita [environment.ts](C:\Users\carlo\Desktop\PROGRAMACION\PROYECTOS REALES\ticketbarber\ticketbarberproject\src\environments\environment.ts) con tus claves reales.
5. Publica reglas desde [firestore.rules](C:\Users\carlo\Desktop\PROGRAMACION\PROYECTOS REALES\ticketbarber\ticketbarberproject\firestore.rules).

## Scripts

- `npm start` inicia entorno local
- `npm run build` genera build de produccion
- `npm test` ejecuta tests unitarios

## Rutas

- `/kiosk`
- `/tv`
- `/staff/login`
- `/staff` (protegida)
