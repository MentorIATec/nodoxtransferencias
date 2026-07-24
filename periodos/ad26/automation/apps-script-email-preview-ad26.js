/**
 * BIENVENIDA DE TRANSFERENCIAS AD26 - PRUEBA DE CORREO
 *
 * Copiar este archivo al mismo proyecto de Apps Script que apps-script-ad26.js.
 * Tambien agregar las plantillas HTML con sus nombres exactos:
 * - email-invitacion-ad26
 * - email-recordatorio-asignacion-ad26
 */

const AD26_EMAIL_PREVIEW = Object.freeze({
  REGISTRATION_URL: 'https://transferencias-ad26.vercel.app',
  HERO_URL: 'https://raw.githubusercontent.com/MentorIATec/nodoxtransferencias/ad26/periodos/ad26/assets/hero-comunidad-mentoria-ad26.jpg',
  SENDER_NAME: 'Comité de Transferencias Monterrey',
  FALLBACK_REPLY_TO: 'mentoreo.mty@servicios.tec.mx',
  TEMPLATES: Object.freeze({
    'email-invitacion-ad26': 'Ya hay una comunidad esperándote en Campus Monterrey',
    'email-recordatorio-asignacion-ad26': 'Tu comunidad ya está lista: necesitamos tu respuesta'
  })
});

function configurarCorreoPruebaAd26() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Correo de prueba AD26',
    'Escribe la cuenta autorizada que recibirá los borradores y envíos de prueba.',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;

  const email = cleanText_(response.getResponseText()).toLowerCase();
  if (!isValidEmail_(email)) throw new Error('Correo de prueba inválido.');
  PropertiesService.getScriptProperties().setProperty('AD26_TEST_EMAIL', email);
  notify_(`Correo de prueba configurado: ${email}`);
}

function crearBorradorCorreoPruebaAd26() {
  const payload = buildEmailPreviewPayloadAd26_();
  const draft = GmailApp.createDraft(
    payload.recipient,
    `[PRUEBA AD26] ${payload.subject}`,
    '',
    payload.options
  );
  notify_(
    `Borrador creado para ${payload.recipient}.\n\n` +
    `Template: ${payload.templateName}\n` +
    `Matricula: ${payload.assignment.matricula}\n` +
    'Revísalo en Gmail antes de enviar una prueba real.'
  );
  return draft.getId();
}

function enviarCorreoPruebaAd26() {
  const ui = SpreadsheetApp.getUi();
  const payload = buildEmailPreviewPayloadAd26_();
  const response = ui.prompt(
    'Enviar correo de prueba AD26',
    `Se enviará únicamente a ${payload.recipient}.\n\nEscribe ENVIAR PRUEBA para confirmar.`,
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK || response.getResponseText().trim() !== 'ENVIAR PRUEBA') {
    notify_('No se envió ningún correo.');
    return;
  }

  GmailApp.sendEmail(
    payload.recipient,
    `[PRUEBA AD26] ${payload.subject}`,
    '',
    payload.options
  );
  notify_(`Correo de prueba enviado a ${payload.recipient}.`);
}

function ejecutarPruebaConfirmadaAd26() {
  const recipient = AD26_TEST_FIXTURES.defaultTestEmail;
  prepareTestDataAd26_(recipient);
  const result = sendRemoteTestEmailAd26_({
    recipient,
    template: 'email-invitacion-ad26',
    matricula: 'A00000001'
  });
  const response = JSON.parse(result.getContent());
  if (!response.ok) throw new Error(response.error || 'No fue posible enviar la prueba AD26.');
  notify_('Prueba AD26 ejecutada. Revisa kareng@tec.mx y la matricula A00000001.');
  return response;
}

function buildEmailPreviewPayloadAd26_(options) {
  const settings = options || {};
  let templateName = cleanText_(settings.templateName);
  if (!templateName) {
    const ui = SpreadsheetApp.getUi();
    const templateResponse = ui.prompt(
      'Template para previsualizar',
      'Escribe email-invitacion-ad26 o email-recordatorio-asignacion-ad26.',
      ui.ButtonSet.OK_CANCEL
    );
    if (templateResponse.getSelectedButton() !== ui.Button.OK) throw new Error('Prueba cancelada.');
    templateName = cleanText_(templateResponse.getResponseText());
  }
  const subject = AD26_EMAIL_PREVIEW.TEMPLATES[templateName];
  if (!subject) throw new Error('Template no permitido para prueba AD26.');

  const ss = getAd26Spreadsheet_();
  const matricula = normalizeMatricula_(
    settings.matricula ||
    PropertiesService.getScriptProperties().getProperty('AD26_TEST_MATRICULA') ||
    AD26_TEST_FIXTURES.matriculas[0]
  );
  const assignment = findAssignment_(ss, matricula);
  if (!assignment || !isTestMatricula_(matricula)) {
    throw new Error('Carga primero los datos de prueba AD26 antes de crear el correo.');
  }

  const mentor = assignment.population === 'SALUD'
    ? null
    : findMentorForAssignment_(ss, assignment);
  const saludo = `Hola ${firstName_(assignment.names)},`;
  const html = renderTemplateAd26_(templateName, {
    saludo,
    CONFIG: {
      EVENTO: {
        confirmacion_url: AD26_EMAIL_PREVIEW.REGISTRATION_URL
      }
    }
  });
  const replyTo = mentor && isValidEmail_(mentor.email)
    ? mentor.email
    : AD26_EMAIL_PREVIEW.FALLBACK_REPLY_TO;

  return {
    assignment,
    recipient: getTestEmail_(),
    templateName,
    subject,
    options: {
      htmlBody: html,
      name: AD26_EMAIL_PREVIEW.SENDER_NAME,
      replyTo,
      inlineImages: {
        ad26_community_hero: UrlFetchApp.fetch(AD26_EMAIL_PREVIEW.HERO_URL)
          .getBlob()
          .setName('ad26_community_hero.jpg')
      }
    }
  };
}

function sendRemoteTestEmailAd26_(body) {
  const recipient = cleanText_(body.recipient).toLowerCase();
  const authorizedRecipient = getTestEmail_().toLowerCase();
  const templateName = cleanText_(body.template);
  const matricula = normalizeMatricula_(body.matricula);

  if (!isValidEmail_(recipient) || recipient !== authorizedRecipient) {
    return jsonResponse_({ error: 'Destinatario de prueba no autorizado' }, 403);
  }
  if (!AD26_EMAIL_PREVIEW.TEMPLATES[templateName] || !isTestMatricula_(matricula)) {
    return jsonResponse_({ error: 'Parametros de prueba no permitidos' }, 400);
  }

  const ss = getAd26Spreadsheet_();
  const registration = readSettings_(requireSheet_(ss, AD26_CONFIG.SHEETS.SETTINGS));
  if (parseBoolean_(registration.REGISTRO_ABIERTO) || !parseBoolean_(registration.MODO_PRUEBA)) {
    return jsonResponse_({ error: 'La prueba remota requiere registro cerrado y modo de prueba activo' }, 409);
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return jsonResponse_({ error: 'Prueba ocupada; intenta nuevamente' }, 503);
  try {
    const cache = CacheService.getScriptCache();
    const cacheKey = `ad26-email-test:${templateName}:${matricula}:${recipient}`;
    if (cache.get(cacheKey)) {
      return jsonResponse_({ error: 'La misma prueba ya fue enviada recientemente' }, 409);
    }

    const payload = buildEmailPreviewPayloadAd26_({ templateName, matricula });
    GmailApp.sendEmail(
      payload.recipient,
      `[PRUEBA AD26] ${payload.subject}`,
      '',
      payload.options
    );
    cache.put(cacheKey, 'sent', 300);
    return jsonResponse_({
      ok: true,
      recipient: payload.recipient,
      template: payload.templateName,
      matricula: payload.assignment.matricula,
      subject: `[PRUEBA AD26] ${payload.subject}`
    }, 200);
  } finally {
    lock.releaseLock();
  }
}

function renderTemplateAd26_(templateName, data) {
  const template = HtmlService.createTemplateFromFile(templateName);
  Object.keys(data).forEach(key => {
    template[key] = data[key];
  });
  return template.evaluate().getContent();
}
