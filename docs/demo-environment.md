# D0 — Entorno de la demo

**Actualización 2026-10-26:** la nueva validación documental se prepara en
**Gasway Test** con una demo persistente independiente. Negocio Gasway Demo Test,
responsable/cliente `nacho.rtk@gmail.com`, conductor `ig.cisternas@duocuc.cl` y admin
revisor separado `ig.cisternas.dev@gmail.com`; solo el catálogo, cobertura y
prerrequisitos ficticios están preparados. No se copiaron cuentas, contraseñas ni
documentos de Project. `.env` local fue comprobado contra Test sin imprimir claves.
[Cuentas, ingreso y recorrido en teléfonos](device-demo-test.md).
Los apartados originales siguientes describen la preparación histórica en Project;
sus cuentas, contraseñas e IDs no corresponden a esta nueva demo Test.

**Preparación cloud completada el 2026-10-23** por autorización del operador.
**D0 marcado completado por indicación del operador el 2026-10-24.**
La verificación fue de configuración, datos y permisos de servidor; falta el ensayo
de ingreso y recorrido en los teléfonos. No acredita habilitación para reparto real.

## Destino y aislamiento

- Proyecto de la app: `gleltbrvpfvfgggcatpt`, URL
  `https://gleltbrvpfvfgggcatpt.supabase.co`.
- `apps/mobile/.env` y `supabase/.temp/project-ref` apuntan a ese mismo destino.
  No se cambiaron claves, contraseñas, enlace CLI ni variables de entorno.
- Negocio único observado: **Gasway Demo Santiago**, ID
  `10b7ae4e-06c2-4ca5-a55e-235be95bde9d`, `is_demo=true`, `is_verified=true`.
  El indicador habilita pruebas; no certifica contrato de marca, SEC ni documentos.
- Se conservó el cloud de la app para la demo; Gasway Test
  `xnrueexpwzvxotgwmamj` sigue reservado para regresiones/CI y no fue modificado.
  El proyecto de app no tiene `private.test_environment`; no añadir ese marcador
  para ejecutar allí los runners protegidos de Test.
- Cloud registra 21 migraciones, hasta `20261023180000_registration_phone`;
  el árbol local también contiene 21. No se aplicaron migraciones en D0.

Las cuentas usan correos reales controlados por el operador; el negocio y las
operaciones son de prueba. No incorporar clientes ni entregas reales en este entorno
antes de la confirmación contractual y los requisitos de piloto.

## Tres cuentas conservadas

| Uso                          | Correo exacto confirmado en Auth | Estado cloud                                                                                                                         |
| ---------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Cliente                      | `nacho.rtk@gmail.com`            | Correo confirmado, perfil `customer`, sin membresía de negocio.                                                                      |
| Conductor                    | `ig.cisternas@duocuc.cl`         | Correo confirmado, perfil `driver`, postulación aprobada y afiliación al negocio demo. Disponibilidad desactivada.                   |
| Responsable de distribuidora | `ig.cisternas.dev@gmail.com`     | Correo confirmado, membresía `owner` del negocio demo. Su perfil base sigue siendo `customer`; la gestión se autoriza por membresía. |

El correo de cliente escrito inicialmente como `nacho.rtk@gmail` corresponde a la
cuenta existente terminada en `.com`; no se creó ni renombró ninguna identidad.
No se cambiaron contraseñas ni se emitieron enlaces de confirmación o recuperación.

## Aprobación del conductor

La postulación estaba completa y pendiente, con invitación vigente aceptada por el
destinatario y negocio solicitado coincidente. Se usó
`private.review_driver_application`, con motivo explícito de demo ficticia y
referencia de operador `Nacho via Codex, D0 autorizado 2026-10-23`.
La revisión queda en `private.driver_application_reviews` y el conductor conserva
`is_available=false` hasta que active su disponibilidad desde la app.

La operación acotada queda en [approve-demo-driver.sql](../supabase/admin/approve-demo-driver.sql).
Ese archivo corresponde a esta postulación exacta y se detiene si cambió o ya fue
aprobada: no es un comando para repetir ni una herramienta general de altas.
Para futuras postulaciones usar [review-driver-application.sql](../supabase/admin/review-driver-application.sql)
como operador confiable, revisando primero la cola. No se necesitan permisos de
administrador dentro de la app del conductor ni un panel web para esta operación.

## Limpieza autorizada

Se encontraron siete cuentas. Se eliminaron las cuatro distintas de las tres
conservadas mediante `scripts/security/delete-pilot-account.cjs`, una por una.
Cada ejecución comprobó dependencias en 56 tablas, revocó sesiones/refresh tokens
y verificó ausencia de Auth, perfil y referencias tras el borrado.
No se eliminaron cuentas de otros proyectos ni se modificaron las tres conservadas
fuera de la aprobación indicada. Sus tres pedidos históricos se mantienen:
uno entregado y dos cancelados; no hay pedidos activos ni archivos en Storage.

## Datos disponibles para el ensayo

Cobertura vigente, conservada sin cambios: **La Florida (`13110`), Puente Alto
(`13201`) y Pirque (`13202`)**. El responsable la gestiona desde Mi negocio;
el conductor la hereda y solo controla su disponibilidad.

| Producto Lipigas estándar | Precio con canje | Stock | Publicado |
| ------------------------- | ---------------- | ----- | --------- |
| 5 kg                      | $10.990          | 12    | Sí        |
| 11 kg                     | $15.990          | 11    | Sí        |
| 15 kg                     | $21.990          | 12    | Sí        |
| 45 kg                     | $70.000          | 7     | Sí        |

Son precios y existencias de ejemplo observados, no cotizaciones comerciales.
Solo el formato 45 kg tiene modalidad sin canje configurada ($100.000).
Para el primer recorrido usar **Lipigas 11 kg, una unidad, con canje, La Florida**.
No se repusieron existencias ni se alteraron precios o cobertura durante D0.

## Verificación realizada y paso siguiente

- Dentro de la misma transacción de aprobación se consultó el espacio del conductor
  con rol SQL `authenticated` y su identidad: postulación `approved`, habilitación
  y condiciones de recepción correctas, sin capacidad de gestión de negocio.
- Con rol SQL `authenticated` e identidad del cliente, `list_delivery_options`
  devolvió el negocio demo para Lipigas 11 kg con canje en `13110`.
  La disponibilidad sigue apagada: consultar catálogo no significa poder despachar.
- La consulta final confirmó exactamente tres cuentas, correos confirmados, una
  membresía owner, auditoría de aprobación y cero pedidos activos. Cero tablas
  públicas sin RLS observadas; esto no sustituye una auditoría completa de políticas.

No se crearon sesiones Auth ni pedidos para estas comprobaciones. La identidad
simulada en SQL comprueba permisos/RPC, no el ingreso real desde un dispositivo.
No se ejecutaron la app, emuladores ni pruebas visuales.

Para el ensayo posterior, ingresar con la cuenta del conductor y actualizar el
acceso; si la sesión conserva la pantalla anterior, cerrar e iniciar sesión.
En Ofertas activar **Disponible** al comenzar, y mantener la pantalla abierta para
recibir ofertas. El cliente debe usar una comuna cubierta. El responsable conserva
Mi negocio y Equipo. Siguiente desarrollo: **D1, configuración de Google Maps**,
según [el plan de demo](demo-commercial-validation.md).
