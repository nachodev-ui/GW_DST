# ADR 0007 — Ofertas privadas por comuna y aceptación del repartidor

Fecha: 2026-10-18. Estado: aceptada; migración preparada, sin aplicar por el agente.

La app única conserva rutas separadas `(customer)` y `(driver)` y guards en layouts.
Toda la implementación del repartidor vive en `features/driver`; consume infraestructura,
contratos neutrales y theme, sin importar features de cliente. No se agregan dependencias.

Se reutilizan `drivers.is_available`, `is_verified` y `private.order_offers`.
`driver_communes` agrega cobertura CUT con FK, RLS de lectura propia y sin escritura
directa móvil. `set_driver_settings` verifica rol/aprobación, valida catálogo y bloquea
la fila del repartidor, igual que la aceptación; impide disponibilidad con entrega activa.
Aprobación y rol siguen siendo administrativos. El script en `supabase/admin` exige
una solicitud previa y cambia ambas filas en una transacción, solo en SQL Editor.

La nueva migración reemplaza la implementación de `private.create_order` para invocar
`private.dispatch_order` después del evento requested. Dentro de la misma transacción
ofrece a repartidores aprobados, disponibles y con cobertura de la comuna, excluyendo
al cliente y repartidores con entrega activa; registra offered solo si hay ofertas.
Devuelve el estado actualizado al cliente. Las migraciones anteriores quedan intactas.
La PK evita duplicados y `ON CONFLICT DO NOTHING` no renueva ofertas vencidas/rechazadas.
La vigencia es de 60 segundos de reloj del servidor; no se requiere cron.

`list_driver_offers()` usa auth.uid y devuelve solo ofertas propias, vigentes, sin
asignación y con cobertura vigente: producto, cantidad, canje, comuna, total, ID y
vencimiento. No devuelve dirección, notas, cliente ni coordenadas. La política de
orders sigue exclusivamente para participantes; la tabla privada no recibe SELECT móvil.
Las funciones privilegiadas viven en private, con search_path vacío y nombres
calificados; wrappers públicos invoker y grants explícitos solo a authenticated.
El despachador no se puede invocar desde la app. Diseño acorde a la documentación de
[funciones de Supabase](https://supabase.com/docs/guides/database/functions).

`accept_driver_offer` reutiliza `private.accept_order` sin reemplazar su asignación
condicional, bloqueo por repartidor ni índice de entrega activa. Primero comprueba
propiedad de oferta; GW001 distingue pedido tomado por otro y GW002 vencimiento/rechazo.
Solo tras ganar devuelve dirección/notas mediante `get_driver_order`, que también
permite recuperar la entrega activa al reiniciar o perder una respuesta de red.
El rechazo vence la oferta propia bajo el bloqueo del repartidor, sin cancelar el pedido.
Desactivar disponibilidad o quitar una comuna vence las ofertas afectadas; no las borra.

TanStack Query valida respuestas con zod, indexa caché por usuario y consulta ofertas
y pedido activo cada 5 s solo con pantalla enfocada y AppState activo. El formulario
guarda comunas explícitamente; cambiar el interruptor guarda también la selección.
Las mutaciones no se reintentan automáticamente y refrescan también tras fallos para
resolver respuestas ambiguas. La pantalla asignada vuelve a consultar bajo autorización.

Límites deliberados: no hay barrido de pedidos históricos ni despacho automático al
activarse un repartidor, renovación/reintentos de ofertas ni cola de recuperación.
Sin candidatos el pedido queda requested; ofertas vencidas/rechazadas dejan offered.
Un operador confiable puede invocar el despachador para candidatos nuevos, sin renovar
filas existentes. La recuperación automática exige otra tarea; no hay matching geográfico.
Entrega/cancelación no reactivan disponibilidad: el repartidor puede hacerlo manualmente
cuando ya no tiene pedido activo. No se agregan tracking, mapas, push ni pagos en línea.

La suite nueva es un DO autocontenido con rollback interno: simula JWT/rol, prueba
aislamiento, minimización, vencimiento, propiedad, rechazo, segundo ganador, aprobación,
disponibilidad y cobertura. Se adapta la suite cliente para admitir requested/offered
tras crear. No se ejecuta SQL ni advisors en esta tarea. La carrera real con dos
conexiones, validación física y tipos generados quedan pendientes.
