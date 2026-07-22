/**
 * BIENVENIDA DE TRANSFERENCIAS AD26 - LOOKUP Y REGISTRO
 *
 * Backend de Google Apps Script para:
 * - preparar el nuevo Spreadsheet;
 * - normalizar la sabana de Coordinacion;
 * - consultar estudiantes por matricula;
 * - registrar una sola respuesta por estudiante;
 * - limitar de forma atomica el cupo a 400 respuestas SI.
 *
 * Los secretos no deben escribirse en este archivo. Configurar en Script Properties:
 * - AD26_SPREADSHEET_ID
 * - AD26_API_KEY
 * - AD26_TEST_MATRICULA (opcional)
 */

const AD26_CONFIG = Object.freeze({
  PERIOD: 'AD26',
  EVENT_ID: 'bienvenida-transferencias-ad26',
  DEFAULT_SPREADSHEET_ID: '1jHE0OAX7EXTyo5Try8Jh5J_xwP0g_PEztxxiQBuGwZU',
  DEFAULT_CAPACITY: 400,
  TIMEZONE: 'America/Monterrey',
  EVENT_DATE: '2026-08-07',
  START_TIME: '15:00',
  END_TIME: '17:30',
  VENUE: 'Centro de Congresos',
  CAMPUS: 'Campus Monterrey',
  VENUE_URL: 'https://dirige.tec.mx/monterrey/centrocongresos',
  FALLBACK_REPLY_TO: 'mentoreo.mty@servicios.tec.mx',
  FULL_MESSAGE: 'El cupo para esta experiencia de bienvenida esta completo. Te invitamos a seguir disfrutando las oportunidades de bienvenida, integracion y vida estudiantil que Campus Monterrey tiene para ti.',
  SHEETS: Object.freeze({
    RAW: 'Importacion_Raw',
    ASSIGNMENTS: 'Asignaciones',
    MENTORS: 'Datos mentor',
    RESPONSES: 'Respuestas',
    SETTINGS: 'Configuracion',
    SEND_LOG: 'Log_Envios',
    SUMMARY: 'Resumen',
    ERRORS: 'Errores'
  })
});

const AD26_HEADERS = Object.freeze({
  ASSIGNMENTS: [
    'matricula', 'nombres', 'apellidos', 'email', 'campus_origen', 'escuela',
    'comunidad', 'tipo_poblacion', 'mentor_id', 'mentor_nombre', 'activo',
    'periodo', 'fecha_importacion'
  ],
  MENTORS: [
    'mentor_id', 'nombre', 'nombre_mostrar', 'nickname', 'email', 'celular',
    'comunidad', 'activo'
  ],
  RESPONSES: [
    'response_id', 'event_id', 'timestamp', 'matricula', 'asistira',
    'tipo_poblacion', 'comunidad', 'mentor_id', 'email', 'email_status', 'source'
  ],
  SETTINGS: ['llave', 'valor', 'descripcion'],
  SEND_LOG: [
    'timestamp', 'campaign_id', 'matricula_hash', 'template', 'status',
    'error_code', 'attempt'
  ],
  ERRORS: [
    'timestamp', 'fila_origen', 'matricula', 'codigo', 'detalle', 'nivel'
  ]
});

const AD26_HEADER_ALIASES = Object.freeze({
  matricula: ['matricula', 'matrícula', 'id estudiante', 'student id'],
  nombres: ['nombres', 'nombre', 'nombre estudiante', 'first name', 'given name'],
  apellidos: ['apellidos', 'apellido', 'last name', 'surname'],
  email: ['email', 'correo', 'correo electronico', 'correo electrónico', 'mail'],
  campus_origen: ['campus origen', 'campus de origen', 'campus_origen', 'origen'],
  escuela: ['escuela', 'school', 'escuela academica', 'escuela académica'],
  comunidad: ['comunidad', 'comunidad estudiantil'],
  tipo_poblacion: ['tipo poblacion', 'tipo de poblacion', 'tipo_poblacion', 'poblacion'],
  mentor_id: ['mentor id', 'mentor_id', 'id mentor'],
  mentor_nombre: [
    'mentor', 'mentor asignado', 'mentor(a) asignado(a)', 'mentora asignada',
    'nombre mentor', 'mentor_nombre'
  ],
  activo: ['activo', 'activa', 'estatus', 'status']
});

const AD26_TEST_FIXTURES = Object.freeze({
  mentorId: 'TEST-MENTOR-AD26',
  matriculas: Object.freeze(['A00000001', 'A00000002']),
  mentor: Object.freeze([
    'TEST-MENTOR-AD26', 'Mentora Prueba AD26', 'Mentora Prueba', 'Mentora',
    'kareng@tec.mx', '520000000000', 'Krei', true
  ]),
  assignments: Object.freeze([
    Object.freeze([
      'A00000001', 'Prueba Mentoria', 'AD26', 'kareng@tec.mx', 'Campus Puebla',
      'Ingenieria', 'Krei', 'MENTORIA', 'TEST-MENTOR-AD26',
      'Mentora Prueba AD26', true, 'AD26-TEST', null
    ]),
    Object.freeze([
      'A00000002', 'Prueba Salud', 'AD26', 'kareng@tec.mx',
      'Campus Ciudad de Mexico', 'Escuela de Medicina y Ciencias de la Salud',
      'Salud', 'SALUD', '', '', true, 'AD26-TEST', null
    ])
  ])
});

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Transferencias AD26')
    .addItem('1. Preparar estructura', 'prepararEstructuraAd26')
    .addItem('2. Previsualizar importacion', 'previsualizarImportacionAd26')
    .addItem('3. Procesar importacion', 'procesarImportacionAd26')
    .addSeparator()
    .addItem('Cargar datos de prueba', 'cargarDatosPruebaAd26')
    .addItem('Reiniciar respuestas de prueba', 'reiniciarRespuestasPruebaAd26')
    .addItem('Eliminar datos de prueba', 'eliminarDatosPruebaAd26')
    .addSeparator()
    .addItem('Diagnostico', 'diagnosticarAd26')
    .addItem('Probar lookup', 'probarLookupAd26')
    .addItem('Cerrar registro', 'cerrarRegistroAd26')
    .addItem('Abrir registro', 'abrirRegistroAd26')
    .addToUi();
}

function prepararEstructuraAd26() {
  const ss = getAd26Spreadsheet_();

  ensureSheet_(ss, AD26_CONFIG.SHEETS.RAW, null);
  ensureSheet_(ss, AD26_CONFIG.SHEETS.ASSIGNMENTS, AD26_HEADERS.ASSIGNMENTS);
  ensureSheet_(ss, AD26_CONFIG.SHEETS.MENTORS, AD26_HEADERS.MENTORS);
  ensureSheet_(ss, AD26_CONFIG.SHEETS.RESPONSES, AD26_HEADERS.RESPONSES);
  ensureSheet_(ss, AD26_CONFIG.SHEETS.SETTINGS, AD26_HEADERS.SETTINGS);
  ensureSheet_(ss, AD26_CONFIG.SHEETS.SEND_LOG, AD26_HEADERS.SEND_LOG);
  ensureSheet_(ss, AD26_CONFIG.SHEETS.SUMMARY, null);
  ensureSheet_(ss, AD26_CONFIG.SHEETS.ERRORS, AD26_HEADERS.ERRORS);
  ensureSettings_(ss.getSheetByName(AD26_CONFIG.SHEETS.SETTINGS));

  SpreadsheetApp.flush();
  notify_('Estructura AD26 preparada. El registro permanece cerrado.');
}

function cargarDatosPruebaAd26() {
  const ss = getAd26Spreadsheet_();
  prepararEstructuraAd26();

  const settingsSheet = requireSheet_(ss, AD26_CONFIG.SHEETS.SETTINGS);
  const settings = readSettings_(settingsSheet);
  if (parseBoolean_(settings.REGISTRO_ABIERTO)) {
    throw new Error('Cierra el registro real antes de cargar fixtures de prueba.');
  }

  const mentorSheet = requireSheet_(ss, AD26_CONFIG.SHEETS.MENTORS);
  const assignmentSheet = requireSheet_(ss, AD26_CONFIG.SHEETS.ASSIGNMENTS);
  const importedAt = new Date();
  const assignments = AD26_TEST_FIXTURES.assignments.map(row => {
    const copy = Array.from(row);
    copy[AD26_HEADERS.ASSIGNMENTS.indexOf('fecha_importacion')] = importedAt;
    return copy;
  });

  upsertRowsByKey_(
    mentorSheet,
    AD26_HEADERS.MENTORS,
    'mentor_id',
    [Array.from(AD26_TEST_FIXTURES.mentor)]
  );
  upsertRowsByKey_(
    assignmentSheet,
    AD26_HEADERS.ASSIGNMENTS,
    'matricula',
    assignments
  );

  setSetting_('REGISTRO_ABIERTO', 'FALSE');
  setSetting_('MODO_PRUEBA', 'TRUE');
  PropertiesService.getScriptProperties()
    .setProperty('AD26_TEST_MATRICULA', AD26_TEST_FIXTURES.matriculas[0]);
  SpreadsheetApp.flush();
  notify_(
    'Datos de prueba listos.\n\n' +
    'Mentoria: A00000001\n' +
    'Salud sin mentor: A00000002\n\n' +
    'El registro real sigue cerrado; solo estas matriculas pueden responder.'
  );
}

function reiniciarRespuestasPruebaAd26() {
  const ss = getAd26Spreadsheet_();
  const deleted = deleteRowsByValues_(
    requireSheet_(ss, AD26_CONFIG.SHEETS.RESPONSES),
    'matricula',
    AD26_TEST_FIXTURES.matriculas
  );
  SpreadsheetApp.flush();
  notify_(`Respuestas de prueba eliminadas: ${deleted}. Ya puedes repetir el flujo.`);
}

function eliminarDatosPruebaAd26() {
  const ss = getAd26Spreadsheet_();
  const deletedResponses = deleteRowsByValues_(
    requireSheet_(ss, AD26_CONFIG.SHEETS.RESPONSES),
    'matricula',
    AD26_TEST_FIXTURES.matriculas
  );
  const deletedAssignments = deleteRowsByValues_(
    requireSheet_(ss, AD26_CONFIG.SHEETS.ASSIGNMENTS),
    'matricula',
    AD26_TEST_FIXTURES.matriculas
  );
  const deletedMentors = deleteRowsByValues_(
    requireSheet_(ss, AD26_CONFIG.SHEETS.MENTORS),
    'mentor_id',
    [AD26_TEST_FIXTURES.mentorId]
  );

  setSetting_('MODO_PRUEBA', 'FALSE');
  PropertiesService.getScriptProperties().deleteProperty('AD26_TEST_MATRICULA');
  SpreadsheetApp.flush();
  notify_(
    `Fixtures eliminados: ${deletedAssignments} asignaciones, ` +
    `${deletedMentors} mentores y ${deletedResponses} respuestas.`
  );
}

function previsualizarImportacionAd26() {
  const report = runImportPipeline_(true);
  showImportReport_(report, true);
  return report;
}

function procesarImportacionAd26() {
  const report = runImportPipeline_(false);
  showImportReport_(report, false);
  return report;
}

function runImportPipeline_(previewOnly) {
  const ss = getAd26Spreadsheet_();
  const rawSheet = requireSheet_(ss, AD26_CONFIG.SHEETS.RAW);
  const assignmentsSheet = requireSheet_(ss, AD26_CONFIG.SHEETS.ASSIGNMENTS);
  const errorsSheet = requireSheet_(ss, AD26_CONFIG.SHEETS.ERRORS);
  const mentorSheet = requireSheet_(ss, AD26_CONFIG.SHEETS.MENTORS);

  const data = rawSheet.getDataRange().getValues();
  if (data.length < 2 || data[0].every(value => !String(value || '').trim())) {
    throw new Error('Importacion_Raw no contiene encabezados y filas de datos.');
  }

  const sourceHeaders = data[0];
  const sourceMap = buildSourceMap_(sourceHeaders);
  const missingHeaders = ['matricula', 'nombres', 'apellidos', 'email', 'campus_origen', 'escuela']
    .filter(name => sourceMap[name] === undefined);

  const errors = [];
  if (missingHeaders.length) {
    errors.push({
      row: 1,
      matricula: '',
      code: 'ENCABEZADOS_FALTANTES',
      detail: missingHeaders.join(', '),
      level: 'BLOQUEANTE'
    });
    writeErrors_(errorsSheet, errors);
    return buildImportReport_(previewOnly, 0, errors, false);
  }

  const mentors = readMentors_(mentorSheet);
  const output = [];
  const seenMatriculas = new Set();
  const seenEmails = new Set();
  const importedAt = new Date();

  for (let index = 1; index < data.length; index++) {
    const sourceRow = data[index];
    if (sourceRow.every(value => !String(value || '').trim())) continue;

    const sourceNumber = index + 1;
    const matricula = normalizeMatricula_(sourceValue_(sourceRow, sourceMap, 'matricula'));
    const nombres = cleanText_(sourceValue_(sourceRow, sourceMap, 'nombres'));
    const apellidos = cleanText_(sourceValue_(sourceRow, sourceMap, 'apellidos'));
    const email = cleanText_(sourceValue_(sourceRow, sourceMap, 'email')).toLowerCase();
    const campusOrigen = cleanText_(sourceValue_(sourceRow, sourceMap, 'campus_origen'));
    const escuela = cleanText_(sourceValue_(sourceRow, sourceMap, 'escuela'));
    let comunidad = cleanText_(sourceValue_(sourceRow, sourceMap, 'comunidad'));
    let tipoPoblacion = cleanText_(sourceValue_(sourceRow, sourceMap, 'tipo_poblacion')).toUpperCase();
    let mentorId = cleanText_(sourceValue_(sourceRow, sourceMap, 'mentor_id'));
    let mentorNombre = cleanText_(sourceValue_(sourceRow, sourceMap, 'mentor_nombre'));
    const activo = parseActive_(sourceValue_(sourceRow, sourceMap, 'activo'));

    const isSalud = tipoPoblacion === 'SALUD' ||
      normalizeText_(escuela).includes('salud') ||
      normalizeText_(comunidad) === 'salud';

    tipoPoblacion = isSalud ? 'SALUD' : 'MENTORIA';
    if (isSalud) {
      comunidad = 'Salud';
      mentorId = '';
      mentorNombre = '';
    }

    const rowErrors = [];
    if (!/^[A-Z]\d{8}$/.test(matricula)) rowErrors.push(['MATRICULA_INVALIDA', 'La matricula debe tener una letra y ocho digitos.']);
    if (!nombres) rowErrors.push(['NOMBRES_VACIOS', 'Faltan nombres.']);
    if (!apellidos) rowErrors.push(['APELLIDOS_VACIOS', 'Faltan apellidos.']);
    if (!isValidEmail_(email)) rowErrors.push(['EMAIL_INVALIDO', 'El correo no tiene un formato valido.']);
    if (!campusOrigen) rowErrors.push(['CAMPUS_VACIO', 'Falta campus de origen.']);
    if (!escuela) rowErrors.push(['ESCUELA_VACIA', 'Falta escuela.']);

    if (matricula && seenMatriculas.has(matricula)) {
      rowErrors.push(['MATRICULA_DUPLICADA', 'La matricula se repite en la importacion.']);
    }
    if (email && seenEmails.has(email)) {
      rowErrors.push(['EMAIL_DUPLICADO', 'El correo se repite en la importacion.']);
    }

    if (!isSalud) {
      if (!mentorId && !mentorNombre) {
        rowErrors.push(['MENTOR_VACIO', 'La poblacion de Mentoria requiere mentor.']);
      } else {
        const mentor = resolveMentor_(mentors, mentorId, mentorNombre);
        if (mentors.hasRows && !mentor) {
          rowErrors.push(['MENTOR_NO_ENCONTRADO', 'El mentor no coincide con Datos mentor.']);
        } else if (mentor && !mentor.active) {
          rowErrors.push(['MENTOR_INACTIVO', 'El mentor esta marcado como inactivo.']);
        } else if (mentor) {
          mentorId = mentor.id;
          mentorNombre = mentor.name;
          comunidad = comunidad || mentor.community;
        }
      }
      if (!comunidad) rowErrors.push(['COMUNIDAD_VACIA', 'No fue posible resolver la comunidad.']);
    }

    rowErrors.forEach(error => errors.push({
      row: sourceNumber,
      matricula,
      code: error[0],
      detail: error[1],
      level: 'BLOQUEANTE'
    }));

    if (rowErrors.length) continue;

    seenMatriculas.add(matricula);
    seenEmails.add(email);
    output.push([
      matricula, nombres, apellidos, email, campusOrigen, escuela, comunidad,
      tipoPoblacion, mentorId, mentorNombre, activo, AD26_CONFIG.PERIOD, importedAt
    ]);
  }

  writeErrors_(errorsSheet, errors);
  const hasBlockingErrors = errors.some(error => error.level === 'BLOQUEANTE');
  let published = false;

  if (!previewOnly && !hasBlockingErrors) {
    replaceSheetData_(assignmentsSheet, AD26_HEADERS.ASSIGNMENTS, output);
    published = true;
  }

  return buildImportReport_(previewOnly, output.length, errors, published);
}

function doGet(e) {
  try {
    const action = String(e && e.parameter && e.parameter.action || 'health').toLowerCase();
    if (action !== 'health') return jsonResponse_({ error: 'Accion no valida' }, 400);
    return jsonResponse_({
      ok: true,
      period: AD26_CONFIG.PERIOD,
      eventId: AD26_CONFIG.EVENT_ID,
      service: 'transferencias-ad26'
    }, 200);
  } catch (error) {
    return jsonResponse_({ ok: false, error: 'Servicio no disponible' }, 503);
  }
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    if (!body) return jsonResponse_({ error: 'Solicitud invalida' }, 400);
    if (!isAuthorized_(body.api_key)) return jsonResponse_({ error: 'Acceso no autorizado' }, 401);

    const action = String(body.action || 'lookup').toLowerCase();
    if (action === 'health') return detailedHealth_();
    if (action === 'lookup') return lookupStudent_(body);
    if (action === 'confirmacion') return registerResponse_(body);
    return jsonResponse_({ error: 'Accion no valida' }, 400);
  } catch (error) {
    console.error('AD26 doPost:', error && error.message ? error.message : error);
    return jsonResponse_({ error: 'Error interno' }, 500);
  }
}

function detailedHealth_() {
  const ss = getAd26Spreadsheet_();
  const settings = readSettings_(requireSheet_(ss, AD26_CONFIG.SHEETS.SETTINGS));
  return jsonResponse_({
    ok: true,
    period: AD26_CONFIG.PERIOD,
    eventId: AD26_CONFIG.EVENT_ID,
    registrationOpen: parseBoolean_(settings.REGISTRO_ABIERTO),
    capacity: capacitySnapshot_(ss, settings),
    sheetsReady: requiredSheetsReady_(ss)
  }, 200);
}

function lookupStudent_(body) {
  const matricula = normalizeMatricula_(body.matricula);
  if (!/^[A-Z]\d{8}$/.test(matricula)) {
    return jsonResponse_({ error: 'Matricula invalida' }, 400);
  }

  const ss = getAd26Spreadsheet_();
  const assignment = findAssignment_(ss, matricula);
  if (!assignment || !assignment.active) {
    return jsonResponse_({ error: 'Estudiante no encontrado' }, 404);
  }

  const settings = readSettings_(requireSheet_(ss, AD26_CONFIG.SHEETS.SETTINGS));
  const existing = findExistingResponse_(ss, matricula);
  const capacity = capacitySnapshot_(ss, settings);
  const testAccess = isTestMatricula_(matricula) && parseBoolean_(settings.MODO_PRUEBA);
  const mentor = assignment.population === 'SALUD'
    ? null
    : findMentorForAssignment_(ss, assignment);

  return jsonResponse_({
    student: {
      matricula: assignment.matricula,
      names: assignment.names,
      campusOrigin: assignment.campusOrigin,
      school: assignment.school,
      community: assignment.population === 'SALUD' ? 'Salud' : assignment.community,
      populationType: assignment.population,
      hasMentor: assignment.population !== 'SALUD' && Boolean(mentor),
      mentor: mentor ? {
        id: mentor.id,
        displayName: mentor.displayName || mentor.name,
        nickname: mentor.nickname,
        whatsapp: mentor.phone
      } : null
    },
    registration: {
      open: parseBoolean_(settings.REGISTRO_ABIERTO) || testAccess,
      mode: testAccess ? 'TEST' : 'PRODUCTION',
      alreadyResponded: Boolean(existing),
      response: existing ? existing.answer : null
    },
    capacity,
    event: publicEventInfo_()
  }, 200);
}

function registerResponse_(body) {
  const matricula = normalizeMatricula_(body.matricula);
  const answer = normalizeAnswer_(body.asistira);
  if (!/^[A-Z]\d{8}$/.test(matricula)) {
    return jsonResponse_({ error: 'Matricula invalida' }, 400);
  }
  if (!answer) return jsonResponse_({ error: 'Respuesta invalida' }, 400);

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return jsonResponse_({ error: 'El sistema esta ocupado. Intenta nuevamente.' }, 503);
  }

  try {
    const ss = getAd26Spreadsheet_();
    const settings = readSettings_(requireSheet_(ss, AD26_CONFIG.SHEETS.SETTINGS));
    const testAccess = isTestMatricula_(matricula) && parseBoolean_(settings.MODO_PRUEBA);
    if (!parseBoolean_(settings.REGISTRO_ABIERTO) && !testAccess) {
      return jsonResponse_({ error: 'El registro aun no esta abierto', code: 'REGISTRATION_CLOSED' }, 403);
    }

    const assignment = findAssignment_(ss, matricula);
    if (!assignment || !assignment.active) {
      return jsonResponse_({ error: 'Estudiante no encontrado' }, 404);
    }

    const existing = findExistingResponse_(ss, matricula);
    if (existing) {
      return jsonResponse_({
        error: 'Ya existe una respuesta para esta matricula',
        code: 'DUPLICATE_RESPONSE',
        response: existing.answer
      }, 409);
    }

    const capacity = capacitySnapshot_(ss, settings);
    if (answer === 'SI' && capacity.full) {
      return jsonResponse_({
        error: AD26_CONFIG.FULL_MESSAGE,
        code: 'CAPACITY_FULL',
        capacity
      }, 409);
    }

    const responseSheet = requireSheet_(ss, AD26_CONFIG.SHEETS.RESPONSES);
    const responseId = Utilities.getUuid();
    responseSheet.appendRow([
      responseId,
      AD26_CONFIG.EVENT_ID,
      new Date(),
      assignment.matricula,
      answer,
      assignment.population,
      assignment.population === 'SALUD' ? 'Salud' : assignment.community,
      assignment.population === 'SALUD' ? '' : assignment.mentorId,
      assignment.email,
      'PENDIENTE',
      'WEBAPP'
    ]);

    SpreadsheetApp.flush();
    const updatedCapacity = capacitySnapshot_(ss, settings);
    return jsonResponse_({
      ok: true,
      responseId,
      answer,
      capacity: updatedCapacity,
      message: answer === 'SI'
        ? 'Tu lugar ha sido registrado.'
        : 'Tu respuesta ha sido registrada.'
    }, 200);
  } finally {
    lock.releaseLock();
  }
}

function diagnosticarAd26() {
  const ss = getAd26Spreadsheet_();
  const settingsSheet = ss.getSheetByName(AD26_CONFIG.SHEETS.SETTINGS);
  const settings = settingsSheet ? readSettings_(settingsSheet) : {};
  const result = {
    spreadsheetId: ss.getId(),
    sheetsReady: requiredSheetsReady_(ss),
    apiKeyConfigured: Boolean(getApiKey_()),
    registrationOpen: parseBoolean_(settings.REGISTRO_ABIERTO),
    assignmentRows: dataRowCount_(ss.getSheetByName(AD26_CONFIG.SHEETS.ASSIGNMENTS)),
    mentorRows: dataRowCount_(ss.getSheetByName(AD26_CONFIG.SHEETS.MENTORS)),
    responseRows: dataRowCount_(ss.getSheetByName(AD26_CONFIG.SHEETS.RESPONSES)),
    capacity: settingsSheet ? capacitySnapshot_(ss, settings) : null
  };
  console.log(JSON.stringify(result));
  notify_(JSON.stringify(result, null, 2));
  return result;
}

function probarLookupAd26() {
  const props = PropertiesService.getScriptProperties();
  let matricula = props.getProperty('AD26_TEST_MATRICULA');
  if (!matricula) {
    const response = SpreadsheetApp.getUi().prompt(
      'Matricula de prueba',
      'Ingresa una matricula que exista en Asignaciones.',
      SpreadsheetApp.getUi().ButtonSet.OK_CANCEL
    );
    if (response.getSelectedButton() !== SpreadsheetApp.getUi().Button.OK) return;
    matricula = normalizeMatricula_(response.getResponseText());
  }
  const result = lookupStudent_({ matricula });
  console.log(result.getContent());
  notify_(result.getContent());
  return result;
}

function abrirRegistroAd26() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Abrir registro AD26',
    'Escribe ABRIR AD26 para permitir respuestas reales.',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK || response.getResponseText().trim() !== 'ABRIR AD26') {
    notify_('No se realizaron cambios.');
    return;
  }
  setSetting_('MODO_PRUEBA', 'FALSE');
  setSetting_('REGISTRO_ABIERTO', 'TRUE');
  notify_('Registro AD26 abierto. El modo de prueba fue desactivado.');
}

function cerrarRegistroAd26() {
  setSetting_('REGISTRO_ABIERTO', 'FALSE');
  notify_('Registro AD26 cerrado.');
}

function getAd26Spreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('AD26_SPREADSHEET_ID') || AD26_CONFIG.DEFAULT_SPREADSHEET_ID;
  if (!id) throw new Error('Falta AD26_SPREADSHEET_ID en Script Properties.');
  return SpreadsheetApp.openById(id);
}

function getApiKey_() {
  return String(PropertiesService.getScriptProperties().getProperty('AD26_API_KEY') || '');
}

function isAuthorized_(providedKey) {
  const expected = getApiKey_();
  return Boolean(expected) && String(providedKey || '') === expected;
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (!headers || !headers.length) return sheet;

  const existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasExistingHeader = existing.some(value => String(value || '').trim());
  if (hasExistingHeader) {
    const mismatch = headers.some((header, index) => String(existing[index] || '').trim() !== header);
    if (mismatch) throw new Error(`La hoja ${name} tiene encabezados distintos. No se modifico.`);
  } else {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#e8eaed')
    .setFontColor('#202124');
  sheet.autoResizeColumns(1, headers.length);
  return sheet;
}

function ensureSettings_(sheet) {
  const defaults = [
    ['PERIODO', AD26_CONFIG.PERIOD, 'Periodo activo'],
    ['EVENT_ID', AD26_CONFIG.EVENT_ID, 'Identificador estable del evento'],
    ['REGISTRO_ABIERTO', 'FALSE', 'Switch operativo; iniciar siempre cerrado'],
    ['MODO_PRUEBA', 'TRUE', 'Permite responder solo a las matriculas fixture con el registro real cerrado'],
    ['CUPO_MAXIMO', String(AD26_CONFIG.DEFAULT_CAPACITY), 'Maximo de respuestas SI unicas'],
    ['FECHA_EVENTO', AD26_CONFIG.EVENT_DATE, 'Fecha ISO'],
    ['HORA_INICIO', AD26_CONFIG.START_TIME, 'Hora local'],
    ['HORA_FIN', AD26_CONFIG.END_TIME, 'Hora local'],
    ['ZONA_HORARIA', AD26_CONFIG.TIMEZONE, 'Zona horaria operativa'],
    ['LUGAR', AD26_CONFIG.VENUE, 'Sede del evento'],
    ['URL_LUGAR', AD26_CONFIG.VENUE_URL, 'Informacion y mapa oficial'],
    ['REPLY_TO_FALLBACK', AD26_CONFIG.FALLBACK_REPLY_TO, 'Contacto cuando no hay mentor']
  ];

  const existing = readSettings_(sheet);
  const missing = defaults.filter(row => existing[row[0]] === undefined);
  if (missing.length) sheet.getRange(sheet.getLastRow() + 1, 1, missing.length, 3).setValues(missing);
}

function readSettings_(sheet) {
  const values = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < values.length; i++) {
    const key = String(values[i][0] || '').trim();
    if (key) settings[key] = values[i][1];
  }
  return settings;
}

function setSetting_(key, value) {
  const ss = getAd26Spreadsheet_();
  const sheet = requireSheet_(ss, AD26_CONFIG.SHEETS.SETTINGS);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value, 'Agregado manualmente']);
}

function isTestMatricula_(matricula) {
  return AD26_TEST_FIXTURES.matriculas.includes(normalizeMatricula_(matricula));
}

function upsertRowsByKey_(sheet, headers, keyHeader, rows) {
  const keyIndex = headers.indexOf(keyHeader);
  if (keyIndex < 0) throw new Error(`No existe la llave ${keyHeader}.`);

  const data = sheet.getDataRange().getValues();
  const existingRows = new Map();
  for (let index = 1; index < data.length; index++) {
    const key = normalizeText_(data[index][keyIndex]);
    if (key) existingRows.set(key, index + 1);
  }

  rows.forEach(row => {
    const key = normalizeText_(row[keyIndex]);
    const rowNumber = existingRows.get(key);
    if (rowNumber) {
      sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
  });
}

function deleteRowsByValues_(sheet, keyHeader, values) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return 0;
  const headers = headerMap_(data[0]);
  const keyIndex = headers[keyHeader];
  if (keyIndex === undefined) throw new Error(`No existe la columna ${keyHeader} en ${sheet.getName()}.`);

  const expected = new Set(values.map(normalizeText_));
  let deleted = 0;
  for (let index = data.length - 1; index >= 1; index--) {
    if (!expected.has(normalizeText_(data[index][keyIndex]))) continue;
    sheet.deleteRow(index + 1);
    deleted++;
  }
  return deleted;
}

function buildSourceMap_(headers) {
  const normalizedHeaders = headers.map(normalizeText_);
  const map = {};
  Object.keys(AD26_HEADER_ALIASES).forEach(canonical => {
    const aliases = AD26_HEADER_ALIASES[canonical].map(normalizeText_);
    const index = normalizedHeaders.findIndex(header => aliases.includes(header));
    if (index >= 0) map[canonical] = index;
  });
  return map;
}

function sourceValue_(row, map, key) {
  return map[key] === undefined ? '' : row[map[key]];
}

function readMentors_(sheet) {
  const data = sheet.getDataRange().getValues();
  const result = { byId: new Map(), byName: new Map(), hasRows: data.length > 1 };
  if (data.length < 2) return result;
  const headers = headerMap_(data[0]);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = cleanText_(row[headers.mentor_id]);
    const name = cleanText_(row[headers.nombre]);
    if (!id && !name) continue;
    const mentor = {
      id,
      name,
      displayName: cleanText_(row[headers.nombre_mostrar]) || name,
      nickname: cleanText_(row[headers.nickname]) || firstName_(name),
      email: cleanText_(row[headers.email]).toLowerCase(),
      phone: cleanText_(row[headers.celular]),
      community: cleanText_(row[headers.comunidad]),
      active: parseActive_(row[headers.activo])
    };
    if (id) result.byId.set(normalizeText_(id), mentor);
    if (name) result.byName.set(normalizeText_(name), mentor);
  }
  return result;
}

function resolveMentor_(mentors, id, name) {
  if (id && mentors.byId.has(normalizeText_(id))) return mentors.byId.get(normalizeText_(id));
  if (name && mentors.byName.has(normalizeText_(name))) return mentors.byName.get(normalizeText_(name));
  return null;
}

function findAssignment_(ss, matricula) {
  const sheet = requireSheet_(ss, AD26_CONFIG.SHEETS.ASSIGNMENTS);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  const headers = headerMap_(data[0]);

  for (let i = 1; i < data.length; i++) {
    if (normalizeMatricula_(data[i][headers.matricula]) !== matricula) continue;
    return {
      matricula,
      names: cleanText_(data[i][headers.nombres]),
      surnames: cleanText_(data[i][headers.apellidos]),
      email: cleanText_(data[i][headers.email]).toLowerCase(),
      campusOrigin: cleanText_(data[i][headers.campus_origen]),
      school: cleanText_(data[i][headers.escuela]),
      community: cleanText_(data[i][headers.comunidad]),
      population: cleanText_(data[i][headers.tipo_poblacion]).toUpperCase(),
      mentorId: cleanText_(data[i][headers.mentor_id]),
      mentorName: cleanText_(data[i][headers.mentor_nombre]),
      active: parseActive_(data[i][headers.activo])
    };
  }
  return null;
}

function findMentorForAssignment_(ss, assignment) {
  const mentors = readMentors_(requireSheet_(ss, AD26_CONFIG.SHEETS.MENTORS));
  return resolveMentor_(mentors, assignment.mentorId, assignment.mentorName);
}

function findExistingResponse_(ss, matricula) {
  const sheet = requireSheet_(ss, AD26_CONFIG.SHEETS.RESPONSES);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  const headers = headerMap_(data[0]);
  for (let i = 1; i < data.length; i++) {
    const eventId = cleanText_(data[i][headers.event_id]);
    const responseMatricula = normalizeMatricula_(data[i][headers.matricula]);
    if (eventId === AD26_CONFIG.EVENT_ID && responseMatricula === matricula) {
      return { answer: cleanText_(data[i][headers.asistira]).toUpperCase(), row: i + 1 };
    }
  }
  return null;
}

function capacitySnapshot_(ss, settings) {
  const maximum = positiveInteger_(settings.CUPO_MAXIMO, AD26_CONFIG.DEFAULT_CAPACITY);
  const sheet = requireSheet_(ss, AD26_CONFIG.SHEETS.RESPONSES);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { maximum, occupied: 0, available: maximum, full: false };

  const headers = headerMap_(data[0]);
  const affirmative = new Set();
  for (let i = 1; i < data.length; i++) {
    if (cleanText_(data[i][headers.event_id]) !== AD26_CONFIG.EVENT_ID) continue;
    if (normalizeAnswer_(data[i][headers.asistira]) !== 'SI') continue;
    const matricula = normalizeMatricula_(data[i][headers.matricula]);
    if (matricula) affirmative.add(matricula);
  }
  const occupied = affirmative.size;
  return {
    maximum,
    occupied,
    available: Math.max(0, maximum - occupied),
    full: occupied >= maximum
  };
}

function publicEventInfo_() {
  return {
    name: 'Bienvenida de Transferencias',
    date: AD26_CONFIG.EVENT_DATE,
    startTime: AD26_CONFIG.START_TIME,
    endTime: AD26_CONFIG.END_TIME,
    timezone: AD26_CONFIG.TIMEZONE,
    venue: AD26_CONFIG.VENUE,
    campus: AD26_CONFIG.CAMPUS,
    venueUrl: AD26_CONFIG.VENUE_URL
  };
}

function requiredSheetsReady_(ss) {
  return Object.keys(AD26_CONFIG.SHEETS).every(key => Boolean(ss.getSheetByName(AD26_CONFIG.SHEETS[key])));
}

function replaceSheetData_(sheet, headers, rows) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), headers.length)).clearContent();
  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function writeErrors_(sheet, errors) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, AD26_HEADERS.ERRORS.length).clearContent();
  if (!errors.length) return;
  const now = new Date();
  const rows = errors.map(error => [
    now, error.row, error.matricula, error.code, error.detail, error.level
  ]);
  sheet.getRange(2, 1, rows.length, AD26_HEADERS.ERRORS.length).setValues(rows);
}

function buildImportReport_(previewOnly, validRows, errors, published) {
  return {
    mode: previewOnly ? 'PREVIEW' : 'PUBLISH',
    validRows,
    blockingErrors: errors.filter(error => error.level === 'BLOQUEANTE').length,
    published,
    message: published
      ? 'Asignaciones actualizada.'
      : previewOnly
        ? 'Previsualizacion terminada; Asignaciones no fue modificada.'
        : 'Asignaciones no fue modificada por errores bloqueantes.'
  };
}

function showImportReport_(report, previewOnly) {
  const title = previewOnly ? 'Previsualizacion AD26' : 'Importacion AD26';
  notify_(`${title}\n\nFilas validas: ${report.validRows}\nErrores bloqueantes: ${report.blockingErrors}\n${report.message}`);
}

function requireSheet_(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error(`No existe la hoja ${name}. Ejecuta prepararEstructuraAd26.`);
  return sheet;
}

function headerMap_(headers) {
  const map = {};
  headers.forEach((header, index) => {
    const key = cleanText_(header);
    if (key) map[key] = index;
  });
  return map;
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return null;
  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    return null;
  }
}

function jsonResponse_(payload, status) {
  return ContentService
    .createTextOutput(JSON.stringify(Object.assign({ status }, payload)))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizeText_(value) {
  return cleanText_(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMatricula_(value) {
  return cleanText_(value).toUpperCase();
}

function normalizeAnswer_(value) {
  if (value === true) return 'SI';
  if (value === false) return 'NO';
  const normalized = normalizeText_(value);
  if (['si', 'yes', 'true', '1'].includes(normalized)) return 'SI';
  if (['no', 'false', '0'].includes(normalized)) return 'NO';
  return '';
}

function parseBoolean_(value) {
  return ['true', '1', 'si', 'yes'].includes(normalizeText_(value));
}

function parseActive_(value) {
  if (value === '' || value === null || value === undefined) return true;
  const normalized = normalizeText_(value);
  return !['false', '0', 'no', 'inactivo', 'inactiva', 'baja'].includes(normalized);
}

function isValidEmail_(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanText_(value));
}

function positiveInteger_(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function firstName_(name) {
  return cleanText_(name).split(' ')[0] || '';
}

function dataRowCount_(sheet) {
  return sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
}

function notify_(message) {
  try {
    SpreadsheetApp.getUi().alert(String(message));
  } catch (error) {
    console.log(message);
  }
}
