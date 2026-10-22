/**
 * Utility untuk membuat kartu desain QR Code yang cantik dan siap cetak (Standee / Meja Resepsi)
 */

export interface QRCardOptions {
  qrCanvas: HTMLCanvasElement;
  title: string;
  category?: string;
  eventDate?: string;
  guestUrl?: string;
}

export function drawDesignedQRCard(options: QRCardOptions): HTMLCanvasElement {
  const { qrCanvas, title, category = "Pernikahan", eventDate, guestUrl } = options;

  // Resolusi tinggi untuk cetak tajam (1200 x 1650 px)
  const width = 1200;
  const height = 1650;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) return canvas;

  // 1. BACKGROUND GRADIENT (Luxury warm ivory/champagne)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#fdfbf7");
  bgGrad.addColorStop(0.5, "#faf4ea");
  bgGrad.addColorStop(1, "#f4ece0");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. BORDER DEKORATIF GANDA (Gold Luxury Frame)
  ctx.save();
  // Outer Border
  ctx.strokeStyle = "#c89d3a";
  ctx.lineWidth = 6;
  roundRect(ctx, 40, 40, width - 80, height - 80, 32);
  ctx.stroke();

  // Inner Thin Border
  ctx.strokeStyle = "#e8c878";
  ctx.lineWidth = 2;
  roundRect(ctx, 55, 55, width - 110, height - 110, 24);
  ctx.stroke();

  // Corner Accent Diamonds
  drawCornerAccents(ctx, 55, 55, width - 110, height - 110);
  ctx.restore();

  // 3. TOP BRANDING PILL
  const brandPillY = 110;
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 2;
  ctx.shadowColor = "rgba(180, 140, 40, 0.15)";
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, width / 2 - 190, brandPillY, 380, 52, 26);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.stroke();

  ctx.fillStyle = "#946800";
  ctx.font = "bold 20px 'Cinzel', 'Playfair Display', 'Georgia', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("✦  KENANGAN QR  ✦", width / 2, brandPillY + 27);
  ctx.restore();

  // 4. EVENT TITLE (Elegant Serif)
  ctx.save();
  ctx.fillStyle = "#1e1b18";
  ctx.font = "bold 56px 'Playfair Display', 'Cinzel', 'Georgia', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // Wrap title jika panjang
  const titleY = 200;
  const maxTitleWidth = width - 200;
  const wrappedTitleLines = wrapText(ctx, title || "Momen Kenangan", maxTitleWidth);
  const titleLineHeight = 70;
  wrappedTitleLines.forEach((line, index) => {
    ctx.fillText(line, width / 2, titleY + index * titleLineHeight);
  });
  ctx.restore();

  // 5. EVENT CATEGORY & DATE BADGE
  const titleBottom = titleY + wrappedTitleLines.length * titleLineHeight + 15;
  ctx.save();
  ctx.fillStyle = "#8a661c";
  ctx.font = "500 24px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const dateFormatted = eventDate || "Hari Bahagia";
  ctx.fillText(`✦  ${category.toUpperCase()}  •  ${dateFormatted}  ✦`, width / 2, titleBottom);
  ctx.restore();

  // 6. KOTAK QR CODE BERDESAIN (The Designed Frame Box)
  const boxWidth = 660;
  const boxHeight = 760;
  const boxX = (width - boxWidth) / 2;
  const boxY = titleBottom + 65;

  ctx.save();
  // Bayangan mewah pada kartu QR
  ctx.shadowColor = "rgba(70, 50, 20, 0.16)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 36);
  ctx.fill();

  // Border Gold pada kotak QR
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "#deb857";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Border kedua halus di dalam kotak
  ctx.strokeStyle = "#f4ebd3";
  ctx.lineWidth = 2;
  roundRect(ctx, boxX + 16, boxY + 16, boxWidth - 32, boxHeight - 32, 26);
  ctx.stroke();

  // Sudut ornamen di dalam kotak QR
  drawBoxCornerOrnaments(ctx, boxX + 24, boxY + 24, boxWidth - 48, boxHeight - 48);
  ctx.restore();

  // 7. DRAW THE QR CODE
  const qrTargetSize = 510;
  const qrX = (width - qrTargetSize) / 2;
  const qrY = boxY + 55;
  ctx.drawImage(qrCanvas, qrX, qrY, qrTargetSize, qrTargetSize);

  // 8. SCAN ME BADGE (Pill di bawah QR di dalam kotak)
  const scanBadgeY = qrY + qrTargetSize + 40;
  ctx.save();
  const scanGrad = ctx.createLinearGradient(width / 2 - 140, 0, width / 2 + 140, 0);
  scanGrad.addColorStop(0, "#d8ab3e");
  scanGrad.addColorStop(1, "#b5871f");
  ctx.fillStyle = scanGrad;
  roundRect(ctx, width / 2 - 150, scanBadgeY, 300, 56, 28);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 23px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("📷  PINDAI SAYA  ✨", width / 2, scanBadgeY + 29);
  ctx.restore();

  // 9. INSTRUCTION TEXT (Di bawah kotak berdesain)
  const instruxY = boxY + boxHeight + 45;
  ctx.save();
  ctx.fillStyle = "#2c261e";
  ctx.font = "bold 28px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Buka Kamera HP & Arahkan ke QR Code", width / 2, instruxY);

  ctx.fillStyle = "#665846";
  ctx.font = "22px 'Inter', sans-serif";
  ctx.fillText("Lihat foto kenangan atau bagikan momen indahmu langsung di galeri", width / 2, instruxY + 42);
  ctx.restore();

  // 10. FOOTER DIVIDER & BRANDING
  const footerY = height - 120;
  ctx.save();
  // Garis divider
  ctx.strokeStyle = "#deb857";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 250, footerY);
  ctx.lineTo(width / 2 + 250, footerY);
  ctx.stroke();

  // Diamond center icon
  ctx.fillStyle = "#c89d3a";
  ctx.font = "18px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("✦  ❖  ✦", width / 2, footerY);

  // Teks website
  ctx.fillStyle = "#8a7356";
  ctx.font = "19px 'Inter', sans-serif";
  ctx.fillText(
    guestUrl ? guestUrl.replace(/^https?:\/\//, "") : "kenanganqr.com",
    width / 2,
    footerY + 36
  );
  ctx.restore();

  return canvas;
}

export function downloadDesignedQRCard(options: QRCardOptions, filename?: string): void {
  const designedCanvas = drawDesignedQRCard(options);
  const cleanTitle = (options.title || "KenanganQR").replace(/[^a-zA-Z0-9_-]/g, "_");
  const finalName = filename || `QR-Desain-${cleanTitle}.png`;

  const link = document.createElement("a");
  link.href = designedCanvas.toDataURL("image/png");
  link.download = finalName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==========================================
// HELPER DRAWING FUNCTIONS
// ==========================================

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function drawCornerAccents(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const size = 30;
  ctx.strokeStyle = "#c89d3a";
  ctx.lineWidth = 3;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(x + 10, y + size);
  ctx.lineTo(x + 10, y + 10);
  ctx.lineTo(x + size, y + 10);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(x + w - size, y + 10);
  ctx.lineTo(x + w - 10, y + 10);
  ctx.lineTo(x + w - 10, y + size);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(x + 10, y + h - size);
  ctx.lineTo(x + 10, y + h - 10);
  ctx.lineTo(x + size, y + h - 10);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(x + w - size, y + h - 10);
  ctx.lineTo(x + w - 10, y + h - 10);
  ctx.lineTo(x + w - 10, y + h - size);
  ctx.stroke();
}

function drawBoxCornerOrnaments(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const arm = 24;
  ctx.strokeStyle = "#c89d3a";
  ctx.lineWidth = 2.5;

  // 4 ornamental corners inside box
  ctx.beginPath();
  ctx.moveTo(x, y + arm);
  ctx.lineTo(x, y);
  ctx.lineTo(x + arm, y);

  ctx.moveTo(x + w - arm, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + arm);

  ctx.moveTo(x, y + h - arm);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + arm, y + h);

  ctx.moveTo(x + w - arm, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - arm);
  ctx.stroke();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = words[0] || "";

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}
