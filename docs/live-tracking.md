# D3 — GPS en primer plano y mapa en vivo

**Ampliación 2026-10-25:** rutas reales por proveedor y navegación del conductor
con GPS en segundo plano Android ya implementadas. APK actualizado instalado;
prueba física pendiente. «Compartir mi ubicación» conserva el modo original;
«Iniciar navegación» activa el nuevo modo con consentimiento y notificación.
[Guion actual](driver-navigation.md). Los ensayos anteriores no acreditan este modo nuevo.

**Implementado el 2026-10-24; validación física parcial reportada por el operador.**
Código conectado a las pantallas reales de entrega del conductor y detalle del
pedido del cliente. Migración `20261024051807_tracking_delivery_destination`
aplicada en Gasway Test y en la app. No se ejecutó la app, ningún emulador ni
pruebas visuales. El movimiento físico y los permisos del dispositivo no se
consideran comprobados por las pruebas automáticas. Los ensayos reportados más
abajo son evidencia del operador, distinta de comprobaciones visuales de Codex.

## Uso con SDK 58

En la raíz del repositorio:

```bash
npm start -- --go
```

El iPhone usa Expo Go como cliente y el Samsung usa **Gasway sin distintivo
naranja**, development build SDK 58, como conductor. Ambos se conectan al mismo
Metro; [runtime e instalación](expo-runtime.md). Desde el 2026-10-25 el mapa usa
**Apple Maps en Expo Go iOS y Google Maps en Android**, por indicación del operador.
El selector del destino y el seguimiento admiten
el iPhone en Expo Go sin clave Google iOS ni build propio. El operador ya reporta
ambos marcadores y actualizaciones de ubicación. La presentación sin PC sigue en D5.

### Refinamiento del cliente y cámara — 2026-10-24

El operador confirmó los marcadores en «Sigue tu entrega» y GPS actualizándose;
también reportó que cada recepción reajustaba el zoom. Se corrigió el efecto de
cámara para encuadrar al inicio, ceder el control al tocar el mapa y reencuadrar
solo con «Ver ambos». Polling, nuevas muestras y recuperación de señal ya no
provocan ajustes. El mapa no se remonta al alternar entre muestra vigente y espera;
los marcadores siguen siendo condicionales, sin conservar GPS caducado.

Solo el cliente cambia: estado y leyenda breves, sin contador ni precisión visibles;
resumen de compra/dirección/distribuidora y detalles/historial en hoja desplazable.
Hero e ilustración superiores intactos. [Criterios y referencias](design.md).
Los pines predeterminados se sustituyen por un camión de gas y una casa,
con imágenes locales de varias densidades; la casa también aparece al elegir
destino. «Ver detalles» agrupa la fotografía pequeña y los datos del cilindro.
Para actualizar manualmente, volver al inicio y tirar hacia abajo: indicador
nativo con colores de marca, sin botón «Actualizar pedido». El gesto incluye
la lectura GPS autorizada actual y no reajusta la cámara. Polling sigue silencioso.
Estas adiciones todavía requieren comprobación visual en ambos proveedores.
El operador reportó después ambos marcadores invisibles. Se reemplazó
`Marker.image` por `ArtworkMapMarker`, con imagen RN, tamaño explícito, espera de
carga/layout/pintura y respaldo si falla el recurso. Se añadió regresión automática;
falta comprobar la corrección en los teléfonos. El camión ahora sigue el estilo
cenital semirrealista de la referencia del operador, con carga de cilindros visible.
La regresión automática de cámara pasó; falta comprobar este nuevo comportamiento
y composición en el teléfono. Esto no aprueba cambio de sesión ni segunda entrega.

La corrección visual del 2026-10-24 solo cambia JavaScript: recargar el proyecto,
sin recompilar el APK. Las consultas automáticas ya no cambian el botón
«Reintentar ubicación»/«Actualizar seguimiento» a «Actualizando…» ni alternan su
opacidad. La respuesta visual aparece solo tras una pulsación manual. Polling,
Realtime, reloj de frescura y eliminación del pin por caducidad/error se conservan.

1. En el conductor aprobado, abrir Ofertas y activar disponibilidad. El negocio
   demo debe tener stock y cobertura de la comuna elegida.
2. Con el cliente, crear un pedido ficticio **nuevo**, confirmar su pin de entrega
   y comprar al negocio demo. Los pedidos históricos sin pin mantienen su dirección,
   pero no inventan un destino en el mapa.
3. Aceptar la oferta desde el teléfono del conductor y abrir **Tu entrega**.
   Pulsar **Compartir mi ubicación**, conceder ubicación durante el uso y mantener
   esa pantalla abierta. El botón **Salir a entregar** sigue el flujo existente.
4. En el cliente, abrir el detalle del mismo pedido: **Sigue tu entrega** muestra
   destino y repartidor cuando llega una muestra válida y estado «Ubicación en vivo».
   Para probar movimiento, conservar la conexión descrita más abajo.
5. Confirmar la entrega ficticia desde el conductor. El cliente debe perder el pin
   del repartidor; la siguiente entrega comienza esperando una muestra propia.

El GPS se activa expresamente por pedido; comprar o iniciar sesión no lo activa.
El cliente no necesita conceder su ubicación para ver el seguimiento.

## Guion básico: iPhone cliente y Android conductor

La validación automática/cloud anterior ya comprueba reglas de programación,
permisos y servidor. No demuestra que el sensor físico, el mapa y la red de estos
teléfonos funcionen juntos. No hace falta volver a ejecutar esos comandos para
seguir este guion. Registrar estos resultados como evidencia del operador.

**Actualizado el 2026-10-25:** Apple Maps recuperado en Expo Go iOS y Google Maps
en Android. El selector no exige clave propia iOS; variables/plugin preparan
Google para futuros builds. Google rota el marcador nativo; Apple gira su imagen
respecto de la cámara, manteniendo interpolación y encuadre manual. Recargar Expo Go.
La animación y las rutas privadas tienen [su contrato y evidencia](vehicle-motion.md).
[Documentación Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/map-view/).

### Ensayo del mapa iOS: paso a paso

1. Con Metro ya abierto, recargar Gasway en el iPhone y en Android. Si Metro está
   cerrado, ejecutar `npm start -- --go` desde la raíz y conectar ambos teléfonos.
2. En Android, abrir Ofertas y activar disponibilidad del conductor.
3. En iPhone, crear un pedido **nuevo**. En Entrega, escribir dirección y comuna,
   pulsar **Elegir punto en el mapa**, tocar el punto de entrega y pulsar
   **Confirmar este punto**. iOS ahora exige ese punto para continuar, como Android.
4. Completar la compra ficticia. Un pedido antiguo sin pin no se convierte
   automáticamente: crear uno nuevo permite probar los dos marcadores.
5. Android: aceptar la oferta, abrir Tu entrega, pulsar Compartir mi ubicación y
   permitir ubicación durante el uso. Mantener esa pantalla visible/desbloqueada.
6. iPhone: abrir el detalle del mismo pedido y Sigue tu entrega. Deben aparecer
   **Tu entrega** y **Tu repartidor**. Esperar una recepción nueva, unos 20–30 s;
   si no aparece, registrar el mensaje.
7. Comprobar primero ambos marcadores sin moverse. Solo ensayar movimiento si
   Android conserva conexión a internet y a Metro, según la preparación siguiente.
   No hay una distancia obligatoria. Tras una recepción desde otro punto, el
   marcador del repartidor debe cambiar y el destino conservar su punto. Cambiar
   el zoom manualmente: nuevas recepciones deben respetarlo. «Ver ambos» vuelve
   a encuadrar los puntos cuando el usuario lo solicita.
8. Confirmar la entrega ficticia en Android: el cliente debe perder el seguimiento.

El operador ya confirmó ambos marcadores y actualizaciones. Falta evidencia del
nuevo control de cámara y los demás ensayos pendientes de D3. No repetir los aprobados.

### Preparar un pedido ficticio

1. Mantener Metro abierto. Si hay que iniciarlo, ejecutar desde la raíz
   `npm start -- --go`; no iniciar una segunda instancia si ya funciona.
   iPhone: Expo Go. Android: Gasway sin distintivo naranja, conectado al mismo Metro.
2. Android: entrar con `ig.cisternas@duocuc.cl`, abrir Ofertas y activar disponibilidad.
   Mantener internet y ubicación del teléfono encendidos.
3. iPhone: entrar con `nacho.rtk@gmail.com`. Desde Inicio, iniciar un pedido:
   **Lipigas, 11 kg, una unidad, con canje**, comuna **La Florida**, dirección ficticia
   de prueba y distribuidora **Gasway Demo Santiago**, si sigue disponible.
   Los valores son la preparación D0, no una consulta de stock actual.
   Si no aparece el negocio, detener este paso y registrar el mensaje; no probar
   con otra comuna al azar. Confirmar el pin en el nuevo mapa iOS antes de comprar.
4. Android: esperar que aparezca la oferta y pulsar **Aceptar pedido** antes de
   vencer. Abrir **Tu entrega** y mantener esa pantalla visible.
5. iPhone: abrir **Tus pedidos** y el detalle del pedido recién creado. Mantener
   visible la tarjeta **Sigue tu entrega**; ambos teléfonos deben mirar el mismo pedido.

### Comprobar que sale y llega GPS

1. Android: pulsar **Compartir mi ubicación** y permitir ubicación durante el uso.
   Activar ubicación precisa si el teléfono ofrece esa opción. Pulsar
   **Salir a entregar** para avanzar el pedido a En camino.
2. Dejar ambos teléfonos con internet, pantalla encendida y Gasway visible.
   Esperar unos 20–30 s para el primer GPS. Si no llega, registrar el texto de
   ambas tarjetas; no considerar aprobado este paso por esperar más tiempo.
3. Android: debe aparecer **Ubicación compartida con el cliente** y un último
   envío confirmado. iPhone: debe aparecer **Ubicación en vivo** y el pin del
   repartidor. El cliente ya no muestra contador ni precisión; el conductor
   conserva su información de último envío.
4. Estos mensajes prueban envío/recepción del GPS, pero no aprueban el mapa.
   Si aparece un aviso de Maps sin configurar en iOS después de recargar, registrar
   el texto y el runtime. Si dice que el pedido no tiene punto guardado, crear un
   pedido nuevo con pin para ensayar que el destino permanezca fijo.

### Qué significa el ensayo de movimiento, cuando el mapa ya esté disponible

El pin **Tu entrega** representa la dirección/punto elegido al comprar. No
representa la ubicación del iPhone. El pin **Tu repartidor** representa el Android.

1. Crear un pedido nuevo con un punto confirmado y repetir la preparación anterior.
2. Dejar el iPhone quieto mostrando Sigue tu entrega.
3. Si la conexión lo permite, cambiar de punto con el Android dentro de la cobertura,
   con Tu entrega abierta, sin bloquearlo. No exigir 30–50 m ni salir del Wi-Fi.
4. Esperar 10–20 s y mirar el iPhone. El pin del repartidor debe cambiar de lugar;
   el pin del destino debe permanecer en el lugar elegido al comprar. El encuadre
   elegido manualmente debe conservarse. Pulsar «Ver ambos» para volver a los pines.
5. Si hay un único pin porque falta destino o GPS, registrar cuál falta. No marcar
   aprobado el ensayo de dos puntos. No hace falta conducir para comprobarlo.

### Conexión necesaria y qué puede comprobar Codex

El 2026-10-24 se comprobó con `adb devices` y `adb reverse --list` que el Samsung
está conectado por USB y tiene `tcp:8081` redirigido a Metro. No pedir al operador
alejarse con ese montaje ni asumir que los datos móviles sustituyen el acceso a
Metro del development build. Primero se puede comprobar el mapa y sus dos puntos
con ambos teléfonos junto al PC.

Para mover Android hay dos preparaciones posibles: conectarlo a Metro por la LAN
y permanecer dentro de la misma cobertura Wi-Fi, o preparar un APK con JavaScript
incluido, independiente de Metro, y usar una conexión a internet disponible. Esta
última preparación sigue en D5. El iPhone puede quedarse junto al PC. No hay una
distancia mínima fija: un desplazamiento pequeño puede quedar dentro del margen
de precisión del GPS y ser inconcluso. Si la conexión no permite desplazarse,
dejar ese ensayo pendiente; no repetir las interrupciones ya aprobadas.

Codex puede comprobar posiciones sintéticas en el entorno Supabase Test y las
reglas de captura/lectura con pruebas automáticas. La suite `order_tracking.sql`
comprueba que el cliente recibe la segunda posición del conductor y conserva
exactamente el destino original. La suite ampliada pasó el 2026-10-24 en el
proyecto Test `xnrueexpwzvxotgwmamj`, con rollback de los datos temporales y sin
cambiar el backend de la app. Eso no acredita movimiento del sensor físico,
recepción Realtime en estos teléfonos ni dibujo de marcadores en Apple Maps.
No se inyectan posiciones ficticias en el pedido del operador.

### Ensayar interrupciones de una en una

| Prueba            | Acción exacta                                                                                                                          | Qué observar                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Pausa manual      | Android: Pausar mi ubicación. iPhone: dejar el detalle abierto y esperar unos 35 s.                                                    | Dejan de avanzar las recepciones y aparece ubicación desactualizada; el pin desaparece si el mapa está disponible. |
| Recuperación      | Android: volver a compartir; esperar una recepción nueva en iPhone.                                                                    | Regresa el pin y el estado Ubicación en vivo.                                                                      |
| Segundo plano     | Con GPS activo, bloquear Android unos 35 s; iPhone permanece abierto. Después desbloquear y volver a Tu entrega.                       | Caduca en iPhone; al volver y conservar la intención de compartir, llega un GPS nuevo.                             |
| Sin red           | Activar modo avión en Android y apagar también Wi-Fi unos 35 s; mantener internet del iPhone. Después recuperar internet y Tu entrega. | El cliente no recibe una secuencia vieja de posiciones; después llega una muestra nueva.                           |
| Entrega final     | Android: Marcar como entregado y confirmar. Esperar la actualización en iPhone.                                                        | Estado Entregado, sin seguimiento activo ni pin del conductor.                                                     |
| Cancelación       | En otro pedido todavía aceptado, iPhone: Cancelar pedido y confirmar.                                                                  | Ambos ven Cancelado; se detiene el seguimiento. No reutilizar el pedido ya entregado para este ensayo.             |
| Cambio de sesión  | Android: pausar, volver a Cuenta y cerrar sesión. Volver a entrar. iPhone: observar caducidad mientras tanto.                          | Sin nuevos envíos durante la sesión cerrada; compartir otra vez requiere la entrega activa y acción explícita.     |
| Permiso rechazado | Antes de activar GPS, Ajustes Android → Apps → Gasway → Permisos → Ubicación → No permitir. Volver y pulsar Compartir.                 | Mensaje de permiso; no aparece una recepción nueva. Restaurar el permiso y reintentar.                             |

Registrar cada prueba como **aprobada**, **falló** o **bloqueada**, y copiar el
mensaje que aparece. No usar una captura con direcciones/coordenadas personales.
Formato breve: `Prueba: pausa / Android: mensaje… / iPhone: mensaje… / resultado…`.
Las pruebas de pin/destino requieren el mapa visible y un pedido con punto confirmado.

## Evidencia del operador — 2026-10-24

Configuración reportada: iPhone/Expo Go, cliente `nacho.rtk@gmail.com`; Android,
conductor `ig.cisternas@duocuc.cl`. El operador realizó los ensayos y comunicó
resultados; Codex no abrió la app, observó coordenadas ni verificó el mapa.

| Ensayo                                                               | Evidencia reportada                                                                                                                                                                                                                                                           | Estado                                                                                                                     |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Pausa manual                                                         | Cumple la acción exacta del guion.                                                                                                                                                                                                                                            | Aprobado según operador, dentro del alcance de mensajes/caducidad; no acredita pin iOS.                                    |
| Recuperación tras pausa                                              | Cumple la acción exacta.                                                                                                                                                                                                                                                      | Aprobado según operador.                                                                                                   |
| Segundo plano                                                        | Cumple la acción exacta.                                                                                                                                                                                                                                                      | Aprobado según operador.                                                                                                   |
| Modo avión                                                           | Aparecen «No pudimos verificar tu acceso» y «Revisa la configuración y tu conexión para volver a intentarlo». Al recuperar red, vuelve a Inicio; abre Mi Entrega y debe compartir de nuevo. Cliente permanece desactualizado hasta esa nueva activación y después recibe GPS. | Aprobado por indicación explícita del operador el 2026-10-24, con recuperación manual. No acredita reanudación automática. |
| Sin internet                                                         | Mismo error de acceso; vuelve directamente a Tu entrega, con GPS desactivado. Cliente se actualiza al volver a compartir.                                                                                                                                                     | Aprobado por indicación explícita del operador el 2026-10-24, con recuperación manual. No acredita reanudación automática. |
| Entrega final                                                        | Cumple la acción exacta.                                                                                                                                                                                                                                                      | Aprobado según operador; comprobación visual del pin sigue limitada por iOS.                                               |
| Cancelación                                                          | Cumple la acción exacta; salir de Tu entrega detiene la ubicación.                                                                                                                                                                                                            | Aprobado según operador.                                                                                                   |
| Permiso solicitado de nuevo                                          | Android muestra el diálogo, el operador elige permitir durante el uso y el cliente recibe ubicación.                                                                                                                                                                          | Aprobado por indicación explícita del operador el 2026-10-24; concesión/recuperación confirmada.                           |
| Permiso rechazado                                                    | En la repetición, el operador elige No permitir. Android muestra en rojo «Necesitas permitir la ubicación mientras usas Gasway…»; el cliente no recibe ubicaciones nuevas hasta volver a conceder permiso.                                                                    | Aprobado según operador el 2026-10-24, incluida recuperación posterior al conceder permiso.                                |
| Mapa de dos marcadores / cámara / cambio de sesión / segunda entrega | El operador confirma ambos pines y ubicación actualizándose; reportó reajuste de zoom, corregido en código.                                                                                                                                                                   | Mapa y actualizaciones reportados; comprobar la cámara corregida. Cambio de sesión y segunda entrega siguen pendientes.    |

### Diagnóstico de la pérdida de red

La ruta del código es compatible con lo observado: `fetchAccess` consulta perfil
y aprobación en servidor y propaga un error de red; `AuthProvider` presenta error
de acceso. `AuthNavigator` desactiva los grupos protegidos cuando `accessReady`
es false, retirando la pantalla de entrega. `DriverTrackingSession` conserva la
intención de compartir solo en estado React local y la pierde al desmontarse.
Tras recuperar y verificar acceso de nuevo, se vuelve a una ruta permitida y se
requiere la acción explícita Compartir mi ubicación.

El operador aprueba ambos ensayos con la recuperación manual observada. La
reanudación automática no es un bloqueo de aceptación de esos dos ensayos; queda
como mejora posterior de continuidad. Deberá conservar la verificación de
acceso, revalidar pedido/permiso y no restaurar GPS después de logout, cancelación,
cambio de cuenta o pausa manual. En esta entrega se documenta el diagnóstico;
no se cambiaron los guards, el código, los permisos ni el cloud.

### Procedimiento de permiso rechazado — aprobado por el operador

La repetición siguiente ya fue realizada y aprobada el 2026-10-24. Se conserva
como procedimiento reproducible; no es necesario repetirla sin un cambio relevante.

1. Usar un pedido ficticio activo. En Android, pulsar Pausar mi ubicación.
2. Esperar unos 35 s y comprobar en iPhone ubicación desactualizada.
3. Ajustes Android → Apps → Gasway → Permisos → Ubicación → No permitir.
4. Volver a Tu entrega y pulsar Compartir mi ubicación. **Si Android vuelve a
   preguntar, elegir No permitir también en ese diálogo.**
5. Esperar unos 35 s: debe aparecer un aviso de permiso en Android; en el cliente
   no debe aparecer una muestra reciente ni el estado «Ubicación en vivo».
   Este procedimiento ya aprobado no requiere un contador visible en el cliente.
6. Para restaurar el ensayo, volver a compartir y permitir durante el uso.

Si aparecen recepciones **nuevas** pese a denegar también el diálogo, registrar
ambos mensajes: ese resultado requiere investigar el permiso.
No repetir los ensayos ya aprobados salvo un cambio de código que los afecte.

## Comportamiento implementado

- `features/tracking/driver`: permiso durante el uso, comprobación de servicios y
  `watchPositionAsync` con precisión High, intervalo solicitado de 5 s en Android
  y distancia mínima cero. Descarta muestras inválidas, antiguas, repetidas y las
  marcadas como simuladas; conserva el timestamp original del sensor.
- Un envío en curso como máximo. No acumula posiciones offline. Limita envíos
  con reloj monotónico y deja 5 s después de una respuesta antes de otro envío.
  La cadencia efectiva puede ser mayor, por ejemplo cerca de 10 s con callbacks
  cada 5 s y latencia de red. No se promete un fix cada 5 s ni movimiento continuo.
- `shared/tracking`: lectura validada con zod, caché por usuario/pedido, consulta
  inicial, reconsulta al suscribir/reconectar y polling cada 5 s en primer plano.
  Realtime recibe revisiones y estados del pedido; nunca coordenadas del stream.
- `features/tracking/customer`: Apple Maps en Expo Go iOS y Google Maps en Android, dos marcadores reales,
  cámara con encuadre inicial/manual y estado de señal breve. Sin Places,
  Routes, Geocoding de Google, líneas de ruta ni ETA de tráfico.
- Se añade `destination` a la RPC autorizada de D2: pin confirmado o null durante
  el pedido activo; null al terminar. No se decodifica geografía en el móvil ni se
  expone una nueva tabla. Pedidos antiguos sin pin siguen compatibles.
- Caduca el marcador con `fresh_until`/`server_now` y reloj monotónico, descontando
  conservadoramente el tiempo de la petición. El reloj de pared del cliente no
  prolonga una muestra. Una actualización fallida sustituye la lectura por una
  respuesta sin coordenadas, con mensaje y posibilidad de reconsulta.
- Peticiones de lectura/publicación con timeout de 10 s y AbortController.
  La pausa, cambio de identidad y desmontaje abortan lo pendiente; una respuesta
  tardía no restaura el pin ni reactiva el emisor.
- Salir de la pantalla, cambiar de app o bloquear pausa captura/lecturas. Volver
  a primer plano reconsulta, revisa permiso/servicios y reanuda una intención de
  compartir todavía vigente. Volver desde otra pantalla requiere volver a activar
  si la pantalla fue desmontada. No hay seguimiento ni servicio en segundo plano.
- Pausar manualmente o cerrar sesión detiene nuevos envíos. El otro teléfono
  puede seguir viendo la última muestra válida hasta que caduque (máximo 30 s).
  Entrega/cancelación revocan por pedido y borran la posición en servidor;
  el evento terminal corta la vista y cancela lectura/caché aunque el detalle
  principal todavía no se haya actualizado. Sin Realtime, lo descubre el polling.
- Denegación de acceso detiene la captura y la reconsulta automática; la app
  permite actualizar expresamente. Un error GPS muestra cómo revisar permisos
  y ubicación; no simula movimiento para ocultar la interrupción.

## Validación automática y cloud

- `typecheck` y lint dirigido aprobados.
- `test-tracking.cjs`: zod/frescura, bloqueo de solapamientos, descarte de cola,
  pausa, respuesta tardía, fallo transitorio y cierre por autorización. Regresión
  de cámara: espera de readiness, primer encuadre, muestras nuevas, gesto manual,
  señal caducada/recuperada y recentrado expreso con la posición más reciente.
- `test-tracking-lifecycle.cjs`: efectos con mocks, suscripción/reconexión,
  caducidad sin red, eliminación de coordenadas por fallo/denegación, evento final,
  cambio de identidad, limpieza, cancelación tardía y timeout del transporte.
  No usa un renderer React ni runtime nativo.
- Regresión `test-driver-order-progress.cjs` aprobada.
- Test: `order_tracking.sql` ampliado verifica el destino confirmado antes del
  primer GPS, null en pedidos antiguos, desaparición al terminar y todas las
  comprobaciones previas de D2. `pilot_security.sql` aprobado. Fixtures revertidos.
- App: migración y metadatos de la RPC verificados; sin fixtures ni muestras GPS
  introducidos desde aquí. Coordenadas siguen privadas y fuera de Realtime.
- Advisors: Test sin hallazgos; app conserva el WARN conocido de contraseñas
  filtradas deshabilitadas de DT-07, sin hallazgos nuevos de esta entrega.

No se ejecutaron todas las suites, una carrera entre conexiones ni prueba de carga.
La recepción real de WebSocket, el sensor Android y el mapa en cada plataforma
requieren evidencia física del operador.

## Checklist de ensayos D3

Los estados vigentes están en la tabla de evidencia del operador. Este checklist
conserva los criterios; no vuelve pendientes los ensayos ya aprobados.

| Ensayo físico                                | Resultado esperado                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| Dos cuentas/teléfonos y movimiento real      | Cambia el marcador del conductor en el cliente; destino permanece fijo.            |
| Rechazar permiso / apagar ubicación          | Mensaje claro y ningún envío; volver a activar permite reintentar.                 |
| Bloquear conductor / cambiar de app / pausar | Se detienen nuevos envíos; cliente pierde el pin al caducar.                       |
| Interrumpir y recuperar red                  | Sin cola vieja ni movimiento inventado; reconsulta y muestra solo un fix reciente. |
| Cancelar o entregar                          | Se detiene seguimiento y se borra el pin; historial conserva estado final.         |
| Cerrar sesión y cambiar de cuenta            | Se elimina GPS de la vista/caché y la otra cuenta no hereda la posición.           |
| Segunda entrega                              | Espera GPS propio; no reutiliza la muestra de la entrega anterior.                 |

Registrar modelo/Android, APK/Metro usado, hora, cuentas/roles y resultados sin
publicar coordenadas personales. Después, D4 ensaya dos recorridos completos.
DT-07/08, la retención física de pedidos abandonados y la autorización comercial
siguen abiertos. [Contrato D2](gps-contract.md),
[ADR 0033](decisions/0033-foreground-tracking-lifecycle.md).

Referencias: [Expo Location SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/location/),
[Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).
