# Probar el espacio del conductor

Rama: `feat/driver-workspace`. La app sigue siendo única; conductor, cliente y negocio
conservan permisos separados.

## Entrada desde una invitación

1. El responsable crea una invitación desde **Mi negocio → Gestionar equipo**, con el
   correo de prueba que la persona puede confirmar. También admite CSV.
2. En esa cuenta, abre **Mi cuenta → Activar mi acceso como conductor**, acepta la
   invitación y completa sus antecedentes. Las compras siguen disponibles.
3. Administración revisa mediante `supabase/admin/review-driver-application.sql`.
   No aprobar datos ficticios para una operación real ni tratar esta acción como
   revisión documental vigente de conductor/vehículo/seguridad.
4. Tras aprobar, actualiza el acceso o espera el refresco en primer plano: se habilita
   el espacio de conductor. Aceptar la invitación por sí solo no cambia ese acceso.

## Jornada de reparto

1. **Ofertas** muestra el negocio, la disponibilidad y cualquier entrega activa.
   Si falta afiliación, verificación del negocio o marcas, explica el bloqueo.
2. Abre **Cobertura**, busca comunas y guarda. Seleccionarlas no activa disponibilidad
   ni modifica cobertura hasta guardar. Cambiar disponibilidad usa lo ya guardado.
3. Activa disponibilidad. Recibes ofertas compatibles con tu negocio/marcas y comunas,
   sin otra entrega activa. No hay mapa o ubicación en segundo plano en esta fase.
4. Las ofertas muestran producto, cantidad, comuna, canje, total y vencimiento. La
   dirección no aparece antes de la asignación. Rechazar no cancela el pedido.
5. Acepta una oferta vigente. El servidor decide la asignación atómica; un error de
   red obliga a actualizar para recuperar el pedido antes de asumir otro.
6. Abre **Tu entrega**, revisa dirección/indicaciones y pulsa **Salir a entregar**.
   Al finalizar, **Marcar como entregado** solicita una confirmación explícita.
7. Tras entregar, vuelve a Ofertas. La disponibilidad se reactiva manualmente.

El sondeo automático ocurre cada 5 segundos mientras la pantalla está activa. No
deshabilita **Actualizar jornada** ni activa el indicador de actualización manual.
Ese indicador solo aparece al pulsar el botón o deslizar para actualizar, espera las
cuatro consultas (configuración, negocio, ofertas y entrega) y evita peticiones
manuales duplicadas. Si falla una consulta, su error sigue visible y permite reintentar.
El reloj local de vencimientos se revisa cada segundo sin ejecutar consultas.

Si la verificación del negocio cambia durante una entrega, se bloquean nuevos
repartos pero se conserva la posibilidad de terminar la ya asignada mientras siga
vigente la habilitación del conductor. Una suspensión del conductor cierra su acceso
operativo; la aprobación histórica no se borra ni aparece como actualización pendiente.

## Cuenta y otros permisos

**Cuenta** presenta identidad, habilitación y negocio. La afiliación no concede
permisos para administrar: **Gestionar mi negocio** solo aparece si hay membresía
owner/manager. Un dueño que conduce conserva ambas capacidades.

**Comprar como cliente** abre las compras con la misma sesión. **Mi cuenta → Volver
a reparto** regresa al conductor. Navegar no cambia el rol, y el servidor impide
autoasignar el pedido propio. Los canales de compras se limitan a esa cuenta y al
foco de su layout; los sondeos de reparto se pausan fuera de sus pantallas/primer plano.

## Comprobaciones realizadas y pendientes

Migración `20261019011756_driver_workspace.sql` aplicada en Gasway cloud. La prueba
`supabase/tests/driver_workspace.sql` recorre invitación, revisión, cobertura, despacho,
aceptación, compra como conductor y entrega, con fixtures revertidos. Comprueba
cuenta sin aprobar, negocio deshabilitado, marcas ausentes, afiliación nula y suspensión.

Assertions locales: `test-driver-workspace.cjs`, `test-driver-offers.cjs`,
`test-driver-order-progress.cjs` y las de activación por invitación. Typecheck y lint
acotado aprobados. No se abrió ni renderizó la app ni se realizaron capturas. Queda
probar en dispositivo la presentación, navegación, teclado, letra grande y reconexión.
El selector CSV de la tarea anterior sigue requiriendo un build con sus módulos nativos.

La regresión local también comprueba que el sondeo no simula pulsaciones, que el
refresco manual espera todas las consultas y libera el botón tras un error, y que
los SVG decorativos conservan accesibilidad compatible con web/iOS/Android.

La compra aún usa el prototipo global de precios. Faltan vendedor elegido antes de
comprar, reservas de stock y antecedentes/documentos vigentes antes del piloto real.
