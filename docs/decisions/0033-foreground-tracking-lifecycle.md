# ADR 0033 — Seguimiento con activación explícita y ciclo de vida de pantalla

Fecha: 2026-10-24. Estado: implementado; validación física D3 pendiente.

## Decisión

Capturar GPS con Expo Location únicamente en la entrega asignada visible y en
primer plano, después de una acción del conductor y permiso durante el uso.
Pausar al salir/bloquear; no instalar TaskManager, permisos de segundo plano ni
servicios Android. Se reutiliza el build de D1 y la infraestructura existente.

Separar captura en tracking/driver y mapa en tracking/customer. Lectura, contratos
y reloj de frescura son neutrales en shared; ningún lado importa el otro.
Usar las RPC de D2, ampliando la lectura con el destino del pedido activo.

Realtime invalida consultas; polling de 5 s y reconsulta al conectar cubren huecos.
Eventos terminales solo pueden quitar acceso. Toda coordenada viene de una RPC
autorizada, con vencimiento local monotónico y sin caché persistente.

Permitir un envío en curso, descartar fixes durante su ventana y cancelar peticiones
al salir. No almacenar cola offline ni retimbrar muestras viejas como nuevas.
Timeout de 10 s y ventana de 5 s después de la respuesta priorizan datos recientes
y frecuencia acotada; la cadencia efectiva depende de sensor/red y puede ser mayor.

## Consecuencias

El cliente ve dos puntos, antigüedad y precisión; no ruta/ETA inventada. Pausar o
cerrar sesión detiene nuevos envíos, pero una muestra recibida sigue válida hasta
su caducidad de 30 s; entregar/cancelar revoca por pedido y purga en servidor.
Un error de lectura oculta coordenadas anteriores; no se presentan datos de caché
como ubicación actual. Cambiar de identidad cancela lecturas y borra caché.

Los tests usan mocks y verifican ciclos de vida/caducidad. No acreditan el sensor,
el canal real ni el mapa en teléfonos. El ensayo D3 y el recorrido D4 siguen
pendientes hasta contar con evidencia del operador. [Guía D3](../live-tracking.md).
