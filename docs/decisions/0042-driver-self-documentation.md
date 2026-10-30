# ADR 0042 — Carga personal de licencia

Fecha: 2026-10-27. Estado: aceptado.

El negocio podía cargar la licencia de sus conductores, mientras estos recibían
un bloqueo que les pedía contactar al responsable. La aprobación de acceso también
se presentaba como habilitación completa aunque faltaran licencia o vehículo.

El conductor pasa a ser el único actor que edita su RUT/clase y sube su licencia.
El negocio conserva consulta de avance; administra vehículos y sus documentos.
Gasway revisa mediante el ACL privado existente y no puede aprobar una carga propia.
La autorización se aplica a RPC y Storage, no solo a los botones.

La documentación tiene un grupo de rutas propio protegido por sesión y vinculación
consultada al servidor. Admite completar antecedentes antes de la aprobación de
reparto, sin modificar el guard de ofertas. Los componentes compartidos reciben
propietario y usuario como parámetros; no importan features ni autorizan por rol
editable. Se mantienen aprobación de acceso, vigencia documental y disponibilidad
como estados distintos. No se migran archivos ni se aprueba ningún antecedente.

La migración exige el esquema documental de ADR 0039. Se prepara y verifica en
Test; Project necesita un despliegue posterior coordinado. Ver
[flujo y evidencia](../driver-documentation-flow.md).
