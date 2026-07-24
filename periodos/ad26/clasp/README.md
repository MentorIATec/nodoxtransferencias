# Sincronizacion con Apps Script AD26

Proyecto vinculado: `1T8RDxQlqDITOEJfAqBN032RXm4shKUTAdyZAwyL39TJ_c-CaWalkAD7M`.

Los archivos fuente permanecen en `automation/` y `templates/`. `build.mjs` crea
una copia temporal ignorada por Git con los cinco archivos que acepta Apps
Script. No editar `build/` manualmente.

Desde la raiz del repositorio:

```bash
npm run apps-script:status
npm run apps-script:push
```

`push` actualiza de forma no interactiva el codigo HEAD del proyecto con los cinco
archivos auditados. Para publicar el Web App se debe
crear una nueva version del deployment vigente; no crear otro proyecto ni cambiar
la URL sin una decision operativa explicita.
