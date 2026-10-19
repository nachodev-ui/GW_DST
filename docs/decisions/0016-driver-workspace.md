# ADR 0016 — Espacio de reparto y capacidades independientes

Fecha: 2026-10-18. Estado: implementado; migración 20261019011756 aplicada.

## Problema

Las invitaciones ya nacían del negocio, pero la zona de conductor conservaba la
presentación anterior y no explicaba afiliación/bloqueos. Cobertura se guardaba
implícitamente al cambiar disponibilidad. Además, un aprobado no podía comprar
por los guards de cliente, y una suspensión se describía como acceso actualizándose.

## Decisión

Mantener una sola app y separar Ofertas, Cobertura y Cuenta en `(driver)` con guard
de perfil/driver verificado. Reutilizar tema/componentes actuales y conservar la
privacidad del resumen antes de aceptar. La entrega asignada usa confirmación
explícita en la pantalla, común a web/nativo, y el servidor sigue validando cada paso.

Una RPC de lectura propia devuelve negocio/marcas, habilitación y bloqueo operativo.
No recibe identificadores de terceros y no concede roles. Su implementación privada
DEFINER valida auth.uid, search_path vacío y EXECUTE mínimo, con wrapper INVOKER.
Los requisitos operativos replican las condiciones confiables de nuevo despacho:
conductor habilitado, negocio verificado y marcas configuradas. La interfaz añade
cobertura/disponibilidad y ausencia de otra entrega para ofrecer aceptación.

Disponibilidad usa siempre cobertura guardada. Seleccionar comunas mantiene un
borrador que solo el guardado envía; una actualización remota no lo descarta. Los
sondeos se limitan a foco/primer plano y cachés por usuario. Ofertas vencidas se
ocultan localmente y no se acepta mientras se desconoce la asignación activa; el
servidor conserva expiración, atomicidad y una entrega activa por conductor.

Las rutas de compra requieren sesión y las de reparto requieren además habilitación.
Un conductor puede navegar a compras sin cambiar su perfil. Customer y driver no
importan lógica del otro: se conectan mediante navegación desde auth/cuenta. Realtime
de compra usa sesión/foco del layout en lugar de rechazar al perfil driver. El acceso
a gestión business sigue basado en membresías, separado de la afiliación del conductor.

## Límites y validación

No se automatizan reactivación, suspensión administrativa completa, documentos, mapas,
tracking ni stock/precio comercial. Un negocio que pierde verificación bloquea nuevos
pedidos, sin interrumpir una entrega ya asignada a un conductor aún habilitado.
Una suspensión individual sí retira su acceso operativo mediante el guard existente.

Suite SQL del recorrido completo con fixtures revertidos, assertions locales de
ofertas/estado/confirmación/rutas, typecheck y lint acotado. Sin ejecución ni revisión
visual de la app por la instrucción del repositorio. No se otorgó habilitación a
cuentas reales ni se añadieron datos ficticios persistentes durante esta tarea.
