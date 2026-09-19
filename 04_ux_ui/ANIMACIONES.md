# Animaciones

## Filosofía

Las animaciones deben hacer que la app se sienta fluida, no demostrar que hay animaciones.

## Permitido

- fade,
- slide corto,
- scale pequeño,
- skeleton,
- expansión de card.

## Propiedades preferidas

- transform
- opacity

## Duración

Microinteracciones:

120–220 ms.

Cambios de pantalla:

180–300 ms.

## Evitar

- animaciones constantes,
- blur animado,
- box-shadow animado pesado,
- filtros complejos,
- parallax,
- canvas decorativo,
- WebGL.

## Reduced motion

Respetar:

```css
@media (prefers-reduced-motion: reduce)
```

Y permitir desactivar efectos avanzados automáticamente en modo legacy.
