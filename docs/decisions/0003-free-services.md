# ADR 0003 — Desarrollo sin presupuesto

Fecha: 2026-10-17. Estado: aceptado con dependencias externas pendientes.

Decisión: desarrollo local, Supabase Free cuando corresponda y sin provisionar cuentas,
activar facturación, EAS de pago, SMS, gateways o APIs de rutas/geocoding. Compilación
local como camino inicial. Pago contra entrega; contrato para gateways posteriores.

Google Maps queda como dependencia/configuración, con claves vacías y sin llamadas.
Su activación exige revisar condiciones de Google Cloud y facturación antes del piloto;
no se presume que una cuota gratuita equivalga a ausencia de cuenta de facturación.
Publicar en tiendas también requiere evaluar sus costos y alternativas de distribución.

Consecuencia: el scaffold no genera consumo de esos servicios. No promete un MVP
publicado con todos los proveedores a costo cero. Límites, precios y elegibilidad
se verificarán al planificar el piloto, sin contratarlos automáticamente.
