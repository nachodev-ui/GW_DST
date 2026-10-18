# Edge Functions

Directorio reservado; no hay handlers desplegados ni features implementadas.

Las futuras funciones validarán JWT y entradas con zod. Usar el JWT del usuario para
operaciones sujetas a RLS. La clave privilegiada solo se usará en el servidor para
precios, ofertas, alta de repartidores y transiciones autorizadas, después de validar
identidad, propiedad y transición. Nunca confiar en IDs, rol o precio enviados por el cliente.
No guardar secretos en el repositorio. Los SDK móviles nunca reciben service_role.
