# Comunicacion previa a la asignacion de mentores AD26

Este directorio conserva los recursos enviados a las solicitudes de transferencia
antes de publicar la asignacion de mentor o mentora. Los archivos se guardan como
evidencia historica y como referencia para futuras iteraciones; no deben editarse
despues de documentar el envio.

## Linea de tiempo

| Fecha | Campana | Archivo | Recurso visual |
| --- | --- | --- | --- |
| 10 de julio de 2026 | Primera comunicacion masiva a solicitudes de transferencia | `campanas/2026-07-10-primera-comunicacion.html` | Recursos embebidos o remotos del HTML original |
| 21 de julio de 2026 | Segunda comunicacion masiva a solicitudes de transferencia | `campanas/2026-07-21-segunda-comunicacion.html` | `../assets/banner-invitacion-2026-07-21.png` |

La segunda comunicacion se registra con la fecha operativa indicada por la
coordinacion. El contenido historico conserva la leyenda `20 jul - HOY`; antes de
reutilizarlo debe corregirse conforme al calendario de la nueva campana.

## Campana de preregistro

- Plantilla AD26 para continuar la actualizacion:
  `../templates/email-invitacion-ad26.html`.
- Recordatorio de asignacion y respuesta:
  `../templates/email-recordatorio-asignacion-ad26.html`.
- Referencia historica FJ26, solo para consulta:
  `../../../templates/email-invitacion-B.html`.
- La plantilla AD26 no debe sustituirse por uno de los correos historicos de esta
  carpeta: las comunicaciones del 10 y 21 de julio ocurrieron antes de la
  asignacion de mentores.

## Datos de mentoria

La fuente operativa privada es la hoja `Datos mentor` del spreadsheet
`A | Pre-registro Transferencias Campus Monterrey | AD26`. El 24 de julio de 2026
se cargaron y verificaron:

- 47 mentores y mentoras institucionales activos;
- nombre completo, nombre mostrado y nickname;
- correo institucional;
- WhatsApp normalizado con prefijo de pais `52`;
- comunidad;
- excepcion visual `Christopher Michaux`, sin alterar su nombre institucional.

El registro `TEST-MENTOR-AD26` permanece separado para pruebas. Los telefonos y
correos no se duplican en Git ni en este directorio.

## Reglas de mantenimiento

1. Actualizar primero la fuente privada autorizada y despues validar la app.
2. No subir archivos XLSX, CSV ni listas de destinatarios con datos personales.
3. Conservar en Git solo HTML, assets publicos y documentacion no sensible.
4. Para WhatsApp, guardar solo digitos con codigo de pais; la UI construye la URL
   `wa.me` al momento de mostrar el CTA.
5. Antes de un envio, probar una matricula de Mentoria y una de Salud.
