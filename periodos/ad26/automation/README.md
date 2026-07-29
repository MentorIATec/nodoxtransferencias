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
   - `AD26_TEST_EMAIL`: cuenta autorizada para borradores y correos de prueba.

No reutilices la llave FJ26 y no escribas la llave nueva en Git, HTML o JavaScript
del navegador.

## Preparar el Sheet

1. Ejecuta `prepararEstructuraAd26`.
2. Autoriza el acceso al Spreadsheet.
3. Confirma que `Configuracion!REGISTRO_ABIERTO` permanezca en `FALSE`.
4. Pega las sabanas originales, sin transformar encabezados, en
   `Importacion_Raw_Verano26` e `Importacion_Raw_AD26`.
5. Ejecuta `previsualizarImportacionAd26`.
6. Corrige todos los errores bloqueantes.
7. Ejecuta `procesarImportacionAd26` para publicar `Asignaciones`.

## Datos de prueba y lista definitiva

1. Mantén `REGISTRO_ABIERTO=FALSE` y `MODO_PRUEBA=TRUE`.
2. Ejecuta `cargarDatosPruebaAd26` desde el menu `Transferencias AD26`.
3. La funcion selecciona dos mentores activos de comunidades distintas y crea:
   - `A00000001`: Mentoria con mentor y comunidad de prueba.
   - `A00000002`: Salud sin mentor.
   - `A00000003`: Mentoria con un segundo mentor y comunidad de prueba.
4. Para repetir una confirmacion, ejecuta `reiniciarRespuestasPruebaAd26`.
5. Antes de cargar la lista real, ejecuta `eliminarDatosPruebaAd26`.

La lista definitiva consolidada contiene 766 matriculas activas: 764 de
Mentoria y 2 de Salud. El pipeline excluye cancelaciones y, cuando una matricula
aparece en ambas fuentes, conserva la fila de `Importacion_Raw_AD26`.

## Previsualizacion y envio de correo de prueba

1. Agrega al mismo proyecto el archivo `apps-script-email-preview-ad26.js`.
2. Crea dos archivos HTML en Apps Script, copiando las plantillas con estos
   nombres exactos (sin extension):
   - `email-invitacion-ad26`
   - `email-recordatorio-asignacion-ad26`
3. Ejecuta `configurarCorreoPruebaAd26` y registra una cuenta autorizada.
4. Ejecuta `configurarMatriculaCorreoPruebaAd26` y elige una matricula activa de
   `Asignaciones`. El destinatario real nunca se utiliza durante esta prueba.
5. Ejecuta `crearBorradorCorreoPruebaAd26` para revisar el correo en Gmail,
   incluyendo el banner inline y el `reply-to` del mentor seleccionado.
6. Solo despues ejecuta `enviarCorreoPruebaAd26`; exige escribir
   `ENVIAR PRUEBA` y siempre agrega el prefijo `[PRUEBA AD26]` al asunto.

Estas funciones no envian campañas masivas ni modifican respuestas. La prueba de
preregistro se hace desde Vercel con las tres matriculas fixture.

Para una prueba automatizada desde un entorno administrativo, el Web App admite
`prepare_test` y `send_test_email`. Ambas acciones exigen la API key y mantienen el
registro real cerrado. `send_test_email` puede renderizar una asignacion activa,
pero envia exclusivamente a `AD26_TEST_EMAIL`. Un cache de cinco minutos evita
reenvios identicos.

Mientras el modo de prueba esta activo y el registro real cerrado, solo las tres
matriculas fixture pueden registrar una respuesta. `abrirRegistroAd26` desactiva
automaticamente el modo de prueba.

## Resumen de respuestas

Desde el menu `Transferencias AD26`, ejecuta `Actualizar resumen de respuestas`.
La funcion actualiza manualmente la hoja `Resumen` sin crear triggers ni modificar
la poblacion o las respuestas. Incluye confirmaciones `SI` y `NO` por mentor/a,
comunidad, escuela y carrera, el bloque separado de Salud, porcentaje de respuesta, pendientes y el
avance de respuestas `SI` frente al cupo de 400 con los lugares disponibles.
La clasificación académica se cruza por matrícula contra
`Importacion_Raw_Verano26` e `Importacion_Raw_AD26`; la segunda tiene prioridad
cuando una matrícula aparece en ambos cortes. Las claves de carrera se traducen
a las seis escuelas académicas antes de construir el resumen.

## Pendientes para seguimiento de mentoría

Desde el mismo menú, ejecuta `Generar pendientes por mentor/a`. La función
regenera manualmente la hoja `Pendientes_Mentores` con estudiantes activos que
todavía no tienen una respuesta válida `SI` o `NO` para AD26. Incluye únicamente
nombre, matrícula, mentor/a y campus de origen; ordena por mentor/a y agrega un
filtro para facilitar el seguimiento. La población de Salud aparece como
`Escuela de Salud (sin mentor/a)`.

La hoja es derivada: puede borrarse o regenerarse sin afectar `Asignaciones` ni
`Respuestas`. Debe actualizarse manualmente después de importar una nueva lista
o cuando se requiera compartir un corte reciente con el equipo de mentoría.

## Catalogo de mentores verificado

- Fuente privada: `DATOSME_CURSOR.xlsx`.
- Registros vigentes: 48, incluida Rocio del Carmen Flores Martinez en Pasio.
- La fotografia de Rocio existe como `RocíoPasio.jpg` en el repositorio de
  check-in; debe agregarse al manifiesto de assets antes de publicar ese sistema.

El cotejo confirma el estado actual, pero no sustituye una nueva validacion si se
reemplazan filas, telefonos o encabezados en `Datos mentor`.

## Desplegar como Web App

El proyecto esta vinculado mediante `clasp` en `../clasp/`. Para sincronizar los
dos scripts y las dos plantillas desde la raiz del repositorio:

```bash
npm run apps-script:status
npm run apps-script:push
```

La carpeta generada `clasp/build/` no es fuente y no debe editarse ni subirse a
Git.

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
