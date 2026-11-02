# Dieta — revisión de las siete iteraciones UX/UI

## Resultado

Rama local: `feat/ux-ipad-iterations`, desde `chore/supabase-diagnostics`, sin cambios previos pendientes. Se implementaron las siete iteraciones y se crearon commits locales por iteración. No se publicaron cambios ni se modificaron datos, permisos, credenciales o esquemas de Supabase. No se añadieron dependencias.

Lista para revisión manual. La validación física en Safari/iPad sigue pendiente; las pruebas de navegador automatizado no la sustituyen.

## Iteraciones

| Iteración | Estado | Archivos principales | Validación al cerrar | Riesgo pendiente |
| --- | --- | --- | --- | --- |
| 1. Guardado de cocina | Completada | `api/history.ts`, `api/_lib/supabase.ts`, `api/_lib/bootstrap.ts`, `src/data/api.ts`, `src/domain/preparation.ts`, `App`, `KitchenModeScreen` | 94 pruebas y protocolo completo; cuatro tamaños con doble toque, 503 y respuesta perdida | La deduplicación depende de conservar el UUID del evento; almacenamiento de sesión bloqueado y cierre completo limitan su persistencia |
| 2. Continuidad | Completada | `App`, `domain/navigation.ts`, `platform/useScreenState.ts`, pantallas de origen | 101 pruebas; cinco orígenes, Atrás/Adelante, recarga, enlace directo y página/filtros | Restauración de scroll y foco en Safari físico |
| 3. Navegación iPad | Completada | `AppShell`, `Modal`, estilos | 101 pruebas; Más, ambos destinos y foco en cuatro tamaños | Áreas seguras y barras de Safari físico |
| 4. Formularios y diálogos | Completada | `Modal`, `WeeklyScreen`, `AdminScreen`, `App` | 101 pruebas; foco, Escape, cancelar/descartar, guardar y Atrás | iPadOS puede cerrar Safari sin emitir beforeunload |
| 5. Accesibilidad | Completada en el alcance auditado | Estilos, `MealTabs`, `MealDetailScreen`, `PantryScreen`, `ExploreScreen`, `Pagination` | 105 pruebas; contraste calculado, 44 px, selección y movimiento reducido | VoiceOver y contraste completo sobre hardware real |
| 6. Descubrimiento | Completada | `TodayScreen`, `ExploreScreen`, `WeeklyScreen`, `domain/search.ts`, `domain/pantry.ts` | 111 pruebas; continuidad 6/14, acentos y límites de franja | Verificar facilidad de uso diaria con el catálogo real |
| 7. Pulido y recuperación | Completada | `App`, `data/api.ts`, `WeeklyScreen`, `KitchenModeScreen`, `TodayScreen`, `AppShell`, `AdminScreen`, estilos | 115 pruebas; favoritos, despensa, semana, recuperación y borradores | Fallos 401 intermitentes previos siguen sin causa confirmada |

En cada iteración se ejecutaron test, lint, typecheck, build legacy, diff --check y la suite acumulada de navegador en 375×812, 768×1024, 1024×768 y 1366×900. El [registro cronológico](ux-ipad-progress.md) contiene decisiones y fallos corregidos durante desarrollo.

## Cobertura de los 14 hallazgos

| Hallazgo | Estado final |
| --- | --- |
| 1. Historial/Administración fuera de navegación iPad | Corregido: acceso Más sin retirar los cinco destinos principales |
| 2. Volver pierde origen y búsqueda | Corregido: origen, ID, UI, scroll y foco |
| 3. Preparado antes de confirmar | Corregido: estado confirmado, error o resultado desconocido; reintento idempotente |
| 4. Hoy anuncia resultados inaccesibles | Corregido: visibles/total y continuación en Explorar |
| 5. Contraste insuficiente | Corregido en combinaciones auditadas; no constituye certificación integral WCAG |
| 6. Foco escapa de modales | Corregido: contención, fondo inaccesible y restauración |
| 7. Protección de borradores incompleta | Corregido en flujos cubiertos; cierre forzado del sistema no está garantizado |
| 8. Controles táctiles pequeños | Corregido en objetivos frecuentes auditados; revisión física pendiente |
| 9. Semana con desplazamiento bidimensional | Mejorado parcialmente: señales y día visible; conserva calendario y desplazamiento |
| 10. Búsquedas inconsistentes | Corregido: normalización compartida, alcances explícitos y restricciones conservadas |
| 11. Estados/nombres accesibles incompletos | Corregido en controles intervenidos, incluidos nombres contextualizados de acciones repetidas |
| 12. Carga, error y sesiones prolongadas | Corregido en flujo: semana explícita, recuperación deduplicada, protección de escrituras y reloj actualizado |
| 13. Cocina aplana componentes | Corregido: agrupaciones, cantidades y notas originales |
| 14. Botones sin acción y lenguaje técnico | Corregido: ajustes abre Administración, sin controles falsos de perfil/cocina y textos aclarados |

## Regresión final

- `pnpm test`: **115 pruebas aprobadas en 25 archivos**, frente a 91 iniciales; 24 pruebas nuevas.
- `pnpm lint`, `pnpm typecheck`, `pnpm build` y `git diff --check`: aprobados.
- Build moderno y legacy generado; se conserva la configuración de compatibilidad existente.
- Suite acumulativa de [navegador](../tests/browser/ux.cjs): aprobada en los cuatro tamaños. Todas las API, incluido catálogo alternativo, se interceptan con datos sintéticos.
- La suite comprueba preparación confirmada e historial único, 503, interrupción de red, respuesta perdida, UUID estable, cinco orígenes, filtros/página, recarga y enlaces directos, navegación secundaria, modales, borradores, contraste mediante pruebas de cálculo, objetivos táctiles, movimiento reducido, continuación de búsqueda, favoritos, despensa, bloqueo semanal y recuperación sin solicitudes duplicadas.
- Cero excepciones JavaScript inesperadas en la suite final. Las respuestas 503 y abortos simulados generan errores de recursos esperados en consola; no se presentan como una consola vacía.
- Las pruebas unitarias de API sustituyen fetch; no contactan Supabase. La suite de navegador no envía escrituras a producción.

La segunda revisión detectó y corrigió desbordamiento del editor abierto a 1024 px, duplicación del botón nativo de limpieza, nombres ambiguos de acciones repetidas y un estado de borrador que podía permanecer activo después de aceptar Atrás. Se repitió la regresión completa tras esas correcciones.

## Evidencias

Las capturas contienen **datos sintéticos**: 14 platillos con piña para probar paginación. No son conteos de producción ni contienen registros privados.

- [Búsqueda móvil 375×812](evidence/ux-ipad/search-375.png).
- [Búsqueda iPad vertical 768×1024](evidence/ux-ipad/search-768.png).
- [Búsqueda iPad horizontal 1024×768](evidence/ux-ipad/search-1024.png).
- [Búsqueda escritorio 1366×900](evidence/ux-ipad/search-1366.png).
- [Editor abierto a 1024 px](evidence/ux-ipad/admin-1024.png).
- [Cocina agrupada](evidence/ux-ipad/kitchen-768.png).
- [Diálogo semanal](evidence/ux-ipad/dialog-768.png).

## Revisión segura desde iPad

Para inspección visual de lectura, servir el build estático local sin montar el BFF:

```powershell
pnpm build
pnpm exec vite preview --host 0.0.0.0 --port 4173
```

En la misma red local abrir `http://IP-DEL-PC:4173/?diagnostics=1#/explore`. Este preview no monta `/api`; utilizará fallback y mostrará aviso de actualización. Es esperable en esta modalidad. No permite comprobar guardado exitoso ni carga de un plan semanal del servidor. Esos flujos se verificaron con mocks automatizados; no hay que probarlos contra datos reales por accidente.

Comprobar:

1. Vertical/horizontal: texto, contraste, controles y desplazamiento.
2. Buscar `piña`, `pina`, `PIÑA` y `piñ`; abrir detalle y regresar conservando contexto.
3. Abrir Más y visitar Historial/Administración.
4. Abrir cocina para revisar componentes y notas, sin marcar una preparación real.
5. Editar un campo administrativo sin guardar; salir y elegir permanecer o descartar.
6. Con teclado externo, recorrer controles y confirmar foco visible. VoiceOver: nombres, selección y orden de lectura.

El catálogo real puede tener ocho opciones de piña, mientras que las capturas sintéticas tienen 14. Los filtros y la fuente del catálogo deben anotarse al comparar.

## Límites y publicación

- No se ejecutó Safari físico, VoiceOver ni prueba de suspensión real de iPadOS. No se afirma aprobación física.
- Idempotencia sin migraciones: se conserva UUID/fecha/valoración y se usa la clave primaria existente. Si se pierde el UUID tras un resultado ambiguo, no puede garantizarse deduplicación entre aperturas independientes.
- No se persisten borradores administrativos para sobrevivir cierres forzados del sistema.
- La disposición semanal sigue siendo bidimensional; se mejoró orientación, sin reconstruir el calendario.
- Se conserva la lógica existente de “Puedo hacerlo” (umbral de compatibilidad), que no equivale a garantizar disponibilidad de todos los ingredientes. No se cambió esa regla de negocio.
- No se intentó corregir especulativamente el origen de los 401 previos ni ampliar permisos.

Después de la revisión del usuario: autorizar integración/publicación, revisar el diff de esta rama y desplegar mediante el proceso habitual. Conservar el despliegue anterior como retorno. Esta sesión no realizó push ni despliegue y no modificó Vercel.
