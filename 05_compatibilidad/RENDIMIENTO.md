# Presupuesto de rendimiento

## Objetivo

La app debe sentirse inmediata incluso en un iPad antiguo.

## Reglas

### Initial render

Mostrar shell útil lo antes posible.

### JavaScript

Mantener bundle inicial pequeño.

Objetivo inicial orientativo:

- app shell JS comprimido: < 150 KB si es viable.
- dividir administración y pantallas secundarias.

### Datos

No descargar datos redundantes en cada navegación.

Cache local del catálogo.

### Listas

Si hay muchas cards:

- paginar,
- virtualizar solo si realmente hace falta,
- evitar cientos de nodos innecesarios.

### Imágenes

No son requisito para V1.

Si luego se añaden:

- WebP/JPEG optimizado,
- thumbnail,
- lazy loading.

### Backend

Endpoints simples.

Respuesta rápida y compacta.

### Percepción

Usar:

- optimistic UI,
- skeletons discretos,
- cache,
- prefetch controlado.

No usar spinners largos si puede evitarse.
