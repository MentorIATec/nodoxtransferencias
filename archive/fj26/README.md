# Archivo FJ26

El codigo que cerro el periodo Febrero-Junio 2026 esta identificado con el tag
`fj26-final`. Este directorio es el manifiesto de archivo; no se duplican aqui
archivos que ya estan preservados por Git.

## Mantener temporalmente

- Frontend y APIs vigentes de la rama `fj26` mientras el despliegue historico exista.
- Scripts y templates necesarios para consultar registros FJ26.

## Candidatos a archivar como no usados

- Templates variantes A y genericos cuando se confirme que la variante B fue la final.
- Assets de clima, sede y campanas FJ26.
- Documentacion con referencias a FJ26, Gist y datos de 2025.
- Mapas e imagenes de sedes anteriores.

## Eliminacion manual recomendada

- `public/fallback-estudiantes.json`: contiene datos personales y no debe seguir
  publicado. Retirar despues de deshabilitar `FALLBACK_JSON_URL` en Vercel.
- `transferencias_clean_full (3).csv`: retirar del repositorio y conservar solo en
  almacenamiento institucional privado si aun se necesita.
- `api/campus-checkin.code-workspace`: archivo local del editor; queda ignorado por Git.

## Seguridad

Antes de abrir AD26 se deben rotar todas las llaves FJ26 y mover la nueva llave de
Apps Script a Script Properties y variables de entorno de Vercel.
