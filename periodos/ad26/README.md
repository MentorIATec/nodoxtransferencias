# Bienvenida de Transferencias AD26

Configuracion y materiales del periodo Agosto-Diciembre 2026. El codigo reutilizable
del frontend, las APIs y Apps Script permanece en las carpetas existentes; esta
carpeta contiene solamente archivos especificos del periodo.

## Estado

- Periodo: AD26
- Evento: Bienvenida de Transferencias
- Fecha: viernes 7 de agosto de 2026
- Horario: 3:00 p.m. a 5:30 p.m.
- Lugar: Centro de Congresos, Campus Monterrey
- Capacidad: 400 respuestas unicas de asistencia "Si"
- Estado actual: integracion en pruebas; lista definitiva de estudiantes pendiente
- Frontend: https://transferencias-ad26.vercel.app
- Apps Script: Web App desplegado y conectado mediante variables protegidas

## Estructura

- `config/`: configuracion no secreta del evento.
- `assets/`: banner y materiales visuales AD26.
- `templates/`: plantillas HTML especificas del periodo.
- `comunicacion-preasignacion/`: evidencia de comunicaciones del 10 y 21 de julio.
- `automation/`: Apps Script de lookup, normalizacion y registro.
- `migrations/`: esquema del Sheet y reglas para transformar la sabana de datos.
- `qa/`: pruebas funcionales, de cupo y de produccion.

## Principios

1. No almacenar datos personales en archivos publicos ni en el repositorio.
2. Mantener secretos en Vercel Environment Variables y Apps Script Properties.
3. Aplicar el limite de cupo en servidor con bloqueo atomico.
4. Evitar duplicados mediante una llave unica por periodo y matricula.
5. Admitir estudiantes de Salud sin mentor, mostrando `Comunidad Salud`.
6. Mantener una sola aplicacion reutilizable y configurar cada periodo por datos.

## Integracion validada

- Lookup privado por matricula desde Vercel.
- Estudiantes de Mentoria con mentor, comunidad y WhatsApp.
- Estudiantes de Salud con comunidad Salud y sin mentor.
- Registro SI/NO en `Respuestas` y rechazo de duplicados en servidor.
- Cupo de 400 respuestas SI unicas, protegido con `LockService`.
- Registro real cerrado mientras `REGISTRO_ABIERTO=FALSE`.

## Proximos pasos

1. Ejecutar `reiniciarRespuestasPruebaAd26` para retirar las dos respuestas de QA.
2. Recibir la sabana definitiva y copiarla sin modificaciones a `Importacion_Raw`.
3. Ejecutar el pipeline de normalizacion y revisar las hojas de errores y resumen.
4. Integrar la plantilla `templates/email-invitacion-ad26.html` al flujo de envio y
   validar su banner inline en Outlook.
5. Completar los casos pendientes de `qa/checklist-pruebas.md`.
6. Abrir el registro solamente despues de la aprobacion final, cambiando
   `REGISTRO_ABIERTO` a `TRUE` y `MODO_PRUEBA` a `FALSE`.
