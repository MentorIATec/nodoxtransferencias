# Checklist de pruebas AD26

## Integracion Vercel

- [x] `GET` de health en Apps Script devuelve `period=AD26`.
- [x] Vercel contiene `APPS_SCRIPT_WEBAPP_URL` y `APPS_SCRIPT_API_KEY`.
- [x] El HTML publicado no contiene la llave de Apps Script.
- [x] `A00000001` muestra mentor, comunidad y contacto de prueba.
- [x] `A00000002` muestra comunidad Salud sin tarjeta ni boton de mentor.
- [ ] `A00000003` muestra un segundo mentor y comunidad de prueba.
- [x] Una respuesta crea una sola fila en `Respuestas`.
- [x] Un segundo intento queda bloqueado por el servidor.
- [ ] `reiniciarRespuestasPruebaAd26` permite repetir el flujo.
- [ ] Una matricula ajena a fixtures no puede responder con el registro real cerrado.

## Datos

- [ ] Importacion_Raw conserva la sabana original.
- [ ] Asignaciones contiene solo filas validas y activas.
- [ ] No hay matriculas ni emails duplicados.
- [ ] Mentores y comunidades se resuelven correctamente.
- [ ] Salud aparece como comunidad y no recibe mentor.

## Lookup y privacidad

- [x] Matricula valida devuelve solo los datos necesarios.
- [ ] Matricula inexistente muestra un mensaje neutral.
- [x] No existen datos personales en JSON publico.
- [x] Ningun secreto aparece en HTML o JavaScript del navegador.
- [ ] Caida de Apps Script falla de forma segura y permite reintentar.

## Respuestas y cupo

- [x] Una matricula solo puede responder una vez.
- [x] Refresh e incognito conservan el bloqueo desde servidor.
- [ ] Doble clic no genera duplicados.
- [x] Respuestas NO no consumen cupo.
- [x] Los lugares 399 y 400 se registran correctamente.
- [ ] La solicitud 401 recibe el mensaje de cupo completo.
- [ ] Dos solicitudes simultaneas por el ultimo lugar no exceden 400.
- [x] El contador usa matriculas unicas con respuesta SI.

## UI

- [x] Fecha: viernes 7 de agosto de 2026.
- [x] Horario: 3:00 p.m. a 5:30 p.m.
- [x] Lugar: Centro de Congresos, Campus Monterrey.
- [x] Salud muestra comunidad sin tarjeta ni CTA de mentor.
- [ ] El mensaje de cupo completo es visible y accesible.
- [x] La interfaz funciona en movil y escritorio.

## Correo

- [ ] Remitente: kareng@tec.mx.
- [ ] Reply-to del mentor cuando exista y sea valido.
- [ ] Fallback reply-to: mentoreo.mty@servicios.tec.mx.
- [ ] Salud utiliza siempre el fallback.
- [ ] Banner AD26 visible en Outlook y Gmail.
- [ ] Boton compatible con Outlook y enlace correcto.
- [ ] Pruebas solo a cuentas autorizadas antes de produccion.
- [ ] Borrador de invitacion AD26 revisado en Gmail.
- [ ] Correo de prueba AD26 recibido con banner inline y reply-to esperado.
