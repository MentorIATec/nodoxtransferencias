# Esquema del Google Sheet AD26

Spreadsheet configurado:
`1jHE0OAX7EXTyo5Try8Jh5J_xwP0g_PEztxxiQBuGwZU`

Las dos sabanas recibidas de Coordinacion deben pegarse sin cambios en
`Importacion_Raw_Verano26` e `Importacion_Raw_AD26`. Un pipeline de normalizacion
construye `Asignaciones`; el frontend y Apps Script
nunca deben depender directamente del orden de columnas de la sabana original.

## 1. Importacion_Raw_Verano26 e Importacion_Raw_AD26

- Copia exacta de cada fuente recibida.
- No editar nombres de columnas ni transformar valores manualmente.
- Agregar al final `fecha_importacion` y `fuente` si no existen.
- Cada nueva carga reemplaza su pestaña despues de conservar un respaldo privado.
- Si una matricula aparece en ambas fuentes, prevalece `Importacion_Raw_AD26`.
- Las filas canceladas se excluyen y se documentan en `Errores`.

## 2. Asignaciones

Columnas canonicas, en este orden:

| Columna | Requerida | Regla |
| --- | --- | --- |
| `matricula` | Si | Una letra y ocho digitos; mayusculas; unica por periodo. |
| `nombres` | Si | Nombre o nombres para saludo. |
| `apellidos` | Si | Apellidos separados del saludo. |
| `email` | Si | Correo institucional valido. |
| `campus_origen` | Si | Texto normalizado. |
| `escuela` | Si | Incluye `Salud` cuando corresponda. |
| `comunidad` | Si | Para Salud usar `Salud`. |
| `tipo_poblacion` | Si | `MENTORIA` o `SALUD`. |
| `mentor_id` | Condicional | Vacio para Salud. |
| `mentor_nombre` | Condicional | Vacio para Salud. |
| `activo` | Si | `TRUE` para permitir lookup. |
| `periodo` | Si | Valor fijo `AD26`. |
| `fecha_importacion` | Si | Fecha y hora del pipeline. |
| `nombre_completo` | Si | Valor original para auditoria; no se usa en el saludo. |
| `carrera` | No | Clave de carrera de la fuente. |
| `nombre_carrera` | No | Nombre descriptivo de carrera. |
| `tipo_transferencia` | No | Temporal, definitiva u otro valor de origen. |
| `cohorte_origen` | Si | `VERANO26` o `AD26`. |
| `fecha_corte` | No | Corte reportado por Coordinacion. |

Reglas de Salud:

- `tipo_poblacion = SALUD`
- `escuela = Salud`
- `comunidad = Salud`
- `mentor_id` y `mentor_nombre` vacios
- La UI oculta tarjeta, WhatsApp y referencias al mentor.

## 3. Datos mentor

| Columna | Regla |
| --- | --- |
| `mentor_id` | Identificador estable y unico. |
| `nombre` | Nombre institucional completo. |
| `nombre_mostrar` | Nombre autorizado para la UI. |
| `nickname` | Nombre para WhatsApp. |
| `email` | Se utiliza como `reply-to`. |
| `celular` | Numero institucional con codigo de pais. |
| `comunidad` | Comunidad vigente. |
| `activo` | `TRUE` o `FALSE`. |

Si el mentor no tiene email valido, se utiliza
`mentoreo.mty@servicios.tec.mx` como `reply-to`.

## 4. Respuestas

| Columna | Regla |
| --- | --- |
| `response_id` | UUID generado por servidor. |
| `event_id` | `bienvenida-transferencias-ad26`. |
| `timestamp` | Fecha del servidor. |
| `matricula` | Llave unica junto con `event_id`. |
| `asistira` | `SI` o `NO`. |
| `tipo_poblacion` | `MENTORIA` o `SALUD`. |
| `comunidad` | Comunidad resuelta por servidor. |
| `mentor_id` | Vacio para Salud. |
| `email` | Correo validado desde Asignaciones. |
| `email_status` | `PENDIENTE`, `ENVIADO` o `ERROR`. |
| `source` | `WEBAPP`. |

No se deben aceptar nombre, mentor, comunidad ni email como datos confiables enviados
por el navegador. Apps Script debe resolverlos nuevamente por matricula.

## 5. Configuracion

Formato llave/valor:

| Llave | Valor inicial |
| --- | --- |
| `PERIODO` | `AD26` |
| `EVENT_ID` | `bienvenida-transferencias-ad26` |
| `REGISTRO_ABIERTO` | `FALSE` durante preparacion |
| `CUPO_MAXIMO` | `400` |
| `FECHA_EVENTO` | `2026-08-07` |
| `HORA_INICIO` | `15:00` |
| `HORA_FIN` | `17:30` |
| `ZONA_HORARIA` | `America/Monterrey` |

## 6. Log_Envios

Campos minimos: `timestamp`, `campaign_id`, `matricula_hash`, `template`, `status`,
`error_code` y `attempt`. No guardar cuerpos completos ni telefonos.

## 7. Resumen

Debe calcular:

- Total de poblacion activa.
- Invitaciones enviadas y errores.
- Respuestas SI y NO.
- Lugares disponibles de 400.
- Respuestas por comunidad y tipo de poblacion.
- Duplicados rechazados.

## Pipeline de normalizacion

1. Leer encabezados de ambas pestañas raw, no posiciones fijas.
2. Mapear alias conocidos a las columnas canonicas.
3. Normalizar matricula, email, espacios, acentos de comparacion y booleanos.
4. Detectar duplicados por matricula y email.
5. Resolver mentor mediante `mentor_id` o nombre normalizado.
6. Identificar Salud y aplicar su regla sin mentor.
7. Rechazar filas incompletas a `Errores`; no publicarlas parcialmente.
8. Reemplazar `Asignaciones` solo si el pre-check no tiene errores bloqueantes.
9. Consolidar duplicados entre fuentes con precedencia AD26.
10. Generar resumen de altas, bajas, cambios y errores.
