import {
  isValidMatricula,
  normalizeMatricula,
  postAppsScript
} from '../periodos/ad26/server/apps-script.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  const matricula = normalizeMatricula(req.body && req.body.matricula);
  if (!isValidMatricula(matricula)) {
    return res.status(400).json({ error: 'Matricula invalida' });
  }

  try {
    const { data, status } = await postAppsScript('lookup', { matricula });
    if (status !== 200) {
      return res.status(status).json({
        error: data.error || 'No fue posible consultar la matricula',
        code: data.code || null
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('AD26 lookup:', error.message);
    return res.status(error.status || 502).json({
      error: error.status === 500
        ? 'Configuracion incompleta del servidor'
        : 'No fue posible consultar el registro. Intenta nuevamente.'
    });
  }
}
