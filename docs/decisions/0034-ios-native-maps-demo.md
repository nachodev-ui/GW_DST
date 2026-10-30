# ADR 0034 — Apple Maps en el iPhone de la demo

Fecha: 2026-10-24. Estado: **sustituido el 2026-10-25 por [ADR 0035](0035-google-vehicle-route.md)**.
El contenido siguiente conserva el antecedente; no describe el proveedor actual.

## Contexto

La demo usa Expo Go SDK 58 como cliente en iPhone y un development build Android
como conductor. Los dos componentes de mapas exigían Google Maps también en iOS,
sin una clave iOS configurada. Bloqueaban el selector del destino y el ensayo de
dos marcadores. Configurar una clave no convierte Expo Go en un binario Gasway
con configuración nativa propia.

## Decisión

Usar el proveedor nativo de iOS, Apple Maps, en el selector y en el seguimiento.
Mantener Google Maps en Android con la clave y restricciones existentes. Resolver
la disponibilidad/proveedor en `shared/maps/provider.ts`, sin conocer roles.
Reutilizar react-native-maps instalado; sin nuevas dependencias ni cambios nativos.

iOS y Android exigen confirmar el destino para compras nuevas desde la app. Web
conserva su formulario manual. No se modifican pedidos históricos sin coordenadas:
el ensayo de dos puntos usa un pedido nuevo con pin. El backend/RLS y el contrato
GPS de D2 se conservan.

## Consecuencias

El iPhone puede probar selección y seguimiento al recargar Expo Go. No hace falta
Google Cloud CLI, clave iOS, activar APIs, cambiar facturación ni compilar iOS.
El mapa tendrá apariencia distinta en cada plataforma; muestra los mismos puntos
autorizados. No se calculan rutas ni ETA. Google Maps en un futuro build iOS propio
requiere otra decisión/configuración explícita; una clave iOS por sí sola no cambia
el proveedor elegido ahora.

La implementación y las pruebas automáticas no acreditan que el operador vea el
mapa: el ensayo físico sigue abierto en [D3](../live-tracking.md).
Fuente: [Expo SDK 58, react-native-maps](https://docs.expo.dev/versions/v58.0.0/sdk/map-view/).
