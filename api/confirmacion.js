import {
  isValidMatricula,
  normalizeMatricula,
  postAppsScript
} from '../periodos/ad26/server/apps-script.js';

function normalizeAnswer(value) {
  if (value === true) return 'SI';
  if (value === false) return 'NO';
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
  return normalized === 'SI' || normalized === 'NO' ? normalized : '';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  const matricula = normalizeMatricula(req.body && req.body.matricula);
  const asistira = normalizeAnswer(req.body && req.body.asistira);
  if (!isValidMatricula(matricula)) {
    return res.status(400).json({ error: 'Matricula invalida' });
  }
  if (!asistira) {
    return res.status(400).json({ error: 'Respuesta invalida' });
  }

  try {
    const { data, status } = await postAppsScript('confirmacion', {
      matricula,
      asistira
    });
    if (status !== 200) {
      return res.status(status).json({
        error: data.error || 'No fue posible registrar la respuesta',
        code: data.code || null,
        response: data.response || null,
        capacity: data.capacity || null
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('AD26 confirmation:', error.message);
    return res.status(error.status || 502).json({
      error: error.status === 500
        ? 'Configuracion incompleta del servidor'
        : 'No fue posible registrar tu respuesta. Intenta nuevamente.'
    });
  }
}
