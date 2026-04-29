# 🎯 Sistema de Vinculación TV - Guía de Prueba

## ✅ Implementación completada

### Flujo implementado:

```
📺 TV (sin login) → abre ticketbarber.com/tv → muestra código: 123-456
📱 Móvil (con login) → botón "📺 Vincular TV" → introduce código → ¡Conectado!
```

---

## 🚀 Pasos para probar

### 1️⃣ Desplegar reglas de Firestore

```bash
firebase deploy --only firestore:rules
```

### 2️⃣ Iniciar el servidor local

```bash
npm start
```

### 3️⃣ Simular TV (navegador normal/privado)

1. Abre en **modo incógnito** o navegador distinto: `http://localhost:4200/tv`
2. Verás una pantalla con código grande: **123-456**
3. El código expira en 15 minutos

### 4️⃣ Vincular desde el móvil (tu navegador principal)

1. Abre `http://localhost:4200`
2. Inicia sesión con tu cuenta Google
3. Haz clic en el botón verde **"📺 Vincular TV"** (navbar superior derecho)
4. Introduce el código que ves en la "TV": **123-456**
5. Click **"Conectar TV"**

### 5️⃣ Ver resultado

La "TV" detectará automáticamente la vinculación en 3 segundos y mostrará:

- Turno actual
- Cola de turnos
- Tiempos estimados

---

## 📍 Ubicaciones clave

### Navbar principal

- **Usuario NO autenticado**: botón "Iniciar sesión"
- **Usuario autenticado**:
  - Link "Panel"
  - Link "Mis TVs"
  - Botón verde **"📺 Vincular TV"** ← Aquí introduce el código

### Pantalla TV

- URL: `/tv` → redirige a `/tv/pair` si no está vinculada
- Muestra código de 6 dígitos en grande
- Polling cada 3s esperando activación
- Al activar → guarda shopId en localStorage → muestra cola

### Panel Staff

- Link **"📺 Conectar TV"** → introduce código
- Link **"🖥️ Mis pantallas"** → gestiona dispositivos vinculados

---

## 🔐 Seguridad Firebase

### Colecciones creadas:

```
device_codes/{code}
  - user_code: "123456"
  - userId: "" (vacío hasta que el móvil lo rellena)
  - deviceId: "tv_abc123"
  - createdAt: timestamp
  - expiresAt: timestamp + 15 min

devices/{deviceId}
  - deviceId: "tv_abc123"
  - userId: "user_uid"
  - name: "TV" (editable)
  - createdAt: timestamp
  - lastSeen: timestamp (actualizado cada 5 min)
```

### Reglas de seguridad (ya implementadas):

- ✅ TV sin auth puede crear y leer `device_codes`
- ✅ Móvil autenticado puede actualizar `device_codes` (rellena userId)
- ✅ Solo el propietario puede ver/gestionar sus `devices`
- ✅ Shops tienen lectura pública (tickets, services, settings)

---

## 🎨 Componentes nuevos

| Archivo                        | Función                                          |
| ------------------------------ | ------------------------------------------------ |
| `tv-auth.service.ts`           | Genera códigos, polling, localStorage, Firestore |
| `tv-pairing.component`         | Pantalla TV: código grande + countdown           |
| `activate-tv.component`        | Móvil: input código + vincular                   |
| `devices-management.component` | Lista TVs, renombrar, desvincular                |

---

## 🔄 Flujo técnico detallado

```
[TV] Abre /tv
  ↓
¿Tiene shopId en localStorage?
  ↓ NO
[TV] Redirige a /tv/pair
  ↓
[TV] TvAuthService.generateCode() → "123456"
[TV] Crea device_codes/abc123 { user_code: "123456", userId: "" }
[TV] Muestra código en pantalla
[TV] Polling cada 3s: watchCodeActivation("123456")
  ↓
  [Usuario móvil hace login]
       ↓
  [Móvil] Click botón "📺 Vincular TV" → /activate
       ↓
  [Móvil] Input: 123456 → Enviar
       ↓
  [Móvil] TvAuthService.activateCode("123456")
       ↓
  [Móvil] Actualiza device_codes/abc123 { userId: "user_uid_123" }
       ↓
  [Móvil] Crea devices/tv_abc123 { userId: "user_uid_123" }
       ↓
       ↓
[TV] Detecta cambio en polling (userId ya no está vacío)
  ↓
[TV] tvAuthService.saveBinding("user_uid_123")
[TV] localStorage.setItem("tb_shop_id", "user_uid_123")
[TV] router.navigate(['/tv/user_uid_123'])
  ↓
[TV] Carga cola: QueueRepository.observeTicketsForShop("user_uid_123")
  ↓
[TV] ✅ Muestra turnos en tiempo real (sin auth)
```

---

## ✅ Verificación

Comprueba que funciona:

1. TV muestra código correctamente
2. Móvil puede introducir código
3. TV se conecta automáticamente
4. TV muestra cola de turnos
5. Recarga de TV mantiene sesión
6. Panel "Mis TVs" muestra dispositivo vinculado
7. Desvincular desde panel funciona

---

## 🐛 Troubleshooting

**TV no muestra código:**

- Verifica que Firebase esté inicializado
- Comprueba reglas de Firestore desplegadas

**Móvil dice "Código no encontrado":**

- El código expira a los 15 minutos
- Recarga la TV para generar nuevo código

**TV no se conecta tras introducir código:**

- Verifica consola del navegador (errores Firestore)
- Comprueba que el polling funciona (Network tab → cada 3s)

**TV pierde sesión al recargar:**

- localStorage podría estar bloqueado (modo incógnito estricto)
- Verifica que guarda `tb_shop_id` y `tb_device_id`
