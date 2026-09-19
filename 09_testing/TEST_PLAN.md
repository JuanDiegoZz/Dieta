# Plan de pruebas

## Crítico

### Navegación
- cambiar entre todas las franjas,
- hora no bloquea tabs.

### Búsqueda
- nombre,
- ingrediente,
- alias,
- varios tokens.

### Despensa
- marcar ingrediente,
- desmarcar,
- ranking actualizado.

### Historial
- preparar opción,
- aparece en historial,
- recomendaciones cambian.

### CRUD
- crear,
- editar,
- desactivar,
- reactivar.

### Legacy
- Safari iOS 12 equivalente,
- bundle legacy,
- IndexedDB,
- fetch,
- modales,
- forms.

### Administrar v2
- listar activos y ocultos sin mezclar `active` con `hidden`,
- restaurar ocultamiento sin reactivar administrativamente,
- editar nombre, slot, cantidad, unidad, texto original y relaciones,
- crear, duplicar y reordenar componentes,
- crear/buscar Ingredients y aliases,
- renombrar conservando ID,
- fusionar con confirmación y rollback,
- rechazar eliminación permanente con referencias,
- exportar backup y validar importación sin escrituras,
- mantener cache coherente después de mutaciones confirmadas.

## Rendimiento

Medir:

- JS inicial,
- render,
- interacción,
- tamaño de payload.

## Responsive

Revisar:

- 320 px,
- 375–430 px,
- iPad portrait,
- iPad landscape,
- desktop 1366,
- ultrawide.
