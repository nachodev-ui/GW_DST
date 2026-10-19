# Contexto operativo de GLP en Chile

Revisado con fuentes primarias el 2026-10-18. Conserva el contexto aportado por el
usuario y las precisiones que afectan al producto. Gasway cubre GLP en cilindros;
GN por red, cisternas y granel siguen fuera del alcance.

## Personas y negocios

En Gasway, el distribuidor es el negocio vendedor: puede ser una persona natural
o una empresa, con uno o varios responsables. Comercializa productos y define su
operación. El conductor realiza la entrega por cuenta de ese negocio. Una persona
puede ser responsable del negocio y conducir, sin duplicar cuentas; ser dueño no
otorga automáticamente habilitación para repartir.

Un conductor contratado y un prestador independiente usan la misma capacidad de
reparto. Esos nombres no determinan por sí solos su relación laboral. Propiedad del
vehículo, combustible, remuneración y comisiones dependen del acuerdo aplicable;
no se fijan salarios ni obligaciones contractuales desde Gasway. Los rangos salariales
y modalidades aportados quedan como contexto, no como constantes verificadas.

Los nombres comerciales de las redes no equivalen automáticamente a una categoría
jurídica ni acreditan autorización. La plataforma debe identificar al negocio que
vende y al conductor que entrega, y conservar la trazabilidad de ambos.

## Exclusividad y marcas

La CNE documentó redes minoristas predominantemente exclusivas y una cifra aproximada
de 5.600 distribuidores durante la década estudiada; no es un censo actual de 2026.
[Presentación CNE, julio de 2023](https://www.cne.cl/wp-content/uploads/2023/08/Presentacion_Mesa_Tecnica_20230721-1.pdf).

La FNE también identifica distribuidores con exclusividad y otros sin ella. Gasway
registra las marcas comercializadas por cada negocio según revisión confiable;
permite una o varias, sin imponer exclusividad universal ni presumir distribución
multimarca. Una recomendación de reforma no equivale a una ley ya vigente.
[Informe FNE, abril de 2023](https://www.fne.gob.cl/wp-content/uploads/2023/04/Informe-con-recomendaciones-Rol-2573-19-FNE.pdf).

## Intercambio de cilindros

El DS 194 reconoce el derecho de intercambio entre cilindros de distribuidores
registrados y dispone procedimientos sin demora ni costo para el usuario. La marca
del envase devuelto no debe usarse como veto automático ni como recargo por cambiar
de proveedor. Esto no certifica seguridad, válvula o estado del envase. La logística
inversa requiere registrar sus características y devolución; no se inventa una
frecuencia fija de intercambio entre empresas.
[DS 194, artículos 6–9, texto consolidado BCN](https://www.bcn.cl/leychile/Navegar?idNorma=10777).

Necesitar un envase no implica necesariamente comprar su propiedad: deben definirse
las condiciones de suministro y, cuando corresponda, garantía. El booleano actual
exchange_empty distingue con/sin devolución; no representa todavía la trazabilidad
del cilindro vacío, su marca, peso o condición. Es una brecha previa al piloto.

## Vehículo, licencia y seguridad

La clase de licencia depende del vehículo y de su configuración. CONASET distingue
B para ciertos vehículos de carga de hasta 3.500 kg de peso bruto, A4 para vehículos
simples sobre ese peso y A5 para simples o articulados sobre ese peso. No se deduce
A5 únicamente por transportar gas a granel; ciertos triciclos tienen reglas propias.
Registrar el tipo de vehículo y revisar su licencia es mejor que inferirla del producto.
[Manual profesional CONASET](https://www.conaset.cl/wp-content/uploads/2019/12/LIBRO-DEL-NUEVO-CONDUCTOR-PROFESIONAL-F17-12-2019_opt.pdf),
[información sobre triciclos](https://mejoresconductores.conaset.cl/).

El DS 108 exige capacitación y registro a cargo del operador, y limita el suministro
de cilindros a camiones inscritos en SEC. No se ha confirmado un certificado personal
universal llamado «capacitación SEC» que sustituya esos antecedentes.
[DS 108, artículos 60 y 121](https://www.bcn.cl/leychile/navegar?idNorma=1064285).

El formulario SEC de transporte distingue inscripción de aprobación técnica; no se
debe presentar una fila is_verified de Gasway como autorización de la SEC.
[Anexo E de transporte de cilindros](https://www.sec.cl/sitio-web/wp-content/uploads/2019/07/ANEXO_E-DECLARACION_DE_CAMION_DE_CILINDROS.pdf).

Antes de habilitar reparto real, administración debe revisar documentación vigente
del conductor, vehículo, capacitación y negocio según la operación aplicable. También
deben verificarse los antecedentes tributarios, comerciales y del recinto. No basta
con nombre/RUT/teléfono ni con la confirmación del negocio. Ser conductor de Gasway
no concede por sí mismo atribuciones de instalador de gas. No se incluyen instrucciones
de instalación o reparación ni se automatiza una certificación legal.

## Decisiones aplicadas y brechas

Se mantiene una app con cliente/conductor y organizaciones separadas. La vinculación
requiere confirmación de un responsable autenticado del negocio y aprobación final
administrativa. Las ofertas y aceptación se filtran por negocio verificado y marcas
configuradas; el vendedor queda fijado al aceptar el pedido. Ver ADR 0013.

Antes del piloto faltan precios/stock/cobertura comercial por negocio, identificación
del vendedor al cotizar, antecedentes de seguridad/vehículo con vigencia y evidencias,
logística de envases, suspensión segura y la interfaz del negocio. El precio global
actual y la identificación del vendedor al aceptar pertenecen al prototipo; no bastan
para cotizar un marketplace con varios negocios reales.
