# Probar Mi negocio

Rama de origen: `feat/business-onboarding`. Todo el ejemplo es ficticio.
Esta guía conserva el ejemplo de gestión del negocio; la demo integral priorizada
el 2026-10-23 se prepara con [el plan D0–D5](demo-commercial-validation.md).
No asumir que estos IDs ni su estado histórico coinciden con el entorno elegido.

**Estado cloud actualizado (2026-10-23):** D0 confirmó este negocio y responsable;
el conductor `ig.cisternas@duocuc.cl` ya está aprobado para pruebas y la cobertura
vigente es La Florida/Puente Alto/Pirque. Stock y precios actuales en
[entorno de demo](demo-environment.md); los valores de abajo conservan el ejemplo inicial.

## Datos preparados

- Responsable: `a30a8236-175c-424d-9bf4-ff753d695649`; conserva su perfil de cliente.
- Negocio: **Gasway Demo Santiago**, ID `10b7ae4e-06c2-4ca5-a55e-235be95bde9d`.
- Comuna operativa de ejemplo: Santiago, CUT `13101`; Lipigas como marca de prueba.
- RUT/contacto/dirección y referencias de antecedentes ficticios, sin documentos válidos.
- Cuatro productos estándar de 5/11/15/45 kg, con stock inicial de 12 por producto.
- Precios iniciales ficticios: $10.990 / $15.990 / $21.990 / $69.990, respectivamente.
- Incorporación por invitación desde Equipo; ningún conductor nuevo fue aprobado o vinculado automáticamente.

La revisión administrativa registra explícitamente la prueba; is_demo=true aparece
en la interfaz. is_verified=true habilita probar los controles de este entorno y
no representa certificación legal. Ningún precio global ni pedido previo se modificó.

## Recorrido manual para el usuario

1. Actualiza la app con esta rama e inicia sesión con la cuenta del responsable indicado.
2. Abre **Mi cuenta → Mi negocio**. Deben aparecer el nombre y el aviso de prueba.
   Si también es repartidor aprobado, la entrada está en su pantalla de ofertas.
3. En catálogo, pulsa **Editar** en un producto. Guarda precio en pesos enteros,
   cantidad de cilindros e inclusión. Actualiza los datos para comprobar persistencia.
4. Como responsable, abre **Gestionar equipo → Invitar conductor**. Indica nombre
   ficticio y el correo confirmado de otra cuenta de prueba; revisa y crea la invitación.
   Para un lote, importa [equipo-demo.csv](examples/equipo-demo.csv) y adapta sus correos.
5. En la cuenta invitada, abre **Mi cuenta → Activar mi acceso como conductor**,
   acepta la invitación y completa sus datos ficticios con RUT válido para la prueba.
   Equipo muestra aceptación y habilitación por separado, sin exponer RUT/teléfono.
6. Administración decide separadamente mediante `review-driver-application.sql`.
   Tras rechazo, el negocio debe generar una nueva invitación.
7. Prueba cancelar una invitación pendiente y buscar/paginar el equipo. Comprueba
   que otra cuenta no ve ni acepta invitaciones dirigidas a otro correo.

Ver [guía de Equipo](driver-team.md). El directorio abierto de postulaciones fue
retirado. Un development build previo necesita recompilarse para el selector de CSV.

Para probar el alta desde cero usa otra cuenta sin membresía: **Mi negocio → Registrar
mi negocio**, completa campos y envía. Administración puede listar y resolver con
`supabase/admin/review-distributor-application.sql`, copiando requested_at completo.
Para un negocio ficticio, el último argumento de review_distributor_application
debe ser true y el motivo debe señalar claramente que es una prueba.

## Qué todavía no probar como flujo real

La compra actual usa vendedor elegido y reserva de existencias mediante el flujo
documentado en [compra por distribuidora](distributor-shopping.md); `create_order`
pertenece al prototipo histórico. Maps Android y punto de entrega están implementados
en [D1](maps-setup.md), pendientes de validación en teléfono; el seguimiento GPS
del conductor sigue pendiente.
Tampoco se capturan archivos, vencimientos de antecedentes de conductor/vehículo ni
una revisión regulatoria real. No usar el demo para entregas reales.

## Repetir y desactivar el ejemplo

`supabase/admin/create-demo-business.sql` se ejecuta como postgres solo en el proyecto
Gasway `gleltbrvpfvfgggcatpt`. Es repetible y conserva precios/stock editados. No cambia
roles, habilitaciones, solicitudes de conductor ni auditoría histórica.

Si se deja de usar, administración puede deshabilitarlo sin borrar su auditoría:

```sql
update public.distributors
set is_verified=false,accepts_driver_applications=false
where id='10b7ae4e-06c2-4ca5-a55e-235be95bde9d' and is_demo;
```

Las suites SQL revierten sus propios fixtures; el negocio demo queda por petición
expresa para que el usuario pruebe la app. No se realizaron comprobaciones visuales.
