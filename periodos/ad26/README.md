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
- Estado actual: preparacion; lista de estudiantes pendiente

## Estructura

- `config/`: configuracion no secreta del evento.
- `assets/`: banner y materiales visuales AD26.
- `templates/`: plantillas HTML especificas del periodo.
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

## Proximos pasos

1. Copiar `automation/apps-script-ad26.js` a un proyecto Apps Script nuevo.
2. Ejecutar `prepararEstructuraAd26` y guardar el secreto en Script Properties.
3. Adaptar las APIs y el frontend para leer esta configuracion.
4. Agregar el banner AD26 y crear la plantilla inicial de invitacion.
5. Ejecutar el checklist de `qa/checklist-pruebas.md` antes de produccion.
