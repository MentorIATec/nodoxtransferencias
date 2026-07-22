# Checklist de pruebas AD26

## Integracion Vercel

- [ ] `GET` de health en Apps Script devuelve `period=AD26`.
- [ ] Vercel contiene `APPS_SCRIPT_WEBAPP_URL` y `APPS_SCRIPT_API_KEY`.
- [ ] El HTML publicado no contiene la llave de Apps Script.
- [ ] `A00000001` muestra mentor, comunidad y contacto de prueba.
- [ ] `A00000002` muestra comunidad Salud sin tarjeta ni boton de mentor.
- [ ] Una respuesta crea una sola fila en `Respuestas`.
- [ ] Un segundo intento queda bloqueado por el servidor.
- [ ] `reiniciarRespuestasPruebaAd26` permite repetir el flujo.
- [ ] Una matricula ajena a fixtures no puede responder con el registro real cerrado.

## Datos

- [ ] Importacion_Raw conserva la sabana original.
- [ ] Asignaciones contiene solo filas validas y activas.
- [ ] No hay matriculas ni emails duplicados.
- [ ] Mentores y comunidades se resuelven correctamente.
- [ ] Salud aparece como comunidad y no recibe mentor.

## Lookup y privacidad

- [ ] Matricula valida devuelve solo los datos necesarios.
- [ ] Matricula inexistente muestra un mensaje neutral.
- [ ] No existen datos personales en JSON publico.
- [ ] Ningun secreto aparece en HTML o JavaScript del navegador.
- [ ] Caida de Apps Script falla de forma segura y permite reintentar.

## Respuestas y cupo

- [ ] Una matricula solo puede responder una vez.
- [ ] Refresh e incognito conservan el bloqueo desde servidor.
- [ ] Doble clic no genera duplicados.
- [ ] Respuestas NO no consumen cupo.
- [ ] Los lugares 399 y 400 se registran correctamente.
- [ ] La solicitud 401 recibe el mensaje de cupo completo.
- [ ] Dos solicitudes simultaneas por el ultimo lugar no exceden 400.
- [ ] El contador usa matriculas unicas con respuesta SI.

## UI

- [ ] Fecha: viernes 7 de agosto de 2026.
- [ ] Horario: 3:00 p.m. a 5:30 p.m.
- [ ] Lugar: Centro de Congresos, Campus Monterrey.
- [ ] Salud muestra comunidad sin tarjeta ni CTA de mentor.
- [ ] El mensaje de cupo completo es visible y accesible.
- [ ] La interfaz funciona en movil, escritorio e incognito.

## Correo

- [ ] Remitente: kareng@tec.mx.
- [ ] Reply-to del mentor cuando exista y sea valido.
- [ ] Fallback reply-to: mentoreo.mty@servicios.tec.mx.
- [ ] Salud utiliza siempre el fallback.
- [ ] Banner AD26 visible en Outlook y Gmail.
- [ ] Boton compatible con Outlook y enlace correcto.
- [ ] Pruebas solo a cuentas autorizadas antes de produccion.
