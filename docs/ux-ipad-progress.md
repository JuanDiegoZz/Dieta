# Registro de implementación UX/UI

## Preparación

- Base limpia: `chore/supabase-diagnostics`.
- Rama local creada: `feat/ux-ipad-iterations`.
- Línea base: 91 pruebas en 20 archivos; lint, typecheck, build y diff --check aprobados.
- Estrategia: ejecución inline de siete iteraciones; sin dependencias adicionales, migraciones, push ni despliegue.
- Navegador: datos sintéticos e interceptación de todos los endpoints. Emulación de tamaños; no Safari físico.

## Iteración 1 — Guardado de cocina

- UUID estable por preparación; reintentos usan la clave primaria existente y no sobrescriben conflictos. Estados inicial/guardando/confirmado/rechazado/desconocido.
- Historial se actualiza solo con respuesta validada; bootstrap entrega su modelo de dominio coherente.
- Rojo inicial: tres pruebas nuevas fallaron. Verde: 94 pruebas; lint, typecheck, build legacy y diff --check aprobados.
- Navegador: cuatro tamaños; 503, doble toque, respuesta perdida después de guardar, reintento con el mismo ID e historial único aprobados. Errores HTTP simulados esperados; sin excepciones JS.
- Sin migración. El almacenamiento de sesión es opcional; si está bloqueado, conserva el evento durante el montaje de cocina.
