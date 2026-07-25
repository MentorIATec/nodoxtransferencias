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
    RAW_SUMMER: 'Importacion_Raw_Verano26',
    RAW_AD26: 'Importacion_Raw_AD26',
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
    'periodo', 'fecha_importacion', 'nombre_completo', 'carrera', 'nombre_carrera',
    'tipo_transferencia', 'cohorte_origen', 'fecha_corte'
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
    'timestamp', 'fila_origen', 'matricula', 'codigo', 'detalle', 'nivel', 'fuente'
  ]
});

const AD26_HEADER_ALIASES = Object.freeze({
  matricula: ['matricula', 'matrícula', 'id estudiante', 'student id'],
  nombre_completo: ['nombre del/la estudiante', 'nombre completo', 'nombre estudiante'],
  nombres: ['nombres', 'nombre', 'first name', 'given name'],
  apellidos: ['apellidos', 'apellido', 'last name', 'surname'],
  email: ['email', 'email del/la estudiante', 'correo', 'correo electronico', 'correo electrónico', 'mail'],
  campus_origen: ['campus origen', 'campus de origen', 'campus_origen', 'origen'],
  escuela: ['escuela', 'school', 'escuela academica', 'escuela académica'],
  comunidad: ['comunidad', 'comunidad estudiantil'],
  tipo_poblacion: ['tipo poblacion', 'tipo de poblacion', 'tipo_poblacion', 'poblacion'],
  mentor_id: ['mentor id', 'mentor_id', 'id mentor'],
  mentor_nombre: [
    'mentor', 'mentor asignado', 'mentor(a) asignado(a)', 'mentora asignada',
    'nombre mentor', 'mentor_nombre',
    'mentor(a) asignado(a) a partir del verano 26',
    'mentor(a) asignado(a) a partir ad 26'
  ],
  activo: ['activo', 'activa', 'estatus', 'status'],
  carrera: ['carrera', 'programa'],
  nombre_carrera: ['nombre carrera', 'nombre de carrera', 'programa academico', 'programa académico'],
  periodo_fuente: ['periodo', 'período'],
  tipo_transferencia: ['tipo de transferencia', 'tipo transferencia'],
  fecha_corte: ['fecha de corte reporte de transferencias', 'fecha corte'],
  comentarios: ['comentarios', 'comentario']
});

const AD26_IMPORT_SOURCES = Object.freeze([
  Object.freeze({ sheet: 'Importacion_Raw_Verano26', label: 'VERANO26', priority: 1 }),
  Object.freeze({ sheet: 'Importacion_Raw_AD26', label: 'AD26', priority: 2 }),
  Object.freeze({ sheet: 'Importacion_Raw', label: 'LEGACY', priority: 0 })
]);

const AD26_MENTOR_NAME_ALIASES = Object.freeze({
  'arturo temoltzi torres': 'Arturo Temolzi Torres'
});

const AD26_EMAIL_CAMPAIGN = Object.freeze({
  ID: 'invitacion-ad26-v1',
  TEMPLATE: 'email-invitacion-ad26',
  DEFAULT_BATCH_SIZE: 40
});

const AD26_TEST_FIXTURES = Object.freeze({
  legacyMentorId: 'TEST-MENTOR-AD26',
  matriculas: Object.freeze(['A00000001', 'A00000002', 'A00000003']),
  defaultTestEmail: 'kareng@tec.mx'
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
    .addItem('Configurar correo de prueba', 'configurarCorreoPruebaAd26')
    .addItem('Configurar matricula para correo prueba', 'configurarMatriculaCorreoPruebaAd26')
    .addItem('Crear borrador de correo prueba', 'crearBorradorCorreoPruebaAd26')
    .addItem('Enviar correo de prueba', 'enviarCorreoPruebaAd26')
    .addSeparator()
    .addItem('Pre-check campaña de invitación', 'precheckCampanaInvitacionAd26')
    .addItem('Enviar siguiente lote de invitación', 'enviarSiguienteLoteInvitacionAd26')
    .addSeparator()
    .addItem('Actualizar resumen de respuestas', 'generarResumenRespuestasAd26')
    .addItem('Diagnostico', 'diagnosticarAd26')
    .addItem('Probar lookup', 'probarLookupAd26')
    .addItem('Cerrar registro', 'cerrarRegistroAd26')
    .addItem('Abrir registro', 'abrirRegistroAd26')
    .addToUi();
}

function prepararEstructuraAd26() {
  const ss = getAd26Spreadsheet_();

  ensureSheet_(ss, AD26_CONFIG.SHEETS.RAW, null);
  ensureSheet_(ss, AD26_CONFIG.SHEETS.RAW_SUMMER, null);
  ensureSheet_(ss, AD26_CONFIG.SHEETS.RAW_AD26, null);
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
  const result = prepareTestDataAd26_(getTestEmail_());
  notify_(
    'Datos de prueba listos.\n\n' +
    `Mentoria: A00000001 - ${result.mentors[0].displayName} (${result.mentors[0].community})\n` +
    'Salud sin mentor: A00000002\n' +
    `Mentoria: A00000003 - ${result.mentors[1].displayName} (${result.mentors[1].community})\n\n` +
    'El registro real sigue cerrado; solo estas matriculas pueden responder.'
  );
}

function prepareTestDataAd26_(testEmail) {
  const ss = getAd26Spreadsheet_();
  prepararEstructuraAd26();

  const settingsSheet = requireSheet_(ss, AD26_CONFIG.SHEETS.SETTINGS);
  const settings = readSettings_(settingsSheet);
  if (parseBoolean_(settings.REGISTRO_ABIERTO)) {
    throw new Error('Cierra el registro real antes de cargar fixtures de prueba.');
  }

  const email = cleanText_(testEmail).toLowerCase();
  if (!isValidEmail_(email)) throw new Error('Correo de prueba invalido.');
  PropertiesService.getScriptProperties().setProperty('AD26_TEST_EMAIL', email);

  const assignmentSheet = requireSheet_(ss, AD26_CONFIG.SHEETS.ASSIGNMENTS);
  const mentors = selectTestMentors_(
    requireSheet_(ss, AD26_CONFIG.SHEETS.MENTORS),
    2
  );
  const assignments = buildTestAssignments_(mentors, new Date());
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
  return { email, mentors };
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
    [AD26_TEST_FIXTURES.legacyMentorId]
  );

  setSetting_('MODO_PRUEBA', 'FALSE');
  PropertiesService.getScriptProperties().deleteProperty('AD26_TEST_MATRICULA');
  SpreadsheetApp.flush();
  notify_(
    `Fixtures eliminados: ${deletedAssignments} asignaciones, ` +
    `${deletedMentors} mentores legacy y ${deletedResponses} respuestas.`
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
  const assignmentsSheet = requireSheet_(ss, AD26_CONFIG.SHEETS.ASSIGNMENTS);
  const errorsSheet = requireSheet_(ss, AD26_CONFIG.SHEETS.ERRORS);
  const mentorSheet = requireSheet_(ss, AD26_CONFIG.SHEETS.MENTORS);
  const sources = readImportSources_(ss);
  if (!sources.length) {
    throw new Error('No hay datos en Importacion_Raw_Verano26, Importacion_Raw_AD26 o Importacion_Raw.');
  }

  const mentors = readMentors_(mentorSheet);
  const errors = [];
  const importedAt = new Date();
  const candidates = [];

  sources.forEach(source => {
    const sourceMap = buildSourceMap_(source.data[0]);
    const missingHeaders = ['matricula', 'email', 'campus_origen', 'mentor_nombre']
      .filter(name => sourceMap[name] === undefined);
    if (sourceMap.nombre_completo === undefined && sourceMap.nombres === undefined) {
      missingHeaders.push('nombre_completo');
    }
    if (missingHeaders.length) {
      errors.push(importError_(source.label, 1, '', 'ENCABEZADOS_FALTANTES', missingHeaders.join(', '), 'BLOQUEANTE'));
      return;
    }

    for (let index = 1; index < source.data.length; index++) {
      const sourceRow = source.data[index];
      if (sourceRow.every(value => !cleanText_(value))) continue;
      const candidate = normalizeImportCandidate_(sourceRow, sourceMap, source, index + 1, mentors, importedAt);
      candidate.errors.forEach(error => errors.push(error));
      if (candidate.cancelled || candidate.errors.some(error => error.level === 'BLOQUEANTE')) continue;
      candidates.push(candidate);
    }
  });

  const deduplicated = new Map();
  candidates.forEach(candidate => {
    const previous = deduplicated.get(candidate.matricula);
    if (!previous) {
      deduplicated.set(candidate.matricula, candidate);
      return;
    }

    if (!sameStudentCandidate_(previous, candidate)) {
      errors.push(importError_(
        candidate.source,
        candidate.row,
        candidate.matricula,
        'MATRICULA_DUPLICADA_CONFLICTO',
        `Los datos difieren de ${previous.source}, fila ${previous.row}.`,
        'BLOQUEANTE'
      ));
      return;
    }

    const selected = candidate.priority >= previous.priority ? candidate : previous;
    deduplicated.set(candidate.matricula, selected);
    errors.push(importError_(
      candidate.source,
      candidate.row,
      candidate.matricula,
      'MATRICULA_CONSOLIDADA',
      `Registro repetido; se conserva ${selected.source}.`,
      'ADVERTENCIA'
    ));
  });

  const uniqueEmails = new Map();
  deduplicated.forEach(candidate => {
    const previousMatricula = uniqueEmails.get(candidate.email);
    if (previousMatricula && previousMatricula !== candidate.matricula) {
      errors.push(importError_(candidate.source, candidate.row, candidate.matricula, 'EMAIL_DUPLICADO', `El correo tambien pertenece a ${previousMatricula}.`, 'BLOQUEANTE'));
    } else {
      uniqueEmails.set(candidate.email, candidate.matricula);
    }
  });

  const output = Array.from(deduplicated.values()).map(candidate => [
    candidate.matricula, candidate.nombres, candidate.apellidos, candidate.email,
    candidate.campusOrigen, candidate.escuela, candidate.comunidad,
    candidate.tipoPoblacion, candidate.mentorId, candidate.mentorNombre,
    candidate.activo, AD26_CONFIG.PERIOD, importedAt, candidate.nombreCompleto,
    candidate.carrera, candidate.nombreCarrera, candidate.tipoTransferencia,
    candidate.cohorteOrigen, candidate.fechaCorte
  ]);

  writeErrors_(errorsSheet, errors);
  const hasBlockingErrors = errors.some(error => error.level === 'BLOQUEANTE');
  let published = false;

  if (!previewOnly && !hasBlockingErrors) {
    replaceSheetData_(assignmentsSheet, AD26_HEADERS.ASSIGNMENTS, output);
    published = true;
  }

  return buildImportReport_(previewOnly, output.length, errors, published);
}

function readImportSources_(ss) {
  return AD26_IMPORT_SOURCES.map(config => {
    const sheet = ss.getSheetByName(config.sheet);
    if (!sheet || sheet.getLastRow() < 2) return null;
    const data = sheet.getDataRange().getValues();
    if (!data.length || data[0].every(value => !cleanText_(value))) return null;
    return Object.assign({}, config, { data });
  }).filter(Boolean);
}

function normalizeImportCandidate_(row, map, source, rowNumber, mentors, importedAt) {
  const matricula = normalizeMatricula_(sourceValue_(row, map, 'matricula'));
  const suppliedNames = cleanText_(sourceValue_(row, map, 'nombres'));
  const suppliedSurnames = cleanText_(sourceValue_(row, map, 'apellidos'));
  const suppliedFullName = cleanText_(sourceValue_(row, map, 'nombre_completo'));
  const nameParts = splitStudentName_(suppliedFullName, suppliedNames, suppliedSurnames);
  const email = cleanText_(sourceValue_(row, map, 'email')).toLowerCase();
  const campusOrigen = cleanText_(sourceValue_(row, map, 'campus_origen'));
  const carrera = cleanText_(sourceValue_(row, map, 'carrera'));
  const nombreCarrera = cleanText_(sourceValue_(row, map, 'nombre_carrera'));
  const comments = cleanText_(sourceValue_(row, map, 'comentarios'));
  let escuela = cleanText_(sourceValue_(row, map, 'escuela'));
  let comunidad = cleanText_(sourceValue_(row, map, 'comunidad'));
  let tipoPoblacion = cleanText_(sourceValue_(row, map, 'tipo_poblacion')).toUpperCase();
  let mentorId = cleanText_(sourceValue_(row, map, 'mentor_id'));
  let mentorNombre = canonicalMentorName_(sourceValue_(row, map, 'mentor_nombre'));
  const cancelled = normalizeText_(mentorNombre) === 'cancelo solicitud' || normalizeText_(comments).includes('cancelo transferencia');
  const isSalud = tipoPoblacion === 'SALUD' || normalizeText_(mentorNombre) === 'salud' ||
    normalizeText_(escuela).includes('salud') || normalizeText_(comunidad) === 'salud';
  const errors = [];

  if (cancelled) {
    errors.push(importError_(source.label, rowNumber, matricula, 'SOLICITUD_CANCELADA', 'La solicitud cancelada no se publica ni recibe invitacion.', 'ADVERTENCIA'));
  }

  tipoPoblacion = isSalud ? 'SALUD' : 'MENTORIA';
  escuela = escuela || (isSalud ? 'Escuela de Medicina y Ciencias de la Salud' : 'Por clasificar');
  if (isSalud) {
    comunidad = 'Salud';
    mentorId = '';
    mentorNombre = '';
  } else if (!cancelled) {
    const mentor = resolveMentor_(mentors, mentorId, mentorNombre);
    if (!mentorId && !mentorNombre) {
      errors.push(importError_(source.label, rowNumber, matricula, 'MENTOR_VACIO', 'La poblacion de Mentoria requiere mentor.', 'BLOQUEANTE'));
    } else if (mentors.hasRows && !mentor) {
      errors.push(importError_(source.label, rowNumber, matricula, 'MENTOR_NO_ENCONTRADO', `No coincide con Datos mentor: ${mentorNombre || mentorId}.`, 'BLOQUEANTE'));
    } else if (mentor && !mentor.active) {
      errors.push(importError_(source.label, rowNumber, matricula, 'MENTOR_INACTIVO', 'El mentor esta marcado como inactivo.', 'BLOQUEANTE'));
    } else if (mentor) {
      mentorId = mentor.id;
      mentorNombre = mentor.name;
      comunidad = comunidad || mentor.community;
    }
    if (!comunidad) errors.push(importError_(source.label, rowNumber, matricula, 'COMUNIDAD_VACIA', 'No fue posible resolver la comunidad.', 'BLOQUEANTE'));
  }

  if (!/^[A-Z]\d{8}$/.test(matricula)) errors.push(importError_(source.label, rowNumber, matricula, 'MATRICULA_INVALIDA', 'La matricula debe tener una letra y ocho digitos.', 'BLOQUEANTE'));
  if (!nameParts.nombres) errors.push(importError_(source.label, rowNumber, matricula, 'NOMBRE_VACIO', 'Falta el nombre del estudiante.', 'BLOQUEANTE'));
  if (!isValidEmail_(email)) errors.push(importError_(source.label, rowNumber, matricula, 'EMAIL_INVALIDO', 'El correo no tiene un formato valido.', 'BLOQUEANTE'));
  if (!campusOrigen) errors.push(importError_(source.label, rowNumber, matricula, 'CAMPUS_VACIO', 'Falta campus de origen.', 'BLOQUEANTE'));

  return {
    source: source.label,
    priority: source.priority,
    row: rowNumber,
    matricula,
    nombres: nameParts.nombres,
    apellidos: nameParts.apellidos,
    nombreCompleto: nameParts.nombreCompleto,
    email,
    campusOrigen,
    escuela,
    carrera,
    nombreCarrera,
    comunidad,
    tipoPoblacion,
    mentorId,
    mentorNombre,
    activo: parseActive_(sourceValue_(row, map, 'activo')) && !cancelled,
    tipoTransferencia: cleanText_(sourceValue_(row, map, 'tipo_transferencia')),
    cohorteOrigen: cleanText_(sourceValue_(row, map, 'periodo_fuente')) || source.label,
    fechaCorte: sourceValue_(row, map, 'fecha_corte'),
    importedAt,
    cancelled,
    errors
  };
}

function splitStudentName_(fullName, names, surnames) {
  const exact = cleanText_(fullName || `${names} ${surnames}`);
  if (names) return { nombres: cleanText_(names), apellidos: cleanText_(surnames), nombreCompleto: exact };
  const parts = exact.split(' ').filter(Boolean);
  return {
    nombres: parts.shift() || '',
    apellidos: parts.join(' '),
    nombreCompleto: exact
  };
}

function canonicalMentorName_(value) {
  const cleaned = cleanText_(value);
  return AD26_MENTOR_NAME_ALIASES[normalizeText_(cleaned)] || cleaned;
}

function sameStudentCandidate_(left, right) {
  return left.matricula === right.matricula && left.email === right.email &&
    normalizeText_(left.nombreCompleto) === normalizeText_(right.nombreCompleto) &&
    normalizeText_(left.mentorNombre) === normalizeText_(right.mentorNombre);
}

function importError_(source, row, matricula, code, detail, level) {
  return { source, row, matricula, code, detail, level };
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
    if (action === 'prepare_test') return prepareRemoteTestAd26_(body);
    if (action === 'send_test_email') return sendRemoteTestEmailAd26_(body);
    return jsonResponse_({ error: 'Accion no valida' }, 400);
  } catch (error) {
    console.error('AD26 doPost:', error && error.message ? error.message : error);
    return jsonResponse_({ error: 'Error interno' }, 500);
  }
}

function prepareRemoteTestAd26_(body) {
  const email = cleanText_(body.recipient).toLowerCase();
  if (!isValidEmail_(email)) return jsonResponse_({ error: 'Correo de prueba invalido' }, 400);
  if (email !== AD26_TEST_FIXTURES.defaultTestEmail.toLowerCase()) {
    return jsonResponse_({ error: 'Destinatario de prueba no autorizado' }, 403);
  }
  const result = prepareTestDataAd26_(email);
  return jsonResponse_({
    ok: true,
    recipient: result.email,
    fixtures: AD26_TEST_FIXTURES.matriculas,
    registrationOpen: false,
    testMode: true
  }, 200);
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

/**
 * Genera un reporte manual de preregistro. No usa triggers ni modifica
 * Asignaciones o Respuestas; solo actualiza la hoja Resumen.
 */
function generarResumenRespuestasAd26() {
  const ss = getAd26Spreadsheet_();
  const assignmentSheet = requireSheet_(ss, AD26_CONFIG.SHEETS.ASSIGNMENTS);
  const responseSheet = requireSheet_(ss, AD26_CONFIG.SHEETS.RESPONSES);
  const settings = readSettings_(requireSheet_(ss, AD26_CONFIG.SHEETS.SETTINGS));
  const summarySheet = ensureSheet_(ss, AD26_CONFIG.SHEETS.SUMMARY, null);
  const capacity = positiveInteger_(settings.CUPO_MAXIMO, AD26_CONFIG.DEFAULT_CAPACITY);
  const summary = buildRegistrationSummary_(
    assignmentSheet.getDataRange().getValues(),
    responseSheet.getDataRange().getValues(),
    capacity
  );

  writeRegistrationSummary_(summarySheet, summary);
  SpreadsheetApp.flush();
  notify_(
    `Resumen actualizado. Respuestas: ${summary.kpis.responses}. ` +
    `SI: ${summary.kpis.yes}. Avance de cupo: ${summary.kpis.capacityProgress}.`
  );
  return summary;
}

function buildRegistrationSummary_(assignmentValues, responseValues, capacity) {
  const assignments = assignmentValues.length > 1 ? assignmentValues : [];
  const responses = responseValues.length > 1 ? responseValues : [];
  const assignmentHeaders = assignments.length ? headerMap_(assignments[0]) : {};
  const responseHeaders = responses.length ? headerMap_(responses[0]) : {};
  const activeAssignments = new Map();

  for (let index = 1; index < assignments.length; index++) {
    const row = assignments[index];
    const matricula = normalizeMatricula_(row[assignmentHeaders.matricula]);
    if (!matricula || !parseActive_(row[assignmentHeaders.activo])) continue;
    activeAssignments.set(matricula, {
      community: cleanText_(row[assignmentHeaders.comunidad]) || 'Sin comunidad',
      population: cleanText_(row[assignmentHeaders.tipo_poblacion]).toUpperCase(),
      mentorId: cleanText_(row[assignmentHeaders.mentor_id]),
      mentorName: cleanText_(row[assignmentHeaders.mentor_nombre])
    });
  }

  // Conserva la ultima respuesta por matricula por tolerancia a registros historicos.
  const latestResponses = new Map();
  for (let index = 1; index < responses.length; index++) {
    const row = responses[index];
    if (cleanText_(row[responseHeaders.event_id]) !== AD26_CONFIG.EVENT_ID) continue;
    const matricula = normalizeMatricula_(row[responseHeaders.matricula]);
    const answer = normalizeAnswer_(row[responseHeaders.asistira]);
    if (!matricula || !answer) continue;
    latestResponses.set(matricula, {
      answer,
      community: cleanText_(row[responseHeaders.comunidad]),
      population: cleanText_(row[responseHeaders.tipo_poblacion]).toUpperCase(),
      mentorId: cleanText_(row[responseHeaders.mentor_id])
    });
  }

  const mentorCounts = new Map();
  const communityCounts = new Map();
  const healthCounts = { total: 0, yes: 0, no: 0 };
  let yes = 0;
  let no = 0;

  latestResponses.forEach((response, matricula) => {
    const assignment = activeAssignments.get(matricula);
    const population = assignment ? assignment.population : response.population;
    const community = population === 'SALUD'
      ? 'Salud'
      : (assignment ? assignment.community : response.community) || 'Sin comunidad';
    const mentor = population === 'SALUD'
      ? 'Escuela de Salud'
      : (assignment ? assignment.mentorName : '') || response.mentorId || 'Sin mentor/a';
    const target = response.answer === 'SI' ? 'yes' : 'no';

    if (target === 'yes') yes++;
    else no++;
    incrementSummaryCount_(mentorCounts, mentor, target);
    incrementSummaryCount_(communityCounts, community, target);
    if (population === 'SALUD' || normalizeText_(community) === 'salud') {
      healthCounts.total++;
      healthCounts[target]++;
    }
  });

  const responsesCount = yes + no;
  const activeCount = activeAssignments.size;
  const pending = Math.max(0, activeCount - responsesCount);
  const toRow = entry => [
    entry.label,
    entry.total,
    entry.yes,
    entry.no,
    entry.total ? entry.yes / entry.total : 0
  ];

  return {
    generatedAt: new Date(),
    kpis: {
      active: activeCount,
      responses: responsesCount,
      yes,
      no,
      pending,
      responseRate: activeCount ? responsesCount / activeCount : 0,
      capacity,
      capacityProgress: capacity ? yes / capacity : 0,
      available: Math.max(0, capacity - yes),
      health: healthCounts
    },
    byMentor: Array.from(mentorCounts.values()).sort(sortSummaryEntries_).map(toRow),
    byCommunity: Array.from(communityCounts.values()).sort(sortSummaryEntries_).map(toRow)
  };
}

function incrementSummaryCount_(counts, label, answerKey) {
  const key = cleanText_(label) || 'Sin especificar';
  if (!counts.has(key)) counts.set(key, { label: key, total: 0, yes: 0, no: 0 });
  const entry = counts.get(key);
  entry.total++;
  entry[answerKey]++;
}

function sortSummaryEntries_(first, second) {
  if (second.total !== first.total) return second.total - first.total;
  return first.label.localeCompare(second.label, 'es');
}

function writeRegistrationSummary_(sheet, summary) {
  sheet.clear();
  const kpis = summary.kpis;
  const rows = buildRegistrationSummaryKpiRows_(summary);
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  sheet.getRange(1, 1, 1, 2).merge().setFontWeight('bold').setFontSize(14).setBackground('#0b3f67').setFontColor('#ffffff');
  sheet.getRange(4, 1, 1, 2).setFontWeight('bold').setBackground('#d9ead3');
  sheet.getRange(10, 2, 2, 1).setNumberFormat('0.0%');

  const mentorStart = 18;
  const headers = [['Confirmaciones por mentor/a', 'Total', 'SI', 'NO', '% SI']];
  sheet.getRange(mentorStart, 1, 1, 5).setValues(headers).setFontWeight('bold').setBackground('#d9eaf7');
  if (summary.byMentor.length) {
    sheet.getRange(mentorStart + 1, 1, summary.byMentor.length, 5).setValues(summary.byMentor);
    sheet.getRange(mentorStart + 1, 5, summary.byMentor.length, 1).setNumberFormat('0.0%');
  }

  const communityStart = mentorStart + Math.max(summary.byMentor.length, 1) + 3;
  sheet.getRange(communityStart, 1, 1, 5)
    .setValues([['Confirmaciones por comunidad', 'Total', 'SI', 'NO', '% SI']])
    .setFontWeight('bold').setBackground('#fce5cd');
  if (summary.byCommunity.length) {
    sheet.getRange(communityStart + 1, 1, summary.byCommunity.length, 5).setValues(summary.byCommunity);
    sheet.getRange(communityStart + 1, 5, summary.byCommunity.length, 1).setNumberFormat('0.0%');
  }

  sheet.setFrozenRows(4);
  sheet.autoResizeColumns(1, 5);
}

function buildRegistrationSummaryKpiRows_(summary) {
  const kpis = summary.kpis;
  return [
    ['Resumen de preregistro - Bienvenida de Transferencias AD26', ''],
    [`Actualizado: ${Utilities.formatDate(summary.generatedAt, AD26_CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm')}`, ''],
    ['', ''],
    ['Indicador', 'Valor'],
    ['Poblacion activa', kpis.active],
    ['Respuestas unicas', kpis.responses],
    ['Si asistire', kpis.yes],
    ['No podre asistir', kpis.no],
    ['Pendientes', kpis.pending],
    ['% de respuesta', kpis.responseRate],
    [`Avance hacia cupo (${kpis.capacity})`, kpis.capacityProgress],
    ['Lugares disponibles', kpis.available],
    ['Salud - respuestas', kpis.health.total],
    ['Salud - SI', kpis.health.yes],
    ['Salud - NO', kpis.health.no]
  ];
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

  const existingWidth = Math.max(1, sheet.getLastColumn());
  const existing = sheet.getRange(1, 1, 1, existingWidth).getValues()[0]
    .map(value => String(value || '').trim());
  const hasExistingHeader = existing.some(Boolean);
  if (hasExistingHeader) {
    const mismatch = existing.some((header, index) => header && headers[index] !== header);
    if (mismatch) throw new Error(`La hoja ${name} tiene encabezados distintos. No se modifico.`);
    const missing = headers.slice(existing.length);
    if (missing.length) sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
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
    ['LOTE_ENVIO', String(AD26_EMAIL_CAMPAIGN.DEFAULT_BATCH_SIZE), 'Maximo de invitaciones por ejecucion manual'],
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

function selectTestMentors_(sheet, count) {
  const mentors = Array.from(readMentors_(sheet).byId.values())
    .filter(mentor => mentor.active && mentor.id !== AD26_TEST_FIXTURES.legacyMentorId);
  if (mentors.length < count) {
    throw new Error(`Se requieren al menos ${count} mentores activos para crear los datos de prueba.`);
  }

  // Prioriza comunidades distintas para comprobar que el lookup no mezcla asignaciones.
  const shuffled = shuffle_(mentors);
  const selected = [];
  const communities = new Set();
  shuffled.forEach(mentor => {
    if (selected.length >= count || communities.has(normalizeText_(mentor.community))) return;
    selected.push(mentor);
    communities.add(normalizeText_(mentor.community));
  });
  shuffled.forEach(mentor => {
    if (selected.length >= count || selected.some(item => item.id === mentor.id)) return;
    selected.push(mentor);
  });
  return selected;
}

function buildTestAssignments_(mentors, importedAt) {
  const email = getTestEmail_();
  return [
    [
      'A00000001', 'Prueba Comunidad Uno', 'AD26', email, 'Campus Puebla',
      'Ingenieria', mentors[0].community, 'MENTORIA', mentors[0].id,
      mentors[0].name, true, 'AD26-TEST', importedAt
    ],
    [
      'A00000002', 'Prueba Salud', 'AD26', email,
      'Campus Ciudad de Mexico', 'Escuela de Medicina y Ciencias de la Salud',
      'Salud', 'SALUD', '', '', true, 'AD26-TEST', importedAt
    ],
    [
      'A00000003', 'Prueba Comunidad Dos', 'AD26', email, 'Campus Guadalajara',
      'Negocios', mentors[1].community, 'MENTORIA', mentors[1].id,
      mentors[1].name, true, 'AD26-TEST', importedAt
    ]
  ];
}

function getTestEmail_() {
  const configured = cleanText_(PropertiesService.getScriptProperties().getProperty('AD26_TEST_EMAIL'));
  return isValidEmail_(configured) ? configured : AD26_TEST_FIXTURES.defaultTestEmail;
}

function shuffle_(items) {
  const copy = items.slice();
  for (let index = copy.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = current;
  }
  return copy;
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
    now, error.row, error.matricula, error.code, error.detail, error.level, error.source || ''
  ]);
  sheet.getRange(2, 1, rows.length, AD26_HEADERS.ERRORS.length).setValues(rows);
}

function buildImportReport_(previewOnly, validRows, errors, published) {
  return {
    mode: previewOnly ? 'PREVIEW' : 'PUBLISH',
    validRows,
    blockingErrors: errors.filter(error => error.level === 'BLOQUEANTE').length,
    warnings: errors.filter(error => error.level === 'ADVERTENCIA').length,
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
  notify_(`${title}\n\nFilas validas: ${report.validRows}\nErrores bloqueantes: ${report.blockingErrors}\nAdvertencias: ${report.warnings}\n${report.message}`);
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
