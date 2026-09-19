# Cache local y offline

## Objetivo

Consultar comidas aunque exista una caída temporal de conexión.

## Cachear

- catálogo de opciones,
- ingredientes,
- aliases,
- tags,
- preferencias recientes.

## IndexedDB

Usar una capa pequeña compatible.

## Estrategia

```text
Abrir
↓
mostrar cache
↓
sincronizar en background durante sesión activa
↓
actualizar cache
```

No retrasar la UI esperando Supabase si ya existe cache.

## Escrituras offline

V1 puede limitarse a lectura offline.

Si se implementa cola offline:

- acciones deben tener idempotency key,
- sincronizar después,
- mostrar estado pendiente.
