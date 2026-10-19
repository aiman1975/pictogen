// A PDF made in the browser, offline and with no library: one picture per A4 page (JPEG images, as
// PDF readers and printers show them directly). Used for printable worksheets (worksheet.js).

const A4 = { w: 595.28, h: 841.89 }; // points

/**
 * jpegPdf([{ jpeg: Uint8Array, width, height }], { title }) -> Blob (application/pdf): each picture
 * fills one A4 page.
 */
export function jpegPdf(pages, { title = 'Worksheet' } = {}) {
  const enc = new TextEncoder();
  const parts = [];
  const offsets = [];
  let size = 0;
  const add = (chunk) => {
    const bytes = typeof chunk === 'string' ? enc.encode(chunk) : chunk;
    parts.push(bytes);
    size += bytes.length;
  };
  const obj = (n, body) => {
    offsets[n] = size;
    add(`${n} 0 obj\n`);
    for (const b of [].concat(body)) add(b);
    add('\nendobj\n');
  };
  // Objects: 1 catalog, 2 page tree, 3 info, then per page: page, contents, image
  const pageIds = pages.map((_, i) => 4 + i * 3);
  add('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  const safe = String(title).replace(/[\\()]/g, '\\$&').replace(/[^\x20-\x7e]/g, '?').slice(0, 120);
  obj(3, `<< /Title (${safe}) /Producer (PictoGen) >>`);
  pages.forEach((pg, i) => {
    const id = pageIds[i];
    const draw = `q ${A4.w} 0 0 ${A4.h} 0 0 cm /Im${i} Do Q`;
    obj(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /XObject << /Im${i} ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>`);
    obj(id + 1, [`<< /Length ${draw.length} >>\nstream\n`, draw, '\nendstream']);
    obj(id + 2, [`<< /Type /XObject /Subtype /Image /Width ${pg.width} /Height ${pg.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.jpeg.length} >>\nstream\n`, pg.jpeg, '\nendstream']);
  });
  const count = 4 + pages.length * 3;
  const xref = size;
  let table = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let n = 1; n < count; n++) table += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
  add(table);
  add(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: 'application/pdf' });
}

/** An SVG page drawn onto a canvas: { canvas } at `scale` times its size, on white */
export async function rasterize(svg, scale = 2) {
  const w = +(svg.match(/width="([\d.]+)"/)?.[1] ?? 794), h = +(svg.match(/height="([\d.]+)"/)?.[1] ?? 1123);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    img.decoding = 'sync';
    await new Promise((ok, fail) => { img.onload = ok; img.onerror = () => fail(new Error('the page could not be drawn')); img.src = url; });
    // (the fonts inside the page need a moment the first time)
    await new Promise((r) => setTimeout(r, 60));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** SVG pages -> a PDF Blob, each page a JPEG at `scale` (2: about 190 dpi on A4) */
export async function pagesToPdf(svgs, { title, scale = 2, quality = 0.9 } = {}) {
  const pages = [];
  for (const svg of svgs) {
    const canvas = await rasterize(svg, scale);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
    pages.push({ jpeg: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height });
  }
  return jpegPdf(pages, { title });
}
