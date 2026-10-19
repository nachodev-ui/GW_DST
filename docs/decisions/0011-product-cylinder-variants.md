# ADR 0011: Variantes de cilindro en el catálogo

Estado: aceptado. Fecha: 2026-10-18.

Abastible incorpora VMA 15 kg y VM 15 kg además del cilindro estándar de 15 kg.
Marca y peso ya no identifican un producto de forma suficiente.

Se agrega `products.variant` (`standard`, `vma`, `vm`) y unicidad por marca, peso
y variante. SQL limita VMA/VM a Abastible 15 kg. Los registros existentes reciben
`standard`; conservan UUID, precio y referencias históricas. Los nuevos productos
se crean sin precio, por lo que no son comprables hasta configuración confiable.

El cliente selecciona por UUID y muestra la variante en los resúmenes. Las RPC
del repartidor incluyen la variante conservando sus filtros de autorización.
Las seis fotografías suministradas se empaquetan como assets locales de Abastible;
las demás marcas mantienen su ilustración. No se agregan dependencias ni reglas
de compatibilidad de válvulas o canje entre variantes.
