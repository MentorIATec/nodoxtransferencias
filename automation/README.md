# Automation - Apps Script

Guía rápida para usar el script de correos automáticos de Campus Check-in.

## Archivo principal
- `automation/apps-script-emails.js`
## Lookup API (Sheets privado)
- `automation/apps-script-lookup.js`
## Templates de correo (HTML)
- `templates/confirmacion-si.html`
- `templates/confirmacion-no.html`
- `templates/email-invitacion.html`
- `templates/email-recordatorio-1.html`
- `templates/email-recordatorio-2.html`
- `templates/email-aviso-general-1.html`
- `templates/email-aviso-general-2.html`
- `templates/email-aviso-general-3.html`
## Variantes A/B
- Versión A: `*-A.html` (azul principal #1d4ed8)
- Versión B: `*-B.html` (azul oscuro #0b1f3a)

## Pasos de instalación
1) Abre tu Google Sheet de respuestas.
2) Ve a `Extensiones` → `Apps Script`.
3) Crea un archivo nuevo (por ejemplo `campus-checkin-emails.gs`).
4) Copia y pega el contenido de `automation/apps-script-emails.js`.
5) Crea archivos HTML en Apps Script con estos nombres exactos:
   - `confirmacion-si`
   - `confirmacion-no`
   - `email-invitacion`
   - `email-recordatorio-1`
   - `email-recordatorio-2`
6) Copia el contenido de cada archivo desde `templates/` al HTML correspondiente.
7) Guarda y autoriza los permisos la primera vez.
8) Si usarás variantes B, crea los archivos con sufijo `-B` (ej. `confirmacion-si-B`).

## Apps Script Web App (Lookup por matrícula)
1) Crea un nuevo proyecto de Apps Script ligado al Spreadsheet privado.
2) Copia el contenido de `automation/apps-script-lookup.js`.
3) Actualiza `LOOKUP_CONFIG.API_KEY` con un valor secreto.
4) Implementa como **Web App** (Ejecutar como: tú mismo, Acceso: cualquiera con el enlace).
5) Guarda la URL del Web App para usarla en Vercel.
6) Prueba el health check: `WEB_APP_URL?key=TU_API_KEY`

## Variables de entorno (Vercel)
- `APPS_SCRIPT_WEBAPP_URL`: URL del Web App de lookup.
- `APPS_SCRIPT_API_KEY`: secreto que validará el Web App.
- `FALLBACK_JSON_URL` (opcional): URL de respaldo si el Web App falla. Ejemplo: `https://transferencias-fj26.vercel.app/fallback-estudiantes.json`

## Activar el sistema
1) Ejecuta la función `configurarTriggerAutomatico`.
2) Confirma que se crearon los triggers:
   - `onFormSubmit` (envío automático)
   - `enviarReporteErroresDiarios` (reporte diario 18:00)

## Probar envío
- Ejecuta `testearConFilaEspecifica` (usa la fila 2 de la hoja).

## Lote de prueba guiado
- Menú: **Campus Check‑In → Enviar lote prueba**
- Escribe el template base (sin `-B` ni `.html`), por ejemplo:
  - `email-invitacion`
  - `email-recordatorio-1`
  - `email-aviso-general-2`
- Si no pones asunto, se usa el asunto final (sin “Prueba”).

## Envío masivo (Producción)
- Activa primero: **Campus Check‑In → Activar modo producción**
- Envía: **Campus Check‑In → Enviar invitación (Producción)**
- Define tamaño de lote y pausa entre bloques.
- Para detener: **Campus Check‑In → Detener envíos masivos**
- Log: hoja `Log_Envios` con detalle y resumen.

## Pre-check Asignaciones
- Menú: **Campus Check‑In → Pre-check Asignaciones**
- Revisa:
  - Total filas
  - Emails válidos / vacíos / inválidos
  - Duplicados de email y matrícula

## Procesar manualmente
- Ejecuta `procesarFilasPendientes` para enviar todos los correos pendientes.

## Ver estadísticas
- Ejecuta `verEstadisticasCorreos`.

## Estructura esperada en la hoja
- Hoja principal: `Respuestas de formulario1`
- Hoja mentores: `Datos mentor`
- Hoja asignaciones: `Asignaciones`

## Actualizar datos del evento
Edita en `CONFIG.EVENTO` dentro del script:
- `fecha`
- `horario`
- `lugar`
- `mapas_url`
- `confirmacion_url`
  - La confirmación se registra vía `/api/confirmacion` (Apps Script Web App) para evitar restricciones del Form.

## Validar mentores vs Asignaciones
1) Asegura que la hoja `Asignaciones` tenga los datos importados del CSV.
2) Ejecuta `validarMentoresAsignaciones`.
3) Revisa la hoja `Validacion_Mentores` con los nombres no encontrados.
4) Revisa la hoja `Resumen_Mentores_Comunidades` para el conteo por mentor y comunidad.
5) La misma hoja incluye confirmaciones **SI/NO** por mentor y comunidad, y % total.

## Pruebas de correo
- Enviar correo de prueba desde fila con template:
  `enviarCorreoPrueba(2, 'email-invitacion', 'Prueba Invitación FJ26')`
- Validar accesos (Vercel + Google Forms):
  `validarIntegraciones('A00000000')`

## Configurar Google Forms en Apps Script
Completa en `CONFIG.FORM`:
- `GOOGLE_FORM_URL`: URL `formResponse`
- `FORM_FIELDS`: IDs `entry.*` del formulario

## Assets e imágenes inline
- El correo incrusta imágenes con `cid:` desde `CONFIG.EMAIL.INLINE_IMAGES`.
- Assets usados para avisos generales:
  - `public/assets/Banner AyC.jpg`
  - `public/assets/Cartelera AyC AD25.jpg`
  - `public/clima en MTY 2feb a 6feb.png`
  - `public/assets/Servicios-CVDP-Nacionales.png`

## Checklist FJ26 (Febrero-Junio 2026)
- Evento: Viernes 6 de febrero de 2026, 9:00 a.m. - 12:00 p.m.
- Lugar: Auditorio Luis Elizondo, Campus Monterrey
- Mapa: https://transferencias-fj26.vercel.app/mapa-evento.html
- Hoja principal: `Respuestas de formulario1`
- Hoja mentores: `Datos mentor`
- Hoja log envíos: `Log_Envios`
- Revisar que las columnas coincidan con `CONFIG.COLUMNAS`
- Ejecutar `configurarTriggerAutomatico`
- Probar con `testearConFilaEspecifica`

## Plantilla para nuevo semestre
Antes de cada semestre, actualiza lo siguiente:
- `CONFIG.EVENTO.fecha` (fecha exacta con año)
- `CONFIG.EVENTO.horario` (incluye hora de inicio y fin)
- `CONFIG.EVENTO.lugar` (nombre oficial del auditorio)
- `CONFIG.EVENTO.mapas_url` (URL vigente del mapa)
- Asunto de correo si cambia el nombre del evento
- Contenido de actividades si cambia el programa
- Validar hoja `Datos mentor` (nombres exactos)
