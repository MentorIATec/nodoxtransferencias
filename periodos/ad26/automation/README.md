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

## Desplegar como Web App

1. `Implementar > Nueva implementacion > Aplicacion web`.
2. Ejecutar como la propietaria del proyecto.
3. Configurar el acceso requerido por la cuenta institucional.
4. Guardar la URL resultante en Vercel como `APPS_SCRIPT_WEBAPP_URL`.
5. Guardar la misma llave en Vercel como `APPS_SCRIPT_API_KEY`.
6. Registrar `scriptId` y `webAppUrl` en `config/evento-ad26.json` sin incluir secretos.

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
