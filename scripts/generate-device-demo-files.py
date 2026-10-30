"""Fictitious upload fixtures, never official documents or real vehicle photographs."""
from datetime import date, timedelta
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
output = root / "output" / "pdf"
output.mkdir(parents=True, exist_ok=True)
today = date(2026, 10, 26)
valid_until = today + timedelta(days=180)
expired_on = today - timedelta(days=1)
files = []
for name, expiry, state in [
    ("gasway-test-vigente.pdf", valid_until, "VIGENTE PARA EL ENSAYO"),
    ("gasway-test-vencido.pdf", expired_on, "VENCIDO PARA EL ENSAYO"),
]:
    path = output / name
    document = canvas.Canvas(str(path), pagesize=A4)
    document.setTitle("Gasway Test - archivo ficticio sin validez")
    document.setFillColor(HexColor("#153D2D"))
    document.setFont("Helvetica-Bold", 22)
    document.drawString(48, 780, "GASWAY TEST - DEMO")
    document.setFont("Helvetica-Bold", 18)
    document.drawString(48, 744, "DOCUMENTO FICTICIO - SIN VALIDEZ")
    document.setFont("Helvetica", 12)
    lines = [
        "Archivo generico para ensayar la carga y revision documental.",
        "No reproduce ni certifica ningun documento oficial.",
        "",
        "Conductor de ejemplo: Conductor DEMO Test",
        "RUT de ejemplo: 12345678-5",
        "Clase de licencia de ejemplo: A4",
        "Vehiculo de ejemplo: ZZ9999 - DEMO / Prueba ficticia",
        "",
        f"Fecha de emision del archivo: {today.isoformat()}",
        f"Vencimiento / proximo control de ejemplo: {expiry.isoformat()}",
        f"Estado de ejemplo: {state}",
        "",
        "En la app elige el tipo de documento que estas probando.",
        "Para los tipos con fecha obligatoria, usa la fecha indicada arriba.",
        "Puedes reutilizar este archivo en distintas cargas de la demo.",
        "El administrador revisa con otra cuenta; nunca la del autor.",
        "",
        "USO EXCLUSIVO EN GASWAY TEST",
        "No cargar como antecedente real ni usar para autorizar reparto real.",
    ]
    y = 700
    for line in lines:
        document.drawString(48, y, line)
        y -= 24
    document.setFont("Helvetica-Bold", 11)
    document.drawString(48, 68, "DEMO / SIN VALIDEZ / DATOS FICTICIOS")
    document.save()
    files.append(path)

# A labelled geometric fixture, explicitly not a photo of a real truck.
photo = output / "gasway-test-imagen.png"
image = Image.new("RGB", (1280, 720), "#F7F4E9")
draw = ImageDraw.Draw(image)
font_file = Path("C:/Windows/Fonts/arial.ttf")
font = ImageFont.truetype(str(font_file), 44)
small = ImageFont.truetype(str(font_file), 30)
draw.text((64, 50), "GASWAY TEST - IMAGEN FICTICIA", fill="#153D2D", font=font)
draw.rectangle((190, 200, 780, 470), fill="#153D2D")
draw.rectangle((790, 290, 1050, 470), fill="#91A061")
draw.rectangle((830, 310, 1000, 370), fill="#F7F4E9")
for center_x in [340, 900]:
    draw.ellipse((center_x-62, 420, center_x+62, 544), fill="#242A24")
draw.rectangle((730, 555, 1110, 642), fill="white", outline="#153D2D", width=4)
draw.text((775, 568), "ZZ9999", fill="#153D2D", font=font)
draw.text((64, 575), "DEMO - SIN VALIDEZ", fill="#153D2D", font=small)
draw.text((64, 660), "Prueba de carga. No es una fotografia real del vehiculo.", fill="#153D2D", font=small)
image.save(photo)
files.append(photo)
readme = output / "LEEME-GASWAY-TEST.txt"
readme.write_text(
    "Archivos ficticios, solo Gasway Test.\n"
    f"Vigente: usar {valid_until.isoformat()} como vencimiento.\n"
    f"Vencido: usar {expired_on.isoformat()} como vencimiento.\n"
    "Imagen: ilustracion con patente ZZ9999; no es una foto real.\n"
    "Elige el tipo de documento en la app. El mismo PDF puede usarse para varios tipos.\n"
    "Carga como responsable nacho.rtk@gmail.com y revisa como ig.cisternas.dev@gmail.com.\n"
    "No usar estos archivos en produccion ni para acreditar habilitacion real.\n",
    encoding="utf-8",
)
files.append(readme)
archive = output / "gasway-test-archivos-demo.zip"
with ZipFile(archive, "w", compression=ZIP_DEFLATED) as package:
    for path in files:
        package.write(path, path.name)
print(f"Fixtures: {archive}")
print(f"Fechas de ejemplo: vigente={valid_until.isoformat()}, vencido={expired_on.isoformat()}")
