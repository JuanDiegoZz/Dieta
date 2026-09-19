# Design System

## Dirección visual

La app debe sentirse:

- moderna,
- limpia,
- cálida,
- rápida,
- amigable,
- premium sin ser pesada.

Evitar apariencia de panel administrativo.

## Cards

- bordes suaves,
- sombras muy ligeras,
- mucho espacio,
- jerarquía visual clara.

## Tipografía

Usar system fonts para rendimiento:

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

No depender de una webfont para el render inicial.

## Touch

Objetivos táctiles mínimo:

44x44 px.

## Iconos

Usar SVG.

Preferencia:

- Lucide, importación individual/tree-shaking,
- o set propio pequeño.

No usar emojis como iconografía principal de navegación.

## Estados

Cada interacción debe tener:

- hover cuando aplica,
- active,
- focus,
- disabled,
- loading,
- success/error cuando sea necesario.
