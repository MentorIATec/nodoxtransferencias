# Arquitectura integrada AD26: preregistro y check-in

Este documento es el contrato operativo entre los dos instrumentos de la
Bienvenida de Transferencias AD26. Los sistemas comparten el mismo evento, pero
no comparten repositorio, Spreadsheet, Apps Script, API key ni dominio.

## Componentes

| Etapa | Preregistro | Check-in presencial |
| --- | --- | --- |
| Repositorio | `MentorIATec/nodoxtransferencias` | `MentorIATec/campus-checkin` |
| Rama | `ad26` | `ad26` |
| Dominio | `transferencias-ad26.vercel.app` | `campus-checkin-ad26` (pendiente de publicar) |
| Spreadsheet | `A | Pre-registro Transferencias Campus Monterrey | AD26` | `B | Campus Check-in AD26` |
| ID | `1jHE0OAX7EXTyo5Try8Jh5J_xwP0g_PEztxxiQBuGwZU` | `1HA6Vz3He1kcPENdnl4IIl1Y-Dc927qb7UQvegXeeqOk` |
| Regla principal | Maximo 400 respuestas `SI` unicas | Acceso onsite sin limite de 400 |

## Responsabilidades

El preregistro:

- resuelve mentor y comunidad;
- registra una respuesta `SI/NO` por matricula;
- aplica el cupo atomico de 400 respuestas `SI`;
- administra invitaciones, recordatorios y sus pruebas controladas.

El check-in:

- registra presencia fisica una sola vez por `matricula|event_id`;
- conserva si existio preregistro y cual fue su respuesta;
- admite Escuela de Salud sin mentor individual;
- permite al staff registrar transferencias tardias o fuera del padron;
- mantiene un dashboard manual, sin polling ni trigger cada minuto.

## Integracion por fotografia

No debe existir consulta en vivo del check-in hacia el Spreadsheet A. Antes del
evento se congela una fotografia y se publica en `Poblacion_AD26` del Spreadsheet
B. Esto evita que una falla, edicion o saturacion del preregistro afecte el acceso
presencial.

La fotografia debe contener una fila unica por matricula y estos campos:

```text
matricula, nombres, apellidos, email, campus_origen, escuela, carrera,
tipo_poblacion, mentor_id, mentor_nombre, comunidad, foto_mentor,
preregistrado, respuesta_preregistro, fecha_preregistro, activo, periodo,
fecha_importacion
```

Reglas del traspaso:

1. La base es `Asignaciones`, no `Respuestas`.
2. `Respuestas` se une por matricula y `event_id=bienvenida-transferencias-ad26`.
3. Sin respuesta: `preregistrado=FALSE` y `respuesta_preregistro=SIN RESPUESTA`.
4. Con respuesta: `preregistrado=TRUE` y respuesta normalizada `SI` o `NO`.
5. Las matriculas deben cumplir `A########` y ser unicas.
6. Mentoria requiere mentor valido; Salud conserva `tipo_poblacion=SALUD` y no
   fuerza mentor individual.
7. Toda fila operativa usa `activo=TRUE`, `periodo=AD26` y fecha de importacion.
8. Una segunda ejecucion reemplaza la fotografia completa antes del evento; no
   agrega filas sobre una fotografia anterior.

## Estado verificado al 24 de julio de 2026

- Preregistro: backend, cupo, deduplicacion, fixtures y correo de prueba listos.
- Poblacion consolidada de preregistro: 766 matriculas activas, 764 de Mentoria
  y 2 de Salud, provenientes de las cohortes Verano 26 y AD26.
- Catalogo de mentores: 48 registros vigentes tras incorporar a Rocio del Carmen
  Flores Martinez en Pasio.
- Check-in: frontend de dos pasos, idempotencia, incidencias staff y dashboard
  manual implementados en el repositorio separado.
- Assets: las imagenes de mentor se publican desde
  `/Users/karenguzman/campus-checkin/public/mentores/` y se validan con
  `npm run validate:mentor-assets`.
- Auditoria de assets: 47 referencias y 47 coincidencias exactas verificadas con
  `npm run validate:mentor-assets`.

## Pendientes bloqueantes de liberacion

> Seguimiento acordado: despues de liberar la invitacion definitiva de
> preregistro, retomar y no cerrar la implementacion hasta completar el catalogo
> onsite, la fotografia A -> B y sus pruebas de concurrencia.

1. Implementar y ensayar el pipeline ejecutable de fotografia A -> B. Actualmente
   existe el esquema y el contrato, pero no una funcion automatizada de traspaso.
2. Importar el catalogo privado de 47 mentores a `Mentores_AD26` del Spreadsheet B.
3. Ejecutar la prueba final de correo con una asignacion real redirigida a la
   cuenta autorizada; no reinsertar fixtures en la lista definitiva.
4. Configurar Apps Script y Vercel del check-in con secretos exclusivos AD26.
5. Publicar `campus-checkin-ad26` sin reutilizar el dominio FJ26.
6. Probar matricula valida, duplicado, Salud, incidencia, doble clic, Enter,
   refresh, timeout y 20 a 30 dispositivos concurrentes.
7. Preparar procedimiento manual y QR de contingencia.

## Criterio de cierre

La integracion queda lista cuando el total y una muestra de matriculas coinciden
entre la fotografia exportada y `Poblacion_AD26`, el catalogo de mentores no tiene
referencias de imagen faltantes, las pruebas concurrentes pasan y ambos flujos
pueden operar de forma independiente.
