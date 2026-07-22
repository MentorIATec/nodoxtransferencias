# Apps Script AD26

Archivo principal: `apps-script-ad26.js`.

## Crear el proyecto

1. Abre el Spreadsheet AD26.
2. Ve a `Extensiones > Apps Script`.
3. Crea un proyecto nuevo para AD26.
4. Copia el contenido de `apps-script-ad26.js` en un archivo `.gs`.
5. En `Configuracion del proyecto > Propiedades del script`, agrega:
   - `AD26_SPREADSHEET_ID`: ID del Spreadsheet AD26.
   - `AD26_API_KEY`: secreto nuevo y exclusivo de AD26.
   - `AD26_TEST_MATRICULA`: opcional; se agrega cuando exista la lista.

No reutilices la llave FJ26 y no escribas la llave nueva en Git, HTML o JavaScript
del navegador.

## Preparar el Sheet

1. Ejecuta `prepararEstructuraAd26`.
2. Autoriza el acceso al Spreadsheet.
3. Confirma que `Configuracion!REGISTRO_ABIERTO` permanezca en `FALSE`.
4. Pega la sabana original en `Importacion_Raw`.
5. Ejecuta `previsualizarImportacionAd26`.
6. Corrige todos los errores bloqueantes.
7. Ejecuta `procesarImportacionAd26` para publicar `Asignaciones`.

## Datos de prueba antes de recibir la lista

1. Mantén `REGISTRO_ABIERTO=FALSE` y `MODO_PRUEBA=TRUE`.
2. Ejecuta `cargarDatosPruebaAd26` desde el menu `Transferencias AD26`.
3. Usa `A00000001` para probar una persona con mentor.
4. Usa `A00000002` para probar una persona de Salud sin mentor.
5. La funcion usa `kareng@tec.mx` como correo de ambos fixtures; no envia
   mensajes por si sola.
6. Para repetir una confirmacion, ejecuta `reiniciarRespuestasPruebaAd26`.
7. Antes de cargar la lista real, ejecuta `eliminarDatosPruebaAd26`.

Mientras el modo de prueba esta activo y el registro real cerrado, solo las dos
matriculas fixture pueden registrar una respuesta. `abrirRegistroAd26` desactiva
automaticamente el modo de prueba.

## Desplegar como Web App

1. `Implementar > Nueva implementacion > Aplicacion web`.
2. Ejecutar como la propietaria del proyecto.
3. Configurar el acceso requerido por la cuenta institucional.
4. Guardar la URL resultante en Vercel como `APPS_SCRIPT_WEBAPP_URL`.
5. Guardar la misma llave en Vercel como `APPS_SCRIPT_API_KEY`.
6. Registrar `scriptId` y `webAppUrl` en `config/evento-ad26.json` sin incluir secretos.

Para AD26, el navegador llama solamente a `/api/estudiante` y
`/api/confirmacion`. La llave permanece en las variables protegidas de Vercel y
no se incluye en `public/index.html`.

Variables FJ26 que ya no deben configurarse en el proyecto nuevo:

- `API_KEY_BASIC`
- `FALLBACK_JSON_URL`
- `REGISTRO_CERRADO`

El estado de apertura y el cupo se leen siempre desde el Spreadsheet AD26.

## Endpoints

- Health publico: `GET ?action=health`
- Health detallado: `POST` con `action=health` y `api_key`.
- Lookup: `POST` con `action=lookup`, `api_key` y `matricula`.
- Confirmacion: `POST` con `action=confirmacion`, `api_key`, `matricula` y `asistira`.

Apps Script responde el codigo logico en el campo JSON `status`; la API de Vercel
debe traducirlo al codigo HTTP correspondiente.

## Seguridad operativa

- El registro inicia cerrado.
- Solo `abrirRegistroAd26` puede habilitar respuestas y requiere escribir `ABRIR AD26`.
- `LockService` protege el ultimo lugar disponible.
- El navegador solo envia matricula y respuesta; Apps Script resuelve los demas datos.
- Salud no requiere mentor y se registra como comunidad `Salud`.
- Las respuestas NO no consumen cupo.

## Verificacion local

```bash
node periodos/ad26/qa/apps-script-ad26.test.js
```

La prueba valida alias de encabezados, normalizacion, deduplicacion y los estados
de cupo 399/400 antes de copiar el codigo a Apps Script.
