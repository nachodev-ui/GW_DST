# ADR 0038 — Dirección comercial desde un punto confirmado

Fecha: 2026-10-26. Estado: implementado; comprobación nativa pendiente.

## Contexto

El perfil guardaba coordenadas del mapa/GPS sin actualizar la dirección comercial.
El operador pidió sincronizarlas, diferenciar Comuna de las acciones de mapa y
evaluar Places para formularios de dirección.

## Decisión

Usar la geocodificación inversa nativa ya disponible en Expo para Android/iOS al
confirmar un punto. Una llamada por acción, con espera limitada y bloqueo de
duplicados; sin búsqueda en cada gesto ni servicios de Google nuevos. Comuna es
un campo desplegable y mapa/GPS forman un grupo de acciones separado.

El geocoder sugiere calle/número y un CUT solo si los nombres administrativos
coinciden de manera exacta y única con el catálogo. Los resultados se validan con
zod y deben indicar Chile. Son sugerencias editables, no validación jurídica de
dirección o límites comunales. Corregir texto/comuna conserva el punto elegido por
el usuario y pide revisar su correspondencia. Si faltan datos se pide completarlos; no se conserva
la dirección antigua para un punto nuevo. Guardar sigue siendo explícito y la RPC
mantiene los permisos y restricciones existentes.

## Consecuencias

Places Autocomplete sería útil para ofrecer sugerencias mientras se escribe, pero
no es necesario para convertir coordenadas a una dirección. Incorporarlo después
requiere definir cobertura web/nativa, proveedor por mapa, atribución, restricciones
de credenciales y presupuesto antes de activar servicios. No se reutiliza la clave
de Directions para otro API. Web conserva el ingreso manual porque Expo no ofrece
geocodificación inversa web. Android puede pedir permiso de ubicación para resolver
un punto aunque se haya elegido manualmente; denegarlo conserva la entrada manual.

Fuentes: [Places (New)](https://developers.google.com/maps/documentation/places/web-service/op-overview),
[geocodificación inversa](https://developers.google.com/maps/documentation/geocoding/guides-v3/requests-reverse-geocoding)
y [Expo Location SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/location/#locationreversegeocodeasynclocation).
