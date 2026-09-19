# Reglas para Codex

## Regla principal

No implementar funciones sin revisar primero los archivos `.md` del proyecto.

## UX

- Evitar interfaces genéricas de dashboard empresarial.
- La aplicación debe sentirse como una app de consumo.
- Priorizar cards, iconos, espacios amplios y navegación sencilla.
- Todo debe poder entenderse sin tutorial.
- El usuario debe llegar a una comida en máximo 2–3 interacciones.

## Rendimiento

- No instalar dependencias grandes sin necesidad.
- Evitar librerías completas para resolver funciones pequeñas.
- Evitar animaciones con layout costoso.
- Preferir `transform` y `opacity`.
- Lazy-load de pantallas secundarias.
- Evitar imágenes pesadas.
- Evitar bloquear el render inicial.
- No cargar el SDK completo de Supabase en el iPad si puede evitarse.

## Compatibilidad

El iPad con iOS 12.5.8 es un requisito real.

No usar una API web sin revisar compatibilidad o incluir fallback/polyfill.

## Código

- TypeScript.
- Componentes pequeños.
- Separar lógica de negocio de UI.
- Evitar overengineering.
- Mantener documentación actualizada.
