import hashlib
import hmac
import json
import os
import re
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from dotenv import load_dotenv


CHECKIN_FILE_CANDIDATES = [Path('data/checkin.csv'), Path('checkin.csv')]
ENCUESTA_FILE_CANDIDATES = [Path('data/encuesta.csv'), Path('encuesta.csv')]
OUTPUT_DIR = Path('output')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def resolve_input_path(candidates):
    for path in candidates:
        if path.exists():
            return path
    raise FileNotFoundError(f'No se encontró ningún archivo en: {candidates}')


def normalize_matricula(value):
    if pd.isna(value):
        return ''
    normalized = re.sub(r'[^A-Z0-9]', '', str(value).strip().upper())
    return normalized


def build_student_id(secret, raw_value):
    normalized = normalize_matricula(raw_value)
    digest = hmac.new(secret.encode('utf-8'), normalized.encode('utf-8'), hashlib.sha256).hexdigest()
    return digest


def read_csv_with_fallback(path):
    encodings = ['utf-8', 'utf-8-sig', 'latin1', 'cp1252']
    last_err = None
    for enc in encodings:
        try:
            return pd.read_csv(path, encoding=enc)
        except Exception as err:
            last_err = err
    raise RuntimeError(f'No se pudo leer {path}: {last_err}')


def find_col(columns, startswith=None, contains=None, exact=None):
    for col in columns:
        col_norm = col.strip()
        if exact and col_norm == exact:
            return col
        if startswith and col_norm.startswith(startswith):
            return col
        if contains and contains in col_norm:
            return col
    return None


def split_multiselect(value):
    if pd.isna(value):
        return []
    text = str(value).strip()
    if not text:
        return []

    # Separa por comas solo cuando están fuera de paréntesis para no romper etiquetas.
    parts = []
    current = []
    depth = 0
    for ch in text:
        if ch == '(':
            depth += 1
        elif ch == ')' and depth > 0:
            depth -= 1

        if ch in ['\n', '|', ';'] or (ch == ',' and depth == 0):
            token = ''.join(current).strip()
            if token:
                parts.append(token)
            current = []
            continue
        current.append(ch)

    tail = ''.join(current).strip()
    if tail:
        parts.append(tail)
    return parts


def top_from_multiselect(series, top_n=10):
    exploded = series.fillna('').apply(split_multiselect).explode()
    exploded = exploded[exploded.notna() & (exploded.astype(str).str.strip() != '')]
    if exploded.empty:
        return pd.Series(dtype='int64')
    return exploded.value_counts().head(top_n)


def parse_rating(value):
    if pd.isna(value):
        return np.nan
    text = str(value).strip().lower()
    text_norm = (
        text.replace('á', 'a')
        .replace('é', 'e')
        .replace('í', 'i')
        .replace('ó', 'o')
        .replace('ú', 'u')
    )

    mapping = {
        'excelente': 5.0,
        'muy buena': 4.0,
        'buena': 3.0,
        'adecuada': 2.0,
        'basica': 1.0,
        'super util': 5.0,
        'util': 4.0,
        'mas o menos util': 3.0,
        'poco util': 2.0,
        'no lo tome / no lo aproveche': 1.0,
    }
    if text_norm in mapping:
        return mapping[text_norm]

    match = re.search(r'\d+(?:\.\d+)?', text_norm)
    if match:
        return float(match.group(0))
    return np.nan


def classify_text_theme(text):
    if pd.isna(text) or not str(text).strip():
        return []

    t = str(text).lower()
    themes = []

    rules = {
        'logística': [
            'lugar', 'espacio', 'registro', 'fila', 'acceso', 'transporte', 'estacionamiento',
            'organización', 'organizacion', 'logística', 'logistica'
        ],
        'horario': [
            'horario', 'hora', 'tiempo', 'viernes', 'mañana', 'manana', 'tarde', 'clase',
            'materia', 'agenda'
        ],
        'comunicación previa': [
            'aviso', 'correo', 'mail', 'whatsapp', 'comunicación', 'comunicacion',
            'informaron', 'recordatorio', 'difusión', 'difusion'
        ],
        'acompañamiento emocional': [
            'ansiedad', 'nervio', 'emocional', 'soledad', 'acompañamiento', 'estrés', 'estres',
            'apoyo', 'escuchar', 'confianza'
        ],
        'integración social': [
            'amigos', 'personas', 'conocer', 'integración', 'integracion', 'convivir',
            'social', 'grupo', 'vínculo', 'vinculo', 'red'
        ],
        'claridad de información': [
            'claro', 'claridad', 'duda', 'explicar', 'información', 'informacion',
            'proceso', 'pasos', 'orientación', 'orientacion'
        ],
    }

    for theme, keywords in rules.items():
        if any(k in t for k in keywords):
            themes.append(theme)

    if not themes:
        themes.append('otros')
    return themes


def render_bar(series, title, xlabel, ylabel, outpath, rotation=35):
    plt.figure(figsize=(10, 5))
    if isinstance(series.index, pd.DatetimeIndex):
        xvals = series.index.strftime('%H:%M')
    else:
        xvals = series.index.astype(str)
    plt.bar(xvals, series.values)
    plt.title(title)
    plt.xlabel(xlabel)
    plt.ylabel(ylabel)
    plt.xticks(rotation=rotation, ha='right')
    plt.tight_layout()
    plt.savefig(outpath, dpi=160)
    plt.close()


def build_report(
    checkin_metrics,
    checkpoint_metrics,
    insights,
    attendance_gap_text,
    recommendations_df,
    out_file,
    storytelling_script=None,
):
    lines = []
    lines.append('# REPORTE EJECUTIVO')
    lines.append('Bienvenida de Transferencias | Campus Monterrey')
    lines.append('')
    lines.append('## 1. CHECK-IN: ¿Quién llegó y cómo se comportó la asistencia?')
    lines.extend([
        f"- Registros totales: **{checkin_metrics['total_registros']}**.",
        f"- Check-ins únicos: **{checkin_metrics['total_checkins_unicos']}**.",
        f"- Duplicados operativos: **{checkin_metrics['pct_duplicados']:.1f}%**.",
        f"- Comunidad con mayor asistencia: **{checkin_metrics['top_comunidad']}**.",
        f"- Mayor concentración de llegada: **{checkin_metrics['pico_hora']}**.",
    ])
    lines.append('')
    lines.append('Qué significan estos datos para integración')
    lines.append('- La concentración de llegadas facilita activar dinámicas grupales de forma sincronizada.')
    lines.append('- Las diferencias por comunidad/carrera permiten focalizar recursos de mentoría donde hay más demanda.')
    lines.append('- El nivel de duplicados sugiere oportunidad para fortalecer el protocolo de registro en sitio.')
    lines.append('')
    lines.append('Alertas tempranas')
    lines.append('- Segmentos con baja representación pueden quedar fuera de redes de apoyo informales.')
    lines.append('- Si pocos mentores concentran gran volumen, aumenta riesgo de sobrecarga de acompañamiento.')
    lines.append('')

    lines.append('## 2. CHECK-POINT: ¿Cómo vivieron la experiencia?')
    lines.append('Qué funcionó mejor')
    lines.append(
        f"- La calificación general promedio fue **{format_rating_for_report(checkpoint_metrics['promedio_rating_general'])}**."
    )
    lines.append(
        f"- El recorrido por campus obtuvo **{format_rating_for_report(checkpoint_metrics['promedio_rating_recorrido'])}** en promedio."
    )
    lines.append('')
    lines.append('Qué generó mayor impacto en integración')
    lines.append(f"- Top áreas con contacto: **{', '.join(checkpoint_metrics['top_areas_labels'])}**.")
    lines.append(f"- Top aprendizajes de dinámica: **{', '.join(checkpoint_metrics['top_aprendizajes_labels'])}**.")
    lines.append('')
    lines.append('Principales barreras de asistencia')
    lines.append(f"- Tasa de asistencia reportada en encuesta: **{checkpoint_metrics['tasa_asistencia_reportada']:.1f}%**.")
    lines.append(f"- Motivos más frecuentes de no asistencia: **{', '.join(checkpoint_metrics['top_motivos_labels'])}**.")
    lines.append('')
    lines.append('Señales sobre percepción de mentoría')
    lines.append(f"- Apoyos más solicitados a mentoría: **{', '.join(checkpoint_metrics['top_apoyos_labels'])}**.")
    lines.append('')

    lines.append('## 3. CHECK-OUT: ¿Qué nos llevamos como Comité?')
    for idx, item in enumerate(insights, start=1):
        lines.append(f'{idx}. {item}')
    lines.append('')
    lines.append(f'- Brecha asistencia real vs reportada: {attendance_gap_text}')
    lines.append('')

    lines.append('## 4. Recomendaciones priorizadas (Impacto x Esfuerzo)')
    lines.append('')
    lines.append('| Iniciativa | Impacto (Alto/Medio/Bajo) | Esfuerzo (Alto/Medio/Bajo) | Dueño sugerido |')
    lines.append('|---|---|---|---|')
    for _, row in recommendations_df.iterrows():
        lines.append(f"| {row['Iniciativa']} | {row['Impacto']} | {row['Esfuerzo']} | {row['Dueño sugerido']} |")
    lines.append('')

    lines.append('## 5. Próximos pasos estratégicos')
    lines.append('- Escalabilidad: estandarizar el playbook operativo y de comunicación pre-evento por cohorte.')
    lines.append('- Seguimiento longitudinal: medir evolución a 30/60/90 días de integración académica y social.')
    lines.append('- Indicadores de bienestar: incorporar pulso de soledad percibida, claridad de ruta y pertenencia.')
    lines.append('- Preparación siguiente edición: ajustar horario, recordatorios multicanal y carga por mentor.')
    lines.append('')
    lines.append('## 6. Hoja de ruta 30/60/90 días (Board-ready)')
    lines.append('**30 días**')
    lines.append('- Cerrar brechas de comunicación previa con secuencia multicanal y monitoreo de apertura/respuesta.')
    lines.append('- Estandarizar checklist operativo de registro para asegurar consistencia por comunidad.')
    lines.append('**60 días**')
    lines.append('- Implementar seguimiento quincenal de mentoría con semáforo de riesgo de desconexión.')
    lines.append('- Consolidar tablero de integración por comunidad (asistencia, pertenencia, uso de apoyos).')
    lines.append('**90 días**')
    lines.append('- Presentar evaluación de impacto (integración social + adaptación académica + bienestar temprano).')
    lines.append('- Definir modelo escalable para siguiente edición con presupuesto y roles por dueño.')
    if storytelling_script:
        lines.append('')
        lines.append('## 7. Narrativa para presentación (3–5 min)')
        for idx, item in enumerate(storytelling_script, start=1):
            lines.append(f'{idx}. {item}')
    lines.append('')
    lines.append('Documento generado automáticamente sin incluir PII.')

    out_file.write_text('\n'.join(lines), encoding='utf-8')


def format_rating_for_report(value):
    if value is None:
        return 'N/D'
    if isinstance(value, float) and np.isnan(value):
        return 'N/D'
    return f'{value:.2f}/5'


def series_to_payload(series, label_key='label', value_key='value'):
    if series is None or len(series) == 0:
        return []
    return [{label_key: str(idx), value_key: int(val)} for idx, val in series.items()]


def generate_dashboard(
    checkin_metrics,
    checkpoint_metrics,
    recommendations_df,
    payloads,
    storytelling_insights,
    out_html,
    out_json,
):
    dashboard_data = {
        'kpis': {
            'checkins_unicos': int(checkin_metrics['total_checkins_unicos']),
            'registros_totales': int(checkin_metrics['total_registros']),
            'duplicados_pct': round(float(checkin_metrics['pct_duplicados']), 1),
            'asistencia_reportada_pct': round(float(checkpoint_metrics['tasa_asistencia_reportada']), 1),
            'rating_general': (
                round(float(checkpoint_metrics['promedio_rating_general']), 2)
                if not np.isnan(checkpoint_metrics['promedio_rating_general'])
                else None
            ),
            'rating_recorrido': (
                round(float(checkpoint_metrics['promedio_rating_recorrido']), 2)
                if not np.isnan(checkpoint_metrics['promedio_rating_recorrido'])
                else None
            ),
        },
        'charts': payloads,
        'storytelling_insights': storytelling_insights,
        'recomendaciones': recommendations_df.to_dict(orient='records'),
    }
    out_json.write_text(json.dumps(dashboard_data, ensure_ascii=False, indent=2), encoding='utf-8')

    html = """<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dashboard | Bienvenida de Transferencias</title>
  <script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
  <style>
    :root {
      --bg: #f5f7fb;
      --panel: #ffffff;
      --ink: #1a2433;
      --muted: #607086;
      --brand: #0f766e;
      --accent: #ef4444;
      --line: #e2e8f0;
    }
    body {
      margin: 0;
      font-family: "Avenir Next", "Segoe UI", sans-serif;
      color: var(--ink);
      background: radial-gradient(circle at 10% 20%, #fef3c7 0%, var(--bg) 35%), var(--bg);
    }
    .wrap {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }
    h1 {
      margin: 0 0 8px 0;
      font-size: 30px;
      letter-spacing: 0.2px;
    }
    .sub {
      color: var(--muted);
      margin-bottom: 16px;
    }
    .kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .kpi {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.04);
    }
    .kpi .label { color: var(--muted); font-size: 12px; }
    .kpi .value { font-size: 24px; font-weight: 700; margin-top: 4px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 12px;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 8px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.04);
    }
    .chart { min-height: 320px; }
    .table-wrap {
      margin-top: 12px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th, td {
      border-bottom: 1px solid var(--line);
      text-align: left;
      padding: 10px 12px;
    }
    th { background: #f8fafc; }
    .footer-note {
      margin-top: 12px;
      color: var(--muted);
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Dashboard Ejecutivo - Bienvenida de Transferencias</h1>
    <div class="sub">CHECK-IN / CHECK-POINT / CHECK-OUT | Campus Monterrey</div>

    <div class="kpis" id="kpiGrid"></div>

    <div class="grid">
      <div class="card"><div id="chartLlegadas" class="chart"></div></div>
      <div class="card"><div id="chartComunidad" class="chart"></div></div>
      <div class="card"><div id="chartAsistencia" class="chart"></div></div>
      <div class="card"><div id="chartRatingGeneral" class="chart"></div></div>
      <div class="card"><div id="chartMotivos" class="chart"></div></div>
      <div class="card"><div id="chartApoyos" class="chart"></div></div>
    </div>

    <div class="table-wrap" style="margin-top:14px; padding: 10px 12px;">
      <h3 style="margin:4px 0 8px 0;">Storytelling Insights</h3>
      <ol id="storyList" style="margin: 0 0 8px 18px; color:#334155;"></ol>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Iniciativa</th>
            <th>Impacto</th>
            <th>Esfuerzo</th>
            <th>Dueño sugerido</th>
          </tr>
        </thead>
        <tbody id="tbodyReco"></tbody>
      </table>
    </div>

    <div class="footer-note">Sin PII: el dashboard usa métricas agregadas y anonimización por diseño.</div>
  </div>

  <script>
    const data = __DASHBOARD_DATA__;

    const kpiEntries = [
      ["Check-ins únicos", data.kpis.checkins_unicos],
      ["Registros totales", data.kpis.registros_totales],
      ["Duplicados (%)", data.kpis.duplicados_pct],
      ["Asistencia reportada (%)", data.kpis.asistencia_reportada_pct],
      ["Rating general", data.kpis.rating_general ?? "N/D"],
      ["Rating recorrido", data.kpis.rating_recorrido ?? "N/D"]
    ];

    const kpiGrid = document.getElementById("kpiGrid");
    kpiEntries.forEach(([label, value]) => {
      const node = document.createElement("div");
      node.className = "kpi";
      node.innerHTML = `<div class="label">${label}</div><div class="value">${value}</div>`;
      kpiGrid.appendChild(node);
    });

    function barFromPayload(chartId, payload, title, orientation = "v", color = "#0f766e") {
      const x = orientation === "v" ? payload.map(d => d.label) : payload.map(d => d.value);
      const y = orientation === "v" ? payload.map(d => d.value) : payload.map(d => d.label);
      const trace = {
        type: "bar",
        x, y,
        orientation,
        marker: { color }
      };
      const layout = {
        title,
        margin: { t: 48, r: 18, b: 70, l: 70 },
        paper_bgcolor: "white",
        plot_bgcolor: "white"
      };
      Plotly.newPlot(chartId, [trace], layout, {responsive: true, displaylogo: false});
    }

    barFromPayload("chartLlegadas", data.charts.llegadas_por_hora, "Curva de llegadas por hora");
    barFromPayload("chartComunidad", data.charts.comunidad_top10, "Check-ins por comunidad (Top 10)", "h", "#2563eb");
    barFromPayload("chartAsistencia", data.charts.asistencia_reportada, "Asistencia reportada", "v", "#f59e0b");
    barFromPayload("chartRatingGeneral", data.charts.rating_general, "Distribución rating general", "v", "#8b5cf6");
    barFromPayload("chartMotivos", data.charts.motivos_no_asistencia, "Motivos principales de no asistencia", "h", "#ef4444");
    barFromPayload("chartApoyos", data.charts.apoyos_mentor, "Apoyos solicitados a mentoría", "h", "#14b8a6");

    const tbody = document.getElementById("tbodyReco");
    data.recomendaciones.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row["Iniciativa"]}</td>
        <td>${row["Impacto"]}</td>
        <td>${row["Esfuerzo"]}</td>
        <td>${row["Dueño sugerido"]}</td>
      `;
      tbody.appendChild(tr);
    });

    const storyList = document.getElementById("storyList");
    data.storytelling_insights.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      li.style.marginBottom = "6px";
      storyList.appendChild(li);
    });
  </script>
</body>
</html>
"""
    html = html.replace('__DASHBOARD_DATA__', json.dumps(dashboard_data, ensure_ascii=False))
    out_html.write_text(html, encoding='utf-8')


def main():
    load_dotenv()
    secret = os.getenv('MATRICULA_SECRET', '').strip()
    if not secret:
        raise EnvironmentError('Falta variable de entorno MATRICULA_SECRET')

    checkin_path = resolve_input_path(CHECKIN_FILE_CANDIDATES)
    encuesta_path = resolve_input_path(ENCUESTA_FILE_CANDIDATES)

    checkin = read_csv_with_fallback(checkin_path)
    encuesta = read_csv_with_fallback(encuesta_path)

    # --- Sanitización CHECK-IN ---
    checkin['id_estudiante'] = checkin['matricula'].apply(lambda x: build_student_id(secret, x))
    checkin_sanitizado = checkin.drop(columns=[c for c in ['matricula', 'nombre'] if c in checkin.columns])
    checkin_sanitizado.to_csv(OUTPUT_DIR / 'checkin_sanitizado.csv', index=False)

    # --- Sanitización ENCUESTA ---
    id_col_encuesta = 'Id' if 'Id' in encuesta.columns else None
    if id_col_encuesta is None:
        raise KeyError('No se encontró la columna Id en encuesta.csv para pseudonimización')

    encuesta['id_estudiante'] = encuesta[id_col_encuesta].apply(lambda x: build_student_id(secret, x))
    encuesta_sanitizada = encuesta.drop(columns=[c for c in ['Email', 'Name'] if c in encuesta.columns])
    encuesta_sanitizada.to_csv(OUTPUT_DIR / 'encuesta_sanitizada.csv', index=False)

    # --- CHECK-IN ---
    total_registros = len(checkin_sanitizado)
    total_checkins_unicos = checkin_sanitizado['id_estudiante'].nunique(dropna=True)
    pct_duplicados = ((total_registros - total_checkins_unicos) / total_registros * 100) if total_registros else 0.0

    checkins_por_comunidad = (
        checkin_sanitizado['comunidad']
        .fillna('Sin dato')
        .astype(str)
        .str.strip()
        .replace('', 'Sin dato')
        .value_counts()
        .rename_axis('comunidad')
        .reset_index(name='checkins')
    )
    checkins_por_comunidad.to_csv(OUTPUT_DIR / 'checkins_por_comunidad.csv', index=False)

    checkins_por_carrera = (
        checkin_sanitizado['carrera'].fillna('Sin dato').astype(str).str.strip().replace('', 'Sin dato').value_counts()
    )
    checkins_por_campus = (
        checkin_sanitizado['campus'].fillna('Sin dato').astype(str).str.strip().replace('', 'Sin dato').value_counts()
    )
    top_mentores = (
        checkin_sanitizado['mentor'].fillna('Sin dato').astype(str).str.strip().replace('', 'Sin dato').value_counts().head(10)
    )

    checkin_ts = pd.to_datetime(checkin_sanitizado['timestamp'], errors='coerce')
    llegadas_por_hora = (
        checkin_ts.dropna().dt.floor('h').value_counts().sort_index()
    )
    if llegadas_por_hora.empty:
        llegadas_por_hora = pd.Series(dtype='int64')

    if not llegadas_por_hora.empty:
        render_bar(
            llegadas_por_hora,
            'Curva de Llegadas por Hora',
            'Hora',
            'Número de check-ins',
            OUTPUT_DIR / 'llegadas_por_hora.png',
            rotation=20,
        )
    else:
        plt.figure(figsize=(8, 4))
        plt.title('Curva de Llegadas por Hora')
        plt.text(0.5, 0.5, 'Sin datos de timestamp válidos', ha='center', va='center')
        plt.axis('off')
        plt.tight_layout()
        plt.savefig(OUTPUT_DIR / 'llegadas_por_hora.png', dpi=160)
        plt.close()

    render_bar(
        checkins_por_comunidad.head(10).set_index('comunidad')['checkins'],
        'Check-ins por Comunidad (Top 10)',
        'Comunidad',
        'Check-ins',
        OUTPUT_DIR / 'checkins_por_comunidad_top10.png',
        rotation=35,
    )

    # --- CHECK-POINT ---
    asistencia_col = find_col(encuesta_sanitizada.columns, startswith='¿Pudiste asistir al evento')
    motivo_no_asistencia_col = find_col(encuesta_sanitizada.columns, startswith='¿Cuál fue el principal motivo')
    areas_col = find_col(encuesta_sanitizada.columns, startswith='¿Con cuáles áreas o espacios')
    dinamica_col = find_col(encuesta_sanitizada.columns, startswith='La dinámica de integración me ayudó')
    rating_recorrido_col = find_col(encuesta_sanitizada.columns, startswith='¿Cómo calificarías el recorrido')
    apoyos_mentor_col = find_col(encuesta_sanitizada.columns, startswith='¿En qué te gustaría que tu mentor/a te apoye más')
    abierto_col = find_col(encuesta_sanitizada.columns, startswith='¿Hay algo que te gustaría compartirnos')
    rating_general_col = find_col(encuesta_sanitizada.columns, startswith='En general, ¿cómo calificarías tu experiencia')

    if not asistencia_col:
        raise KeyError('No se encontró columna de asistencia reportada en encuesta')

    respuestas_totales = len(encuesta_sanitizada)

    asistencia_serie = encuesta_sanitizada[asistencia_col].fillna('').astype(str).str.strip()
    asistio_mask = asistencia_serie.str.contains(r'\bs[ií]\b', case=False, regex=True) & ~asistencia_serie.str.contains(
        r'no', case=False, regex=True
    )
    no_asistio_mask = asistencia_serie.str.contains(r'no', case=False, regex=True)
    asistencia_counts = pd.Series(
        {
            'Asistió': int(asistio_mask.sum()),
            'No asistió': int(no_asistio_mask.sum()),
            'Sin respuesta / ambiguo': int(respuestas_totales - asistio_mask.sum() - no_asistio_mask.sum()),
        }
    )
    tasa_asistencia_reportada = (asistencia_counts['Asistió'] / respuestas_totales * 100) if respuestas_totales else 0.0

    motivos_no_asistencia = pd.Series(dtype='int64')
    if motivo_no_asistencia_col:
        motivos_no_asistencia = (
            encuesta_sanitizada.loc[no_asistio_mask, motivo_no_asistencia_col]
            .fillna('Sin dato')
            .astype(str)
            .str.strip()
            .replace('', 'Sin dato')
            .value_counts()
        )

    encuesta_asistencia_y_motivos = pd.DataFrame(
        {
            'tipo': ['asistencia_reportada'] * len(asistencia_counts)
            + ['motivo_no_asistencia'] * len(motivos_no_asistencia),
            'categoria': list(asistencia_counts.index) + list(motivos_no_asistencia.index),
            'conteo': list(asistencia_counts.values) + list(motivos_no_asistencia.values),
        }
    )
    encuesta_asistencia_y_motivos.to_csv(OUTPUT_DIR / 'encuesta_asistencia_y_motivos.csv', index=False)

    rating_recorrido = (
        encuesta_sanitizada[rating_recorrido_col].apply(parse_rating) if rating_recorrido_col else pd.Series(dtype='float64')
    )
    rating_general = (
        encuesta_sanitizada[rating_general_col].apply(parse_rating) if rating_general_col else pd.Series(dtype='float64')
    )

    promedio_rating_recorrido = float(rating_recorrido.dropna().mean()) if not rating_recorrido.dropna().empty else np.nan
    promedio_rating_general = float(rating_general.dropna().mean()) if not rating_general.dropna().empty else np.nan

    top_areas = top_from_multiselect(encuesta_sanitizada[areas_col], top_n=10) if areas_col else pd.Series(dtype='int64')
    top_aprendizajes = (
        top_from_multiselect(encuesta_sanitizada[dinamica_col], top_n=10) if dinamica_col else pd.Series(dtype='int64')
    )
    top_apoyos = (
        top_from_multiselect(encuesta_sanitizada[apoyos_mentor_col], top_n=10) if apoyos_mentor_col else pd.Series(dtype='int64')
    )

    top_apoyos_df = top_apoyos.rename_axis('apoyo_mentoria').reset_index(name='conteo')
    top_apoyos_df.to_csv(OUTPUT_DIR / 'top_apoyos_mentor.csv', index=False)

    # Texto abierto: palabras frecuentes y clasificación temática
    text_series = encuesta_sanitizada[abierto_col].dropna().astype(str) if abierto_col else pd.Series(dtype='object')
    all_words = []
    stopwords = {
        'de', 'la', 'el', 'y', 'en', 'que', 'a', 'los', 'las', 'un', 'una', 'por', 'para', 'con', 'me',
        'mi', 'muy', 'más', 'mas', 'del', 'al', 'es', 'se', 'no', 'si', 'sí', 'lo', 'como', 'fue', 'todo',
        'gracias', 'evento', 'bienvenida', 'transferencias'
    }
    for txt in text_series:
        words = re.findall(r'[a-záéíóúñ]+', txt.lower())
        all_words.extend([w for w in words if len(w) > 2 and w not in stopwords])

    palabras_frecuentes = pd.Series(all_words).value_counts().head(20) if all_words else pd.Series(dtype='int64')

    temas = text_series.apply(classify_text_theme).explode() if not text_series.empty else pd.Series(dtype='object')
    temas_frecuentes = temas.value_counts() if not temas.empty else pd.Series(dtype='int64')

    # Gráficas de encuesta
    render_bar(
        asistencia_counts,
        'Asistencia Reportada en Encuesta',
        'Categoría',
        'Respuestas',
        OUTPUT_DIR / 'asistencia_reportada.png',
        rotation=20,
    )

    if not rating_recorrido.dropna().empty:
        rec_counts = rating_recorrido.dropna().round().astype(int).value_counts().sort_index()
    else:
        rec_counts = pd.Series({0: 0})
    render_bar(
        rec_counts,
        'Distribución Rating Recorrido',
        'Rating',
        'Frecuencia',
        OUTPUT_DIR / 'rating_recorrido.png',
        rotation=0,
    )

    if not rating_general.dropna().empty:
        gen_counts = rating_general.dropna().round().astype(int).value_counts().sort_index()
    else:
        gen_counts = pd.Series({0: 0})
    render_bar(
        gen_counts,
        'Distribución Rating General',
        'Rating',
        'Frecuencia',
        OUTPUT_DIR / 'rating_general.png',
        rotation=0,
    )

    # --- CHECK-OUT estratégico ---
    tasa_asistencia_real = np.nan
    brecha_asistencia_pp = np.nan

    merged = pd.merge(
        checkin_sanitizado[['id_estudiante']].drop_duplicates(),
        encuesta_sanitizada[['id_estudiante']],
        on='id_estudiante',
        how='inner',
    )
    overlap_encuesta = (len(merged) / respuestas_totales * 100) if respuestas_totales else 0.0

    if overlap_encuesta >= 30:
        tasa_asistencia_real = (len(merged) / respuestas_totales * 100) if respuestas_totales else np.nan
        brecha_asistencia_pp = (
            tasa_asistencia_reportada - tasa_asistencia_real
            if not np.isnan(tasa_asistencia_real)
            else np.nan
        )
        attendance_gap_text = (
            f"asistencia observada en la muestra enlazada {tasa_asistencia_real:.1f}% vs asistencia reportada "
            f"{tasa_asistencia_reportada:.1f}% (brecha {brecha_asistencia_pp:+.1f} pp; "
            f"solapamiento {overlap_encuesta:.1f}%)."
        )
    else:
        attendance_gap_text = (
            f"no comparable con robustez: solapamiento entre bases {overlap_encuesta:.1f}% (<30%). "
            f"Se recomienda homologar identificador entre check-in y encuesta."
        )

    top_comunidad = checkins_por_comunidad.iloc[0]['comunidad'] if not checkins_por_comunidad.empty else 'Sin dato'
    pico_hora = llegadas_por_hora.idxmax().strftime('%H:%M') if not llegadas_por_hora.empty else 'Sin dato'

    top_motivos_labels = list(motivos_no_asistencia.head(3).index) if not motivos_no_asistencia.empty else ['Sin dato']
    top_areas_labels = list(top_areas.head(3).index) if not top_areas.empty else ['Sin dato']
    top_aprendizajes_labels = list(top_aprendizajes.head(3).index) if not top_aprendizajes.empty else ['Sin dato']
    top_apoyos_labels = list(top_apoyos.head(3).index) if not top_apoyos.empty else ['Sin dato']

    top_palabras_txt = ', '.join(palabras_frecuentes.head(5).index) if not palabras_frecuentes.empty else 'sin texto suficiente'
    top_temas_txt = ', '.join([f'{k} ({v})' for k, v in temas_frecuentes.head(3).items()]) if not temas_frecuentes.empty else 'sin temas detectados'

    if not np.isnan(brecha_asistencia_pp):
        brecha_insight_text = (
            f"tasa reportada de asistencia {tasa_asistencia_reportada:.1f}% y brecha {brecha_asistencia_pp:+.1f} pp "
            "frente a asistencia observada en muestra enlazada"
        )
    else:
        brecha_insight_text = (
            f"tasa reportada de asistencia {tasa_asistencia_reportada:.1f}% con solapamiento insuficiente "
            f"entre bases ({overlap_encuesta:.1f}%) para estimar brecha robusta"
        )

    insights = [
        (
            f"Evidencia: {total_checkins_unicos} check-ins únicos y {pct_duplicados:.1f}% de duplicados. "
            'Interpretación: la activación operativa fue sólida, pero el control de registro puede optimizarse. '
            'Acción: implementar validación en tiempo real de duplicados en check-in.'
        ),
        (
            f"Evidencia: {brecha_insight_text}. "
            'Interpretación: existe desalineación entre registro operativo y autopercepción muestral. '
            'Acción: unificar identificador pseudónimo en registro y encuesta para trazabilidad completa.'
        ),
        (
            f"Evidencia: recorrido promedio {promedio_rating_recorrido:.2f}/5 y rating general {promedio_rating_general:.2f}/5. "
            'Interpretación: la experiencia base es positiva y defendible ante Dirección. '
            'Acción: preservar el recorrido como componente núcleo y elevar consistencia entre bloques del evento.'
        ),
        (
            f"Evidencia: principales áreas de contacto: {', '.join(top_areas_labels)}. "
            'Interpretación: esos espacios son nodos de integración efectiva. '
            'Acción: formalizar rutas de contacto priorizadas en agenda oficial de bienvenida.'
        ),
        (
            f"Evidencia: apoyos más solicitados a mentoría: {', '.join(top_apoyos_labels)}. "
            'Interpretación: la mentoría se percibe como puente de adaptación académica y social. '
            'Acción: diseñar guías de conversación para mentores con seguimiento quincenal.'
        ),
        (
            f"Evidencia: motivos de no asistencia más frecuentes: {', '.join(top_motivos_labels)}. "
            'Interpretación: barreras estructurales persisten antes del evento. '
            'Acción: rediseñar horario y lanzar recordatorios multicanal 7/3/1 días antes.'
        ),
        (
            f"Evidencia: texto abierto destaca palabras {top_palabras_txt}; temas dominantes: {top_temas_txt}. "
            'Interpretación: la calidad de comunicación y acompañamiento emocional impacta la retención temprana. '
            'Acción: crear protocolo de bienvenida emocional con mensajes de seguimiento por cohorte.'
        ),
        (
            f"Evidencia: top mentores por volumen muestra concentración en {len(top_mentores.head(3))} perfiles líderes. "
            'Interpretación: hay riesgo de sobrecarga y variabilidad de experiencia. '
            'Acción: balancear asignaciones y habilitar mentores sombra por comunidad.'
        ),
    ]

    storytelling_insights = [
        (
            f"No solo llegaron {total_checkins_unicos} estudiantes: se activó una primera red de pertenencia "
            "en un momento crítico de transición."
        ),
        (
            f"La experiencia fue validada por percepción: rating general {promedio_rating_general:.2f}/5 "
            f"y recorrido {promedio_rating_recorrido:.2f}/5."
        ),
        (
            "Paradoja central: la satisfacción dentro del evento es alta, pero las barreras más fuertes "
            "aparecen antes del evento (ciudad, horario, comunicación previa)."
        ),
        (
            f"Riesgo de medición: el solapamiento entre check-in y encuesta fue {overlap_encuesta:.1f}%, "
            "lo que limita trazabilidad longitudinal del estudiante."
        ),
        (
            "Mentoría funciona como palanca estratégica de adaptación, no como servicio accesorio, "
            "por el tipo de apoyos más demandados."
        ),
        (
            "La no asistencia luce más estructural que individual; el diseño institucional puede corregir "
            "esas fricciones con ajustes de horario y comunicación."
        ),
        (
            "Ventana decisiva de 90 días: sin seguimiento continuo, la satisfacción inicial puede no convertirse "
            "en integración sostenida."
        ),
        (
            "Mensaje para Dirección: ya hay tracción operativa; la siguiente inversión debe enfocarse en "
            "escalabilidad y seguimiento con indicadores de bienestar."
        ),
    ]

    recommendations_df = pd.DataFrame(
        [
            {
                'Iniciativa': 'Protocolo único de datos (check-in + encuesta) con id_estudiante',
                'Impacto': 'Alto',
                'Esfuerzo': 'Medio',
                'Dueño sugerido': 'Coordinación Comité (Karen)',
            },
            {
                'Iniciativa': 'Recordatorios multicanal y segmentados pre-evento (7/3/1 días)',
                'Impacto': 'Alto',
                'Esfuerzo': 'Bajo',
                'Dueño sugerido': 'Comunicación',
            },
            {
                'Iniciativa': 'Ajuste de horario según conflictos académicos detectados',
                'Impacto': 'Alto',
                'Esfuerzo': 'Medio',
                'Dueño sugerido': 'Operación Evento (Monse)',
            },
            {
                'Iniciativa': 'Playbook de mentoría con seguimiento quincenal de riesgo',
                'Impacto': 'Alto',
                'Esfuerzo': 'Medio',
                'Dueño sugerido': 'Mentoría Estudiantil',
            },
            {
                'Iniciativa': 'Célula de integración social entre Embajadores/Linkers por comunidad',
                'Impacto': 'Medio',
                'Esfuerzo': 'Medio',
                'Dueño sugerido': 'Embajadores / Linkers',
            },
            {
                'Iniciativa': 'Tablero ejecutivo mensual con KPIs de integración y bienestar',
                'Impacto': 'Alto',
                'Esfuerzo': 'Alto',
                'Dueño sugerido': 'Direcciones de Entrada',
            },
        ]
    )

    checkin_metrics = {
        'total_registros': total_registros,
        'total_checkins_unicos': total_checkins_unicos,
        'pct_duplicados': pct_duplicados,
        'top_comunidad': top_comunidad,
        'pico_hora': pico_hora,
    }

    checkpoint_metrics = {
        'respuestas_totales': respuestas_totales,
        'tasa_asistencia_reportada': tasa_asistencia_reportada,
        'promedio_rating_recorrido': promedio_rating_recorrido,
        'promedio_rating_general': promedio_rating_general,
        'top_motivos_labels': top_motivos_labels,
        'top_areas_labels': top_areas_labels,
        'top_aprendizajes_labels': top_aprendizajes_labels,
        'top_apoyos_labels': top_apoyos_labels,
    }

    dashboard_payloads = {
        'llegadas_por_hora': (
            [{'label': idx.strftime('%H:%M'), 'value': int(val)} for idx, val in llegadas_por_hora.items()]
            if not llegadas_por_hora.empty
            else []
        ),
        'comunidad_top10': series_to_payload(
            checkins_por_comunidad.head(10).set_index('comunidad')['checkins'],
            label_key='label',
            value_key='value',
        ),
        'asistencia_reportada': series_to_payload(asistencia_counts, label_key='label', value_key='value'),
        'rating_general': series_to_payload(gen_counts, label_key='label', value_key='value'),
        'motivos_no_asistencia': series_to_payload(motivos_no_asistencia.head(8), label_key='label', value_key='value'),
        'apoyos_mentor': series_to_payload(top_apoyos.head(8), label_key='label', value_key='value'),
    }

    # KPI resumen
    kpi_resumen = pd.DataFrame(
        [
            {'kpi': 'total_registros', 'valor': total_registros},
            {'kpi': 'total_checkins_unicos', 'valor': total_checkins_unicos},
            {'kpi': 'pct_duplicados', 'valor': round(pct_duplicados, 2)},
            {'kpi': 'respuestas_totales', 'valor': respuestas_totales},
            {'kpi': 'tasa_asistencia_reportada_pct', 'valor': round(tasa_asistencia_reportada, 2)},
            {
                'kpi': 'promedio_rating_recorrido',
                'valor': round(float(promedio_rating_recorrido), 2) if not np.isnan(promedio_rating_recorrido) else np.nan,
            },
            {
                'kpi': 'promedio_rating_general',
                'valor': round(float(promedio_rating_general), 2) if not np.isnan(promedio_rating_general) else np.nan,
            },
            {
                'kpi': 'brecha_asistencia_pp',
                'valor': round(float(brecha_asistencia_pp), 2) if not np.isnan(brecha_asistencia_pp) else np.nan,
            },
        ]
    )
    kpi_resumen.to_csv(OUTPUT_DIR / 'kpi_resumen.csv', index=False)

    build_report(
        checkin_metrics=checkin_metrics,
        checkpoint_metrics=checkpoint_metrics,
        insights=insights,
        attendance_gap_text=attendance_gap_text,
        recommendations_df=recommendations_df,
        out_file=OUTPUT_DIR / 'reporte_evento.md',
    )

    storytelling_script = [
        'Apertura: este evento no solo registró asistencia, activó pertenencia temprana en transferencia.',
        f'Tracción: {total_checkins_unicos} check-ins únicos y experiencia bien valorada (general {promedio_rating_general:.2f}/5; recorrido {promedio_rating_recorrido:.2f}/5).',
        'Hallazgo crítico: la fricción principal no está en el evento, está en la etapa previa (horario, ciudad y comunicación).',
        f'Riesgo de gestión: el solapamiento entre check-in y encuesta fue {overlap_encuesta:.1f}%, por lo que falta trazabilidad integral.',
        'Decisión estratégica: escalar mentoría + comunicación segmentada + tablero 30/60/90 con dueños claros.',
    ]

    build_report(
        checkin_metrics=checkin_metrics,
        checkpoint_metrics=checkpoint_metrics,
        insights=insights,
        attendance_gap_text=attendance_gap_text,
        recommendations_df=recommendations_df,
        out_file=OUTPUT_DIR / 'reporte_evento_board.md',
        storytelling_script=storytelling_script,
    )

    generate_dashboard(
        checkin_metrics=checkin_metrics,
        checkpoint_metrics=checkpoint_metrics,
        recommendations_df=recommendations_df,
        payloads=dashboard_payloads,
        storytelling_insights=storytelling_insights,
        out_html=OUTPUT_DIR / 'dashboard_live.html',
        out_json=OUTPUT_DIR / 'dashboard_data.json',
    )

    print('Pipeline ejecutado correctamente. Archivos generados en output/.')


if __name__ == '__main__':
    main()
