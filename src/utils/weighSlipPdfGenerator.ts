/**
 * Industrial Weighment Slip PDF Generator
 * Generates an official, standard-compliant vector PDF (A4 format)
 * with exact layout matching the Weighment Slip Preview (Save & Print F4).
 * 
 * Zero external dependencies, pure browser-native binary PDF generation.
 */

import { WeighSlip } from '@/types/weighbridge';

interface ImageAsset {
  name: string;
  bytes: Uint8Array;
  width: number;
  height: number;
}

// Escape PDF string for Type 1 Helvetica / Courier fonts
function escapePdfText(text: any): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/₹/g, 'Rs. ');
}

// Convert top-down (x, y) to PDF bottom-up coordinate system
function toPdfY(pageHeight: number, y: number, h: number = 0): string {
  return (pageHeight - y - h).toFixed(2);
}

// Asynchronously load an image URL and convert it to JPEG bytes for embedding
async function fetchImageAsJpeg(url: string, maxDim: number = 400): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const naturalW = img.naturalWidth || img.width || 320;
          const naturalH = img.naturalHeight || img.height || 240;
          let w = naturalW;
          let h = naturalH;
          if (w > maxDim || h > maxDim) {
            const ratio = Math.min(maxDim / w, maxDim / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const parts = dataUrl.split(',');
          if (parts.length < 2) {
            resolve(null);
            return;
          }
          const binaryStr = atob(parts[1]);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          resolve({ bytes, width: w, height: h });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

class PdfStreamBuilder {
  width: number;
  height: number;
  stream: string[];
  images: ImageAsset[];

  constructor(width = 595.28, height = 841.89) {
    this.width = width;
    this.height = height;
    this.stream = [];
    this.images = [];
  }

  rect(
    x: number,
    y: number,
    w: number,
    h: number,
    fillRgb: [number, number, number] | null = null,
    strokeRgb: [number, number, number] | null = null,
    lineWidth = 1
  ) {
    let s = 'q\n';
    if (lineWidth) s += `${lineWidth} w\n`;
    if (strokeRgb) s += `${strokeRgb.map((c) => (c / 255).toFixed(3)).join(' ')} RG\n`;
    if (fillRgb) s += `${fillRgb.map((c) => (c / 255).toFixed(3)).join(' ')} rg\n`;
    s += `${x.toFixed(2)} ${toPdfY(this.height, y, h)} ${w.toFixed(2)} ${h.toFixed(2)} re\n`;
    if (fillRgb && strokeRgb) s += 'B\n';
    else if (fillRgb) s += 'f\n';
    else if (strokeRgb) s += 'S\n';
    s += 'Q\n';
    this.stream.push(s);
  }

  line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    strokeRgb: [number, number, number] = [0, 0, 0],
    lineWidth = 1
  ) {
    let s = `q\n${lineWidth} w\n`;
    s += `${strokeRgb.map((c) => (c / 255).toFixed(3)).join(' ')} RG\n`;
    s += `${x1.toFixed(2)} ${toPdfY(this.height, y1)} m ${x2.toFixed(2)} ${toPdfY(this.height, y2)} l S\nQ\n`;
    this.stream.push(s);
  }

  text(
    str: any,
    x: number,
    y: number,
    {
      font = '/F1',
      size = 10,
      color = [0, 0, 0] as [number, number, number],
      align = 'left' as 'left' | 'center' | 'right',
      width = 0,
    } = {}
  ) {
    const safeStr = escapePdfText(str);
    if (!safeStr) return;

    const charWidth = font.includes('Bold') ? size * 0.56 : size * 0.52;
    const estWidth = safeStr.length * charWidth;

    let drawX = x;
    if (align === 'center') {
      drawX = width ? x + (width - estWidth) / 2 : x - estWidth / 2;
    } else if (align === 'right') {
      drawX = width ? x + width - estWidth : x - estWidth;
    }

    let s = `q\nBT\n${font} ${size} Tf\n`;
    s += `${color.map((c) => (c / 255).toFixed(3)).join(' ')} rg\n`;
    s += `${drawX.toFixed(2)} ${toPdfY(this.height, y)} Td\n`;
    s += `(${safeStr}) Tj\nET\nQ\n`;
    this.stream.push(s);
  }

  drawWatermark(text = 'DUPLICATE') {
    const s = `q
0.90 0.90 0.92 rg
BT
/F2 64 Tf
0.7071 0.7071 -0.7071 0.7071 140 320 Tm
(${escapePdfText(text)}) Tj
ET
Q
`;
    this.stream.unshift(s);
  }

  addImage(jpegBytes: Uint8Array, width: number, height: number, x: number, y: number, drawW: number, drawH: number) {
    const imgIndex = this.images.length + 1;
    const imgName = `Im${imgIndex}`;
    this.images.push({
      name: imgName,
      bytes: jpegBytes,
      width,
      height,
    });

    const s = `q
${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${x.toFixed(2)} ${toPdfY(this.height, y, drawH)} cm
/${imgName} Do
Q
`;
    this.stream.push(s);
  }

  build(): Uint8Array {
    const content = this.stream.join('');
    const encoder = new TextEncoder();
    const contentBuf = encoder.encode(content);

    const objects: any[] = [];
    // 1: Catalog
    objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
    // 2: Pages
    objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');

    // Build XObject dictionary for images if any
    let xObjectDict = '';
    if (this.images.length > 0) {
      xObjectDict = ' /XObject << ';
      for (let i = 0; i < this.images.length; i++) {
        const objId = 9 + i;
        xObjectDict += `/${this.images[i].name} ${objId} 0 R `;
      }
      xObjectDict += '>>';
    }

    // 3: Page
    objects.push(
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.width} ${this.height}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R >>${xObjectDict} >> >>\nendobj`
    );

    // 4: Content Stream
    objects.push(`4 0 obj\n<< /Length ${contentBuf.length} >>\nstream\n${content}\nendstream\nendobj`);

    // Fonts: 5, 6, 7, 8
    objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj');
    objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj');
    objects.push('7 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>\nendobj');
    objects.push('8 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>\nendobj');

    // Images (IDs 9, 10, ...)
    for (let i = 0; i < this.images.length; i++) {
      const img = this.images[i];
      const objId = 9 + i;
      const header = `${objId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>\nstream\n`;
      const footer = '\nendstream\nendobj';
      objects.push({ header, bytes: img.bytes, footer });
    }

    // Binary assembly with exact byte offset xref table
    const chunks: Uint8Array[] = [];
    const headerChunk = encoder.encode('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    chunks.push(headerChunk);
    let currentOffset = headerChunk.length;

    const xrefOffsets = [0];

    for (let i = 0; i < objects.length; i++) {
      xrefOffsets.push(currentOffset);
      const obj = objects[i];
      if (typeof obj === 'string') {
        const buf = encoder.encode(obj + '\n');
        chunks.push(buf);
        currentOffset += buf.length;
      } else {
        const hBuf = encoder.encode(obj.header);
        const fBuf = encoder.encode(obj.footer + '\n');
        chunks.push(hBuf);
        chunks.push(obj.bytes);
        chunks.push(fBuf);
        currentOffset += hBuf.length + obj.bytes.length + fBuf.length;
      }
    }

    const startXref = currentOffset;
    let xrefSection = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objects.length; i++) {
      xrefSection += `${String(xrefOffsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    xrefSection += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
    chunks.push(encoder.encode(xrefSection));

    // Concatenate all chunks into a single Uint8Array
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const result = new Uint8Array(totalLength);
    let pos = 0;
    for (const chunk of chunks) {
      result.set(chunk, pos);
      pos += chunk.length;
    }
    return result;
  }
}

/**
 * Generates an official, beautifully structured Weighment Slip PDF.
 */
export async function generateWeighSlipPDF(slip: WeighSlip, company: any): Promise<Uint8Array> {
  const doc = new PdfStreamBuilder(595.28, 841.89); // Standard A4: 595.28 x 841.89 pt
  const pageWidth = 595.28;
  const margin = 28;
  const contentWidth = pageWidth - margin * 2; // 539.28 pt

  // Outer Border
  doc.rect(margin, margin, contentWidth, 785, [255, 255, 255], [30, 41, 59], 1.5);
  // Inner thin border
  doc.rect(margin + 3, margin + 3, contentWidth - 6, 779, null, [203, 213, 225], 0.75);

  let curY = margin + 14;

  // Duplicate Watermark
  if (slip.printOptions && slip.printOptions.printDuplicate) {
    doc.drawWatermark('DUPLICATE');
  }

  // 1. Header: WEIGHMENT SLIP
  doc.text('WEIGHMENT SLIP', margin, curY + 14, {
    font: '/F2',
    size: 17,
    color: [15, 23, 42],
    align: 'center',
    width: contentWidth,
  });
  curY += 24;

  // Title Divider Line
  doc.line(margin + 16, curY, margin + contentWidth - 16, curY, [15, 23, 42], 1.5);
  curY += 10;

  // 2. Company Details
  const firmName = (
    company?.firmName ||
    company?.companyName ||
    (slip.companyName && slip.companyName !== 'APARNA RMC & WEIGHBRIDGE' ? slip.companyName : '') ||
    'DHARANI COTTON MILLS'
  ).toUpperCase();

  doc.text(firmName, margin, curY + 14, {
    font: '/F2',
    size: 15,
    color: [15, 23, 42],
    align: 'center',
    width: contentWidth,
  });
  curY += 20;

  const address =
    company?.address ||
    (slip.companyAddress && slip.companyAddress !== 'Industrial Zone, Highway Bypass' ? slip.companyAddress : '') ||
    'Vikarabad, Hyderabad, Telangana - 500033';

  doc.text(address, margin, curY + 9, {
    font: '/F1',
    size: 8.5,
    color: [51, 65, 85],
    align: 'center',
    width: contentWidth,
  });
  curY += 14;

  const phone = company?.phone || slip.phoneNo || '+91 20 2712 8899';
  const license = company?.weighbridgeLicense || 'WB/2026/RMC-449';
  const gstin = company?.gstin || '27AAAAA0000A1Z5';
  const subInfo = `Phone: ${phone}   |   License: ${license}   |   GSTIN: ${gstin}`;

  doc.text(subInfo, margin, curY + 8, {
    font: '/F3',
    size: 8,
    color: [71, 85, 105],
    align: 'center',
    width: contentWidth,
  });

  // Scale specs on top-right
  const scaleModel = company?.scaleModel || 'VENTEK VMS-WB';
  const scaleCap = company?.scaleCapacity || '50,000 kg (50 MT)';
  doc.text(`Model: ${scaleModel}`, margin + contentWidth - 140, margin + 42, {
    font: '/F1',
    size: 7.5,
    color: [71, 85, 105],
  });
  doc.text(`Cap: ${scaleCap}`, margin + contentWidth - 140, margin + 53, {
    font: '/F1',
    size: 7.5,
    color: [71, 85, 105],
  });
  doc.text('ACCURACY CLASS III', margin + contentWidth - 140, margin + 65, {
    font: '/F2',
    size: 7.5,
    color: [17, 94, 89],
  });

  curY += 16;
  doc.line(margin + 16, curY, margin + contentWidth - 16, curY, [203, 213, 225], 0.75);
  curY += 8;

  // 3. Security Verification Strip
  doc.rect(margin + 16, curY, contentWidth - 32, 18, [241, 245, 249], [203, 213, 225], 0.75);
  doc.text('[ LEGAL METROLOGY CERTIFIED WEIGHBRIDGE ]', margin + 24, curY + 12, {
    font: '/F2',
    size: 7.5,
    color: [15, 23, 42],
  });
  const firstWeightKg = slip.firstWeight || 0;
  const authToken = `AUTH-WB-2026-TX${slip.transactionNo}-${(firstWeightKg % 997).toString().padStart(3, '0')}`;
  doc.text(`SECURITY TOKEN: ${authToken}`, margin + contentWidth - 220, curY + 12, {
    font: '/F4',
    size: 7.5,
    color: [15, 23, 42],
  });
  curY += 24;

  // 4. Transaction No Header
  doc.text('TRANSACTION NO:', margin + 16, curY + 10, { font: '/F2', size: 10, color: [71, 85, 105] });
  doc.text(`#${slip.transactionNo}`, margin + 125, curY + 11, { font: '/F2', size: 13, color: [15, 23, 42] });
  curY += 16;

  // 5. Two-column Metadata Box
  const gridX = margin + 16;
  const gridW = contentWidth - 32;
  const gridH = 148;
  doc.rect(gridX, curY, gridW, gridH, [248, 250, 252], [203, 213, 225], 0.75);

  const colW = gridW / 2;
  const rowH = 17;
  const leftX = gridX + 10;
  const rightX = gridX + colW + 10;

  const leftFields = [
    { label: 'Vehicle No:', val: slip.vehicleNo || slip.vehicleRegNo || '-', isBadge: true },
    { label: 'Party Name:', val: slip.partyName || '-' },
    { label: 'Product:', val: slip.product || slip.material || '-' },
    { label: 'Status:', val: (slip.status || 'Inward').toUpperCase(), isStatus: true },
    { label: 'LocationName:', val: slip.locationName || '-' },
    { label: 'CultivatorName:', val: slip.cultivatorName || '-' },
    { label: 'LoadSlipNo:', val: slip.loadSlipNo || '-' },
    { label: 'BagsBales:', val: slip.bagsBales || '-' },
  ];

  const rightFields = [
    { label: 'Charges:', val: slip.charges ? `Rs. ${Number(slip.charges).toLocaleString()}` : '-' },
    { label: 'Rate:', val: slip.rate ? `Rs. ${Number(slip.rate).toLocaleString()}` : '-' },
    { label: 'Moisture:', val: slip.moisture ? `${slip.moisture} %` : '-' },
    { label: 'ChessNo:', val: slip.chessNo || '-' },
    { label: 'ChessName:', val: slip.chessName || '-' },
    { label: 'ChessAmount:', val: slip.chessAmount ? `Rs. ${Number(slip.chessAmount).toLocaleString()}` : '-' },
    { label: 'Village:', val: slip.village || '-' },
    { label: 'MobileNo:', val: slip.mobileNo || '-' },
  ];

  for (let i = 0; i < 8; i++) {
    const rowY = curY + 6 + i * rowH;

    // Left Column Item
    const lf = leftFields[i];
    doc.text(lf.label, leftX, rowY + 11, { font: '/F2', size: 8, color: [51, 65, 85] });
    if (lf.isBadge) {
      doc.rect(leftX + 75, rowY + 1, 95, 13, [15, 23, 42], null);
      doc.text(lf.val, leftX + 80, rowY + 10, { font: '/F4', size: 8.5, color: [255, 255, 255] });
    } else if (lf.isStatus) {
      doc.rect(leftX + 75, rowY + 1, 65, 13, [209, 250, 229], [110, 231, 183], 0.5);
      doc.text(lf.val, leftX + 80, rowY + 10, { font: '/F2', size: 7.5, color: [6, 95, 70] });
    } else {
      doc.text(lf.val, leftX + 75, rowY + 11, { font: '/F1', size: 8, color: [15, 23, 42] });
    }
    if (i < 7) {
      doc.line(leftX, rowY + rowH - 1, leftX + colW - 20, rowY + rowH - 1, [226, 232, 240], 0.5);
    }

    // Right Column Item
    const rf = rightFields[i];
    doc.text(rf.label, rightX, rowY + 11, { font: '/F2', size: 8, color: [51, 65, 85] });
    doc.text(rf.val, rightX + 70, rowY + 11, { font: '/F1', size: 8, color: [15, 23, 42] });
    if (i < 7) {
      doc.line(rightX, rowY + rowH - 1, rightX + colW - 20, rowY + rowH - 1, [226, 232, 240], 0.5);
    }
  }

  curY += gridH + 12;

  // 6. Weighment Parameters Table
  const tableX = margin + 16;
  const tableW = contentWidth - 32;
  const tHeaderH = 20;
  const tRowH = 22;

  // Header background
  doc.rect(tableX, curY, tableW, tHeaderH, [15, 23, 42], null);

  const colParamW = 160;
  const colDateW = 85;
  const colTimeW = 85;
  const colKgW = 95;

  doc.text('WEIGHMENT PARAMETER', tableX + 8, curY + 13, { font: '/F2', size: 8, color: [255, 255, 255] });
  doc.text('DATE', tableX + colParamW + 8, curY + 13, { font: '/F2', size: 8, color: [255, 255, 255] });
  doc.text('TIME', tableX + colParamW + colDateW + 8, curY + 13, { font: '/F2', size: 8, color: [255, 255, 255] });
  doc.text('WEIGHT (KG)', tableX + colParamW + colDateW + colTimeW + colKgW - 8, curY + 13, {
    font: '/F2',
    size: 8,
    color: [255, 255, 255],
    align: 'right',
  });
  doc.text('QTL (QUINTAL)', tableX + tableW - 8, curY + 13, {
    font: '/F2',
    size: 8,
    color: [255, 255, 255],
    align: 'right',
  });

  curY += tHeaderH;

  // Row 1: 1st Weight
  const firstDate = slip.firstWeightDate || '19/11/2026';
  const firstTime = slip.firstWeightTime || '15:19:57';
  const firstKg = `${(slip.firstWeight || 0).toLocaleString()} kg`;
  const firstQtl = `${((slip.firstWeight || 0) / 100).toFixed(2)} Qtl`;

  doc.rect(tableX, curY, tableW, tRowH, [255, 255, 255], [203, 213, 225], 0.5);
  doc.text('1st Weight', tableX + 8, curY + 14, { font: '/F2', size: 8.5, color: [15, 23, 42] });
  doc.text(firstDate, tableX + colParamW + 8, curY + 14, { font: '/F1', size: 8.5, color: [51, 65, 85] });
  doc.text(firstTime, tableX + colParamW + colDateW + 8, curY + 14, { font: '/F1', size: 8.5, color: [51, 65, 85] });
  doc.text(firstKg, tableX + colParamW + colDateW + colTimeW + colKgW - 8, curY + 14, {
    font: '/F2',
    size: 9,
    color: [15, 23, 42],
    align: 'right',
  });
  doc.text(firstQtl, tableX + tableW - 8, curY + 14, {
    font: '/F1',
    size: 8.5,
    color: [30, 41, 59],
    align: 'right',
  });
  curY += tRowH;

  // Row 2: 2nd Weight
  const secondWeightKg = slip.secondWeight || 0;
  const secondDate = secondWeightKg > 0 ? slip.secondWeightDate || '-' : '-';
  const secondTime = secondWeightKg > 0 ? slip.secondWeightTime || '-' : '-';
  const secondKg = secondWeightKg > 0 ? `${secondWeightKg.toLocaleString()} kg` : '-';
  const secondQtl = secondWeightKg > 0 ? `${(secondWeightKg / 100).toFixed(2)} Qtl` : '-';

  doc.rect(tableX, curY, tableW, tRowH, [255, 255, 255], [203, 213, 225], 0.5);
  doc.text('2nd Weight', tableX + 8, curY + 14, { font: '/F2', size: 8.5, color: [15, 23, 42] });
  doc.text(secondDate, tableX + colParamW + 8, curY + 14, { font: '/F1', size: 8.5, color: [51, 65, 85] });
  doc.text(secondTime, tableX + colParamW + colDateW + 8, curY + 14, { font: '/F1', size: 8.5, color: [51, 65, 85] });
  doc.text(secondKg, tableX + colParamW + colDateW + colTimeW + colKgW - 8, curY + 14, {
    font: '/F2',
    size: 9,
    color: [15, 23, 42],
    align: 'right',
  });
  doc.text(secondQtl, tableX + tableW - 8, curY + 14, {
    font: '/F1',
    size: 8.5,
    color: [30, 41, 59],
    align: 'right',
  });
  curY += tRowH;

  // Row 3: Nett Weight (Highlighted Row)
  const nettWeightKg =
    slip.nettWeight !== undefined
      ? slip.nettWeight
      : slip.netWeight || Math.abs(secondWeightKg - (slip.firstWeight || 0));
  const nettKg = `${nettWeightKg.toLocaleString()} kg`;
  const nettQtl = `${(nettWeightKg / 100).toFixed(2)} Qtl`;
  const nettDate = secondWeightKg > 0 ? secondDate : firstDate;
  const nettTime = secondWeightKg > 0 ? secondTime : firstTime;

  doc.rect(tableX, curY, tableW, tRowH + 2, [254, 249, 195], [15, 23, 42], 1.25);
  doc.text('Nett Weight (|1st - 2nd|)', tableX + 8, curY + 15, { font: '/F2', size: 9, color: [113, 63, 18] });
  doc.text(nettDate, tableX + colParamW + 8, curY + 15, { font: '/F1', size: 8.5, color: [15, 23, 42] });
  doc.text(nettTime, tableX + colParamW + colDateW + 8, curY + 15, { font: '/F1', size: 8.5, color: [15, 23, 42] });
  doc.text(nettKg, tableX + colParamW + colDateW + colTimeW + colKgW - 8, curY + 15, {
    font: '/F2',
    size: 10,
    color: [113, 63, 18],
    align: 'right',
  });
  doc.text(nettQtl, tableX + tableW - 8, curY + 15, {
    font: '/F2',
    size: 9.5,
    color: [113, 63, 18],
    align: 'right',
  });
  curY += tRowH + 10;

  // 7. Commercial Breakdown (Charges, Rate, Total)
  if (slip.totalAmount || slip.charges || slip.rate) {
    doc.rect(tableX, curY, tableW, 24, [248, 250, 252], [203, 213, 225], 0.75);
    const cColW = tableW / 3;
    const rateVal = slip.finalRate || slip.rate || 0;
    const chargesVal = (slip.charges || 0) + (slip.chessAmount || 0);
    const totalVal = slip.totalAmount || 0;

    doc.text(`RATE: Rs. ${Number(rateVal).toLocaleString()}`, tableX + 10, curY + 15, {
      font: '/F2',
      size: 8.5,
      color: [51, 65, 85],
    });
    doc.text(`CHARGES / CESS: Rs. ${Number(chargesVal).toLocaleString()}`, tableX + cColW + 10, curY + 15, {
      font: '/F2',
      size: 8.5,
      color: [51, 65, 85],
    });
    doc.text(`TOTAL AMOUNT: Rs. ${Number(totalVal).toLocaleString()}`, tableX + cColW * 2 + 10, curY + 15, {
      font: '/F2',
      size: 9.5,
      color: [17, 94, 89],
    });
    curY += 32;
  } else {
    curY += 8;
  }

  // 8. Camera Snapshots (if enabled and present)
  const showImages = slip.printOptions?.printImages ?? true;
  if (showImages && slip.evidence && slip.evidence.length > 0) {
    let photoX = tableX;
    const photoW = 100;
    const photoH = 65;

    for (let i = 0; i < Math.min(slip.evidence.length, 2); i++) {
      const ev = slip.evidence[i];
      const imgData = await fetchImageAsJpeg(ev.url);
      if (imgData) {
        doc.addImage(imgData.bytes, imgData.width, imgData.height, photoX, curY, photoW, photoH);
        doc.rect(photoX, curY, photoW, photoH, null, [148, 163, 184], 0.75);
        // Caption bar at bottom of photo
        doc.rect(photoX, curY + photoH - 12, photoW, 12, [15, 23, 42], null);
        const label = ev.angle === 'front' ? 'CAM 1 (ANPR)' : ev.angle === 'side' ? 'CAM 2 (DECK)' : `CAM ${i + 1}`;
        doc.text(label, photoX, curY + photoH - 3, {
          font: '/F4',
          size: 6.5,
          color: [255, 255, 255],
          align: 'center',
          width: photoW,
        });
        photoX += photoW + 14;
      }
    }
    curY += photoH + 12;
  }

  // 9. Signatures Block
  const sigY = curY + 36;
  const sigLineW = 140;

  // Cultivator / Driver signature
  doc.line(tableX + 20, sigY, tableX + 20 + sigLineW, sigY, [148, 163, 184], 1);
  doc.text('Cultivator / Driver', tableX + 20, sigY + 12, { font: '/F2', size: 8.5, color: [30, 41, 59] });
  doc.text('(Signature)', tableX + 20, sigY + 22, { font: '/F1', size: 7.5, color: [100, 116, 139] });

  // Operator signature
  const adminName = slip.adminName || slip.operatorName || 'System Admin';
  const opX = tableX + tableW - sigLineW - 20;
  doc.line(opX, sigY, opX + sigLineW, sigY, [148, 163, 184], 1);
  doc.text(adminName, opX, sigY - 4, { font: '/F2', size: 8.5, color: [15, 23, 42] });
  doc.text('Weighbridge Operator', opX, sigY + 12, { font: '/F2', size: 8.5, color: [30, 41, 59] });
  doc.text('Weighmaster / Authorized', opX, sigY + 22, { font: '/F1', size: 7.5, color: [100, 116, 139] });

  // 10. Statutory Disclaimer
  const disclaimerY = 841.89 - margin - 35;
  doc.line(margin + 16, disclaimerY, margin + contentWidth - 16, disclaimerY, [226, 232, 240], 0.75);
  const note =
    company?.weighSlipNotes ||
    'Certified under Legal Metrology Act, 2009. Scale calibrated and stamped by Govt. Inspector. Computer generated electronic ticket requires no manual stamp.';
  doc.text(note, margin, disclaimerY + 12, {
    font: '/F3',
    size: 6.8,
    color: [100, 116, 139],
    align: 'center',
    width: contentWidth,
  });

  return doc.build();
}

/**
 * Generates and triggers automatic download of the Weighment Slip PDF.
 */
export async function downloadWeighSlipPDF(
  slip: WeighSlip,
  company: any,
  customFilename?: string
): Promise<void> {
  const pdfBytes = await generateWeighSlipPDF(slip, company);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const vehicleSafe = (slip.vehicleNo || slip.vehicleRegNo || 'vehicle').replace(/\s+/g, '_');
  const filename = customFilename || `weighment_slip_${slip.transactionNo}_${vehicleSafe}.pdf`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
