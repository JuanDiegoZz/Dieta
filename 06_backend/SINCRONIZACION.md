# Sincronización

## Lecturas

Usar una versión de catálogo.

Ejemplo:

```json
{
  "version": 14,
  "updatedAt": "...",
  "data": {}
}
```

El cliente guarda la versión.

Si no cambió, evita redescargar todo.

## Escrituras

Optimistic UI cuando sea seguro:

- favoritos,
- despensa,
- historial.

Si falla:

- revertir,
- mostrar mensaje discreto.

## Conflictos

Como existe un solo usuario principal, mantener lógica simple.

Última escritura puede ganar en V1.
