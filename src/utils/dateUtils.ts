/**
 * Helper utilitas untuk tanggal:
 * Memungkinkan pengguna mengetik tanggal sendiri (misal: "24 Oktober 2026", "24/10/2026", "2026-10-24")
 * ataupun memilih dari kalender / datepicker browser.
 */

const BULAN_INDONESIA = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function parseAndFormatDate(input: string): string {
  if (!input || !input.trim()) return "";
  const clean = input.trim();

  // 1. Format ISO YYYY-MM-DD (dari native datepicker)
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const parts = clean.split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (month >= 0 && month < 12 && day > 0 && day <= 31) {
      return `${day} ${BULAN_INDONESIA[month]} ${year}`;
    }
  }

  // 2. Format DD/MM/YYYY atau DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    if (month >= 0 && month < 12 && day > 0 && day <= 31) {
      return `${day} ${BULAN_INDONESIA[month]} ${year}`;
    }
  }

  // 3. Format Date standard JS
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900) {
    const d = parsed.getDate();
    const m = parsed.getMonth();
    const y = parsed.getFullYear();
    return `${d} ${BULAN_INDONESIA[m]} ${y}`;
  }

  // 4. Jika pengguna mengetik teks custom secara manual (misal: "Sabtu, 24 Oktober 2026")
  return clean;
}

export function toISODateString(input: string): string {
  if (!input) return "";
  const clean = input.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // Cek jika DD/MM/YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Cek apakah ada nama bulan Indonesia
  for (let i = 0; i < BULAN_INDONESIA.length; i++) {
    const b = BULAN_INDONESIA[i];
    if (clean.toLowerCase().includes(b.toLowerCase())) {
      const match = clean.match(/(\d{1,2})\s+[A-Za-z]+\s+(\d{4})/);
      if (match) {
        const day = match[1].padStart(2, "0");
        const month = String(i + 1).padStart(2, "0");
        const year = match[2];
        return `${year}-${month}-${day}`;
      }
    }
  }

  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return "";
}
