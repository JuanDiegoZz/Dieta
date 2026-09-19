# Compatibilidad iPad iOS 12.5.8

## Requisito

Este dispositivo es un target real.

No considerarlo un caso secundario.

## Build

Usar:

- Vite,
- `@vitejs/plugin-legacy`,
- Babel/polyfills generados para target legacy.

## Target

Verificar explícitamente Safari/iOS 12 durante desarrollo.

## Evitar depender directamente de

APIs nuevas sin fallback.

Revisar especialmente:

- optional APIs de navegación,
- observers,
- storage avanzado,
- CSS moderno,
- date/time APIs modernas.

## CSS

Evitar que funcionalidades críticas dependan de:

- backdrop-filter,
- container queries,
- :has(),
- CSS moderno sin fallback.

La UI debe seguir siendo usable si efectos visuales se degradan.

## JS

Evitar bundle enorme.

No mandar librerías completas al navegador por comodidad.

## Pruebas

Probar:

- carga inicial,
- búsqueda,
- tabs,
- modal,
- edición,
- IndexedDB,
- fetch,
- navegación,
- modo cocina.

## Progressive enhancement

Versión moderna:
- animaciones completas,
- detalles visuales.

Versión legacy:
- mismas funciones,
- menos efectos.
