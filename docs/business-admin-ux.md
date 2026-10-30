# Panel del negocio

La presentación usa Figtree y los tokens de `apps/mobile/src/theme/index.ts`.
El rediseño de octubre organiza el espacio con cabeceras oliva con degradado,
texto blanco y detalles en primario claro. El fondo cálido, superficies blancas y acciones oliva
conectan este espacio con Gasway. `workspace-ui.tsx` compone esta identidad dentro
de la feature; sus colores, radios y medidas se definen en el tema central.
Los estados tienen texto, ícono y color. No se agregan librerías de UI.

- `/business/manage` conserva su ruta y muestra el resumen del negocio con cuatro
  entradas navegables agrupadas: Datos del negocio, Equipo, Cobertura y Catálogo. Destaca
  conductores vinculados y productos en catálogo en dos bloques navegables que
  se ajustan en varias filas cuando falta ancho. Los conteos pendientes o con error
  muestran «—»; los errores tienen explicación. Cero invitaciones pendientes usa
  estado neutro. La selección de
  negocio se conserva al volver desde sus pantallas mediante `businessId`.
- `/business/coverage` permite **elegir y editar comunas**, incluso sin conductores.
  La edición abre una hoja con búsqueda del catálogo CUT, selección múltiple,
  conteo, guardar/cancelar y control de revisión concurrente.
  Las comunas seleccionadas aparecen en etiquetas compactas desplazables, incluso
  al filtrar la búsqueda: texto oscuro sobre lima pastel y X crema sobre oliva.
  El círculo de la X mide 20 y el icono 14, dejando margen dentro de la etiqueta.
  Cada etiqueta permite quitar la comuna, con objetivo táctil mínimo de 48 y nombre
  accesible por comuna; los cambios solo se aplican al guardar. El conteo anuncia cambios.
  Vaciar la selección explica que no se recibirán pedidos nuevos. Las vistas Comunas y Conductores
  muestran cobertura y disponibilidad por separado; todos los conductores afiliados
  heredan las mismas comunas. Tocar una comuna muestra su equipo; tocar un conductor
  muestra su cobertura heredada. Carga, error, búsqueda vacía y ausencia de equipo
  tienen estados propios. La ausencia de equipo no bloquea la configuración.
  Los accesos desde Equipo y Catálogo y la ayuda breve se conservan.
- `/business/details` muestra los datos que ya entrega la membresía. El contrato
  no expone el nombre del responsable: se indica que no está disponible. El rol
  de quien gestiona se presenta por separado, sin inferir identidades.
- `/business/catalog` muestra marca, kg/variante, precio CLP entero, stock y
  pertenencia al catálogo. Cada ficha separa identidad con ilustración, precio y
  stock; la ficha completa abre `BottomSheet`, con cabecera breve, identidad
  desplazable, switch de inclusión y tres campos numéricos directos. Los dos
  precios CLP comparten tamaño y prefijo discreto, sin vista previa. Stock admite
  solo enteros no negativos y muestra errores junto al campo. «En catálogo» usa
  check oliva sin relleno; las ayudas del Catálogo dicen «cilindro». Guardar cambios
  y Cancelar ocupan el pie fijo, sin Cerrar duplicado. Fuera del catálogo, precio
  y stock se conservan y se bloquean. Cuando el
  negocio no está habilitado muestra la restricción y la ficha no es interactiva.
  Conserva el formulario, su schema y la revisión para guardar. Precio vacío
  sigue siendo pendiente; incluir en catálogo sigue requiriendo precio.
- `/business/team` conserva su ruta y usa `FlatList` con carga incremental del
  mismo RPC por bloques de 20, sin «Página N». Ofrece reintento de carga y un
  botón accesible para cargar más, además de la carga al desplazarse.
  La cabecera presenta la incorporación y la acción de invitar; los registros
  incorporan avatares de iniciales y distinguen identidad de estados. Equipo y
  catálogo reutilizan esqueletos de carga. Las cabeceras de navegación son compactas
  del espacio para dar prioridad al contenido.
- Conductores muestra vínculos actuales aceptados o anteriores (`legacy`), sin
  duplicar al conductor. Invitaciones muestra el historial por estado:
  pendientes, aceptadas, vencidas y canceladas. La habilitación se muestra aparte.
- Los contadores corresponden a registros cargados y a la búsqueda aplicada.
  Un `+` indica que quedan páginas por cargar; no se presenta un total inventado.
  El RPC actual no entrega totales por estado. El resumen comparte las páginas
  cargadas de la búsqueda sin filtro.
- Invitar conductor abre un modal con opciones Individual y Carga CSV. Conserva
  selección/pegado de CSV, límites, errores por fila, vista previa y confirmación.
  El resultado permanece dentro del modal hasta cerrarlo: creadas en la app,
  existentes y fallidas. Un error sin confirmación del servidor no se presenta
  como un lote fallido con conteos inventados. No se envían correos ni push.

Las invitaciones no tienen estados recibida, vista ni rechazada. `rejected`
pertenece a la revisión del conductor y mantiene su etiqueta «Revisión rechazada».
Los vínculos anteriores siguen mostrando la acción de confirmación existente.

Se reutilizan Card, StatusBadge y BottomSheet y se agregan SegmentedTabs y
EmptyState como componentes compartidos sin conocimiento de roles. BottomSheet
permite bloquear su cierre durante una operación; Screen permite alojar una lista
virtualizada sin anidar scrolls. La nueva RPC `get_business_coverage` valida membresía
y lee únicamente el equipo afiliado al negocio; mantiene RLS y la edición exclusiva
del responsable del negocio. Detalles en [ADR 0021](decisions/0021-distributor-owned-coverage.md).

La migración `20261021230714_distributor_owned_coverage.sql` se aplicó en Gasway cloud
tras probar traslado/archivo de datos anteriores y las suites
`supabase/tests/distributor_owned_coverage.sql` y `supabase/tests/distributor_discovery.sql`
con rollback. La nueva suite reemplaza la anterior `business_coverage.sql`.
Las suites Node de cobertura, ofertas y espacio del conductor pasaron. La cobertura
por negocio no cambia roles, aprobaciones ni inventario. Las tres comunas sin negocio
conocido se conservaron en el archivo privado, sin asignarlas a la distribuidora demo.
Sin revisión visual, capturas, renders, emuladores ni interacción en dispositivo.
