const PDFDocument = require('pdfkit');

const NOMBRE_NEGOCIO = process.env.NOMBRE_NEGOCIO || 'FerroStock';
const CUIT_NEGOCIO = process.env.CUIT_NEGOCIO || '';
const DIRECCION_NEGOCIO = process.env.DIRECCION_NEGOCIO || '';

const fmtMoney = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });

/**
 * Genera el PDF de la factura de un pedido y lo escribe directamente
 * sobre el stream de respuesta (res) de Express.
 */
function generarFacturaPDF(pedido, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const numeroStr = String(pedido.numero_factura).padStart(8, '0');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="factura-${numeroStr}.pdf"`);
  doc.pipe(res);

  // ---------- Encabezado ----------
  doc.fontSize(20).font('Helvetica-Bold').text(NOMBRE_NEGOCIO, 50, 50);
  doc.fontSize(9).font('Helvetica').fillColor('#555');
  if (DIRECCION_NEGOCIO) doc.text(DIRECCION_NEGOCIO);
  if (CUIT_NEGOCIO) doc.text(`CUIT: ${CUIT_NEGOCIO}`);
  doc.fillColor('#000');

  doc.fontSize(14).font('Helvetica-Bold').text(`FACTURA N.° ${numeroStr}`, 350, 50, { align: 'right' });
  doc.fontSize(9).font('Helvetica').text(`Fecha: ${fmtDate(pedido.fecha_pedido)}`, 350, 70, { align: 'right' });
  doc.text(`Estado del pedido: ${pedido.estado}`, 350, 84, { align: 'right' });

  doc.moveTo(50, 110).lineTo(545, 110).strokeColor('#cccccc').stroke();

  // ---------- Datos del cliente ----------
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#000').text('Cliente', 50, 125);
  doc.fontSize(10).font('Helvetica');
  doc.text(`Nombre: ${pedido.cliente.nombre}`, 50, 142);
  if (pedido.cliente.dni) doc.text(`DNI: ${pedido.cliente.dni}`, 50, 158);
  doc.text(`Correo: ${pedido.cliente.correo}`, 300, 142);
  if (pedido.cliente.telefono) doc.text(`Teléfono: ${pedido.cliente.telefono}`, 300, 158);
  if (pedido.cliente.direccion) doc.text(`Dirección: ${pedido.cliente.direccion}`, 50, 174);

  // ---------- Tabla de productos ----------
  let y = 205;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#cccccc').stroke();
  y += 8;

  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('Producto', 50, y, { width: 230 });
  doc.text('Cant.', 285, y, { width: 50, align: 'right' });
  doc.text('Precio unit.', 340, y, { width: 90, align: 'right' });
  doc.text('Subtotal', 445, y, { width: 100, align: 'right' });
  y += 16;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#cccccc').stroke();
  y += 8;

  doc.font('Helvetica').fontSize(9.5);
  pedido.productos.forEach((item) => {
    const subtotal = item.precio_unitario * item.cantidad;
    doc.text(item.nombre, 50, y, { width: 230 });
    doc.text(String(item.cantidad), 285, y, { width: 50, align: 'right' });
    doc.text(fmtMoney(item.precio_unitario), 340, y, { width: 90, align: 'right' });
    doc.text(fmtMoney(subtotal), 445, y, { width: 100, align: 'right' });
    y += 20;
  });

  y += 5;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#cccccc').stroke();
  y += 15;

  doc.font('Helvetica-Bold').fontSize(12);
  doc.text('TOTAL', 340, y, { width: 90, align: 'right' });
  doc.text(fmtMoney(pedido.total), 445, y, { width: 100, align: 'right' });

  // ---------- Pie ----------
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#888')
    .text('Documento generado automáticamente por el sistema de gestión.', 50, 760, {
      width: 495,
      align: 'center',
    });

  doc.end();
}

module.exports = { generarFacturaPDF };
