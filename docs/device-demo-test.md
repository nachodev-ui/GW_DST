# Validar documentos en teléfonos con Gasway Test

Preparación persistente autorizada por el operador: **2026-10-26**.
Las pruebas SQL anteriores revertían todos sus fixtures; por eso Test tenía el
esquema, 14 productos, 346 comunas y el admin, pero ningún negocio/conductor/vehículo.
Esta preparación permanece en Test después de terminar el comando.

## Entorno y cuentas

Solo `xnrueexpwzvxotgwmamj`. Se comprobó en memoria que la URL y clave pública de
`apps/mobile/.env` corresponden a Test, sin imprimir claves. No se copiaron usuarios,
contraseñas, datos privados, documentos ni pedidos desde Gasway Project.
Las funciones `order-route` y `delete-document-owner` están ACTIVE en Test.
La existencia de la función de rutas no comprueba sus secretos/configuración externos.

| Cuenta                       | Uso en Test                                  | UUID                                   |
| ---------------------------- | -------------------------------------------- | -------------------------------------- |
| `nacho.rtk@gmail.com`        | Responsable del negocio y cliente            | `417bcd24-da3f-41ba-a73c-1be4f7bbf66c` |
| `ig.cisternas@duocuc.cl`     | Conductor                                    | `19a061da-413d-4911-8288-7b8ad5144221` |
| `ig.cisternas.dev@gmail.com` | Admin de revisión, sin membresía del negocio | `232ed99e-c991-408d-9eb8-c842b23c953a` |

Las dos primeras cuentas se crearon confirmadas con Auth Admin API, sin correos y
sin establecer una contraseña conocida. La cuenta admin fue creada de la misma
forma anteriormente. La consulta de Auth puede mostrar un hash incluso en una
cuenta creada sin contraseña elegida: **no demuestra que el operador conozca una
clave de ingreso**. Las contraseñas de Project no se transfieren a Test.

Si aún no configuraste claves para esas cuentas en Test, el helper existente
permite definirlas sin enviarlas por correo ni escribirlas en el chat. Desde la
raíz del repositorio, ejecuta la línea correspondiente a cada cuenta que lo necesite:

```powershell
pwsh -File scripts/reset-auth-password.ps1 -UserId 417bcd24-da3f-41ba-a73c-1be4f7bbf66c -Email nacho.rtk@gmail.com
pwsh -File scripts/reset-auth-password.ps1 -UserId 19a061da-413d-4911-8288-7b8ad5144221 -Email ig.cisternas@duocuc.cl
pwsh -File scripts/reset-auth-password.ps1 -UserId 232ed99e-c991-408d-9eb8-c842b23c953a -Email ig.cisternas.dev@gmail.com
```

El helper toma el proyecto desde `apps/mobile/.env`; confirma que su encabezado
muestre `https://xnrueexpwzvxotgwmamj.supabase.co`. Pide una **Secret key de Test**
o su `service_role` y la contraseña dos veces, con entrada oculta. Esa credencial
administrativa solo se introduce en el helper: no se guarda en `.env`. Las claves
deben cumplir la política mostrada (mínimo 8 caracteres, mayúscula A-Z y número).
El helper comprueba UUID/correo antes de modificar la cuenta. No ejecutamos cambios
de contraseña durante la preparación; son elegidas por el operador.

## Demo creada

- Negocio **Gasway Demo Test**, ID `ea9db0ff-4106-46f2-847f-3b0586ccadef`, `is_demo=true`.
- Lipigas 11 kg estándar, publicado, $15.990 con canje, $25.990 sin canje, stock
  ficticio inicial de 20 unidades. No son precios comerciales.
- La Florida (`13110`), Puente Alto (`13201`) y Pirque (`13202`).
- Conductor con solicitud/invitación y aprobación de acceso auditadas; clase A4 y
  RUT de ejemplo `12345678-5`. Disponible apagado y documentos pendientes.
- Vehículo **ZZ9999**, marca DEMO, modelo Prueba ficticia, año 2026, tipo camión,
  vinculado al conductor, fuera de servicio y sin foto/documentos aprobados.
- Cero pedidos y cero documentos al preparar. No se usó el helper de regresiones
  que crea aprobaciones sintéticas: los archivos y las decisiones se cargan en la app.

La aprobación de acceso es únicamente para esta demo ficticia; no acredita
autenticidad documental, licencia compatible, habilitación legal ni reparto real.

## Abrir en los teléfonos

Para este ensayo de documentos puedes usar **Expo Go SDK 58 en ambos teléfonos**:

```powershell
npm start -- --go --clear
```

Abre el proyecto servido por este Metro en Samsung/iPhone. Expo Go incluye los
módulos de selección/compresión usados para fotos. El APK del Samsung se recompiló
e instaló el 2026-10-26 con ambos módulos, conservando firma y datos, tras el error
`Cannot find native module 'ExpoImageManipulator'` reportado por el operador.
[Build y comprobaciones de empaquetado/instalación](expo-runtime.md).
Cualquier copia anterior necesita actualizarse; recargar JavaScript no añade
módulos nativos. La navegación con GPS en segundo plano se comprueba aparte en el
development build correspondiente; no es parte de este ensayo documental.

Configuración cómoda: conductor en un teléfono; responsable/cliente en otro.
Para revisar, cambia temporalmente la segunda cuenta al admin y luego vuelve al
responsable. El propietario puede abrir **Perfil → Comprar como cliente**; su
membresía no cambia el rol base customer. El admin entra desde **Tu cuenta →
Revisar documentos**. También puedes usar una tercera sesión de la app para el admin.

## Archivos ficticios para las cargas

El paquete [archivos de demo](../output/pdf/gasway-test-archivos-demo.zip) contiene:

- `gasway-test-vigente.pdf`: ejemplo válido hasta **2027-04-24**.
- `gasway-test-vencido.pdf`: ejemplo vencido el **2026-10-25**.
- `gasway-test-imagen.png`: ilustración de ensayo con placa ZZ9999; no es una foto real.
- Instrucciones de carga. Todos llevan indicación DEMO/sin validez.

Pasa el ZIP a Archivos/Descargas de los teléfonos y descomprímelo. Puedes reutilizar
el mismo PDF en varios tipos: cada carga obtiene una ruta/fila nueva. Introduce en
el formulario la fecha que aparece en el archivo. Son fixtures para la mecánica de
carga/revisión; no réplicas de documentos oficiales ni antecedentes para producción.
Se generaron con ReportLab/Pillow, sin inspección visual por el límite solicitado.

## Recorrido manual y resultado esperado

1. **Bloqueo inicial.** Como conductor intenta activar Disponible; debe explicar que
   falta revisión de la licencia. Como responsable abre Operación y el vehículo:
   intentar Disponible antes de completar antecedentes debe fallar.
2. **Carga.** En Operación → Flota → ZZ9999 → Documentar vehículo sigue foto → padrón →
   permiso → revisión técnica → homologación → SOAP → resumen. Selecciona, revisa la
   vista previa y pulsa Guardar archivo; después Continuar. Para cumplir todos los
   requisitos necesitas foto y los cuatro tipos: padrón, permiso, SOAP y revisión
   técnica **o** homologación. Test permite omitir los últimos pasos para explorar la
   interfaz sin todos los archivos; no se habilita el vehículo por omitirlos.
   Como conductor, abre Cuenta → Mi licencia y documentos: confirma el RUT de
   ejemplo y clase A4, adjunta frente y dorso, y revisa el resumen. Usa 24/04/2027
   como próximo control del dorso. El responsable consulta el avance desde
   Operación → Ver qué falta o Equipo → Ver habilitación; no carga la licencia.
   Las fechas del asistente se ingresan DD/MM/AAAA. Para probar el rechazo, sube
   primero el PDF vencido como SOAP con 25/10/2026.
   Deben verse pendientes/fechas y mantenerse el bloqueo de disponibilidad.
3. **Revisión con otra cuenta.** Entra como admin, abre Tu cuenta → Revisar documentos,
   consulta archivos y antecedentes, confirma fechas y aprueba los vigentes. Rechaza
   el SOAP vencido con motivo. El responsable debe ver ese motivo y seguir bloqueado.
4. **Corrección.** Vuelve como responsable y sube una nueva versión SOAP con el PDF
   vigente y 24/04/2027 en el asistente. El admin aprueba esa fila. Los conjuntos deben mostrar
   «Documentos revisados»; no debe aparecer una certificación oficial.
5. **Habilitación.** Como responsable edita ZZ9999 y marca Disponible. Después el
   conductor activa Disponible. Ambas operaciones deben confirmar el guardado.
6. **Pedido ficticio.** Como cliente/responsable elige Perfil → Comprar como cliente,
   Lipigas 11 kg, una unidad, con cilindro vacío y una comuna cubierta. Usa una
   dirección de prueba y confirma el punto requerido. El conductor debe recibir la
   oferta y poder aceptarla; cliente y conductor deben ver el mismo pedido asignado.
   Puedes completar el avance normal hasta Entregado.
7. **Reemplazo sin pérdida de aprobación.** Después, carga otra versión de un tipo
   ya aprobado y vigente. Mientras esté pendiente, o si el admin la rechaza, la
   aprobación anterior debe continuar habilitando ese requisito. Conserva el error
   o captura del operador si algún paso se comporta distinto.

El vencimiento durante una entrega y el aislamiento entre distribuidoras ya tienen
comprobación SQL/RLS; no cambies el reloj del teléfono para simularlos: la vigencia
la decide el servidor en America/Santiago. No hace falta repetir la suite completa.
La eliminación/limpieza debe ensayarse aparte con una entidad descartable y sin
historial incompatible; desplegar la función no equivale a comprobar ese borrado.

## Evidencia que falta

No abrimos/renderizamos la app, emuladores ni pantallas de los teléfonos. La demo
persistente y la configuración local quedaron preparadas; **todavía no se afirma
validación de dispositivo**. Registra plataforma/runtime, cuenta/rol, paso y resultado
observado (especialmente archivo/foto, errores, bloqueo, aprobación y aceptación).
Un resultado reportado por el operador se registra como tal, separado del SQL.

Para diagnosticar Test sin imprimir claves:

```powershell
$env:GASWAY_TEST_PROJECT_REF = 'xnrueexpwzvxotgwmamj'
node --env-file=apps/mobile/.env scripts/security/inspect-device-demo.cjs
```

Para recrear prerrequisitos faltantes con autorización del operador:

```powershell
$env:GASWAY_TEST_PROJECT_REF = 'xnrueexpwzvxotgwmamj'
node scripts/security/prepare-device-demo.cjs
```

El script es exclusivo de Test y no reinicia avances: preserva cuentas/contraseñas,
ofertas ya configuradas, documentos, disponibilidad y pedidos existentes. No envía
correos ni copia Project. Creó las cuentas con Auth Admin API y usó onboarding,
invitaciones, revisión de acceso y RPC de flota existentes bajo autorización del
operador; las identidades SQL de la preparación no acreditan un login desde teléfono.
