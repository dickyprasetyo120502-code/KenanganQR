import type { Gallery, GalleryPhoto, GalleryMessage } from "../utils/storage";

const API_BASE = "/api";

/**
 * Cek status server Express dan database
 */
export async function checkServerHealth(): Promise<{
  ok: boolean;
  status?: string;
  database?: string;
  dbStatus?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return {
      ok: true,
      status: data.status,
      database: data.database,
      dbStatus: data.dbStatus,
    };
  } catch {
    return { ok: false };
  }
}

/**
 * Ambil semua galeri dari backend Express
 */
export async function fetchGalleries(): Promise<Gallery[] | null> {
  try {
    const res = await fetch(`${API_BASE}/galleries`);
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch (err) {
    console.warn("Express API tidak dapat dijangkau, menggunakan fallback:", err);
    return null;
  }
}

/**
 * Ambil satu galeri berdasarkan ID dari backend Express
 */
export async function fetchGalleryById(id: number): Promise<Gallery | null> {
  try {
    const res = await fetch(`${API_BASE}/galleries/${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`Gagal mengambil galeri #${id} dari Express:`, err);
    return null;
  }
}

/**
 * Simpan / buat galeri baru melalui backend Express
 */
export async function saveGallery(gallery: Gallery): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/galleries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(gallery),
    });
    return res.ok;
  } catch (err) {
    console.error("Gagal menyimpan galeri via Express:", err);
    return false;
  }
}

/**
 * Update data / pengaturan galeri via Express
 */
export async function updateGallery(id: number, updates: Partial<Gallery>): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/galleries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    return res.ok;
  } catch (err) {
    console.error("Gagal update galeri via Express:", err);
    return false;
  }
}

/**
 * Hapus galeri via Express
 */
export async function deleteGallery(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/galleries/${id}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch (err) {
    console.error("Gagal menghapus galeri via Express:", err);
    return false;
  }
}

/**
 * Tambah foto ke galeri via Express
 */
export async function addPhoto(
  galleryId: number,
  photo: GalleryPhoto
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/galleries/${galleryId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(photo),
    });
    return res.ok;
  } catch (err) {
    console.error("Gagal menambah foto via Express:", err);
    return false;
  }
}

/**
 * Tambah ucapan/pesan tamu ke galeri via Express
 */
export async function addMessage(
  galleryId: number,
  message: GalleryMessage
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/galleries/${galleryId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    return res.ok;
  } catch (err) {
    console.error("Gagal menambah pesan via Express:", err);
    return false;
  }
}

/**
 * Hapus foto dari galeri via Express
 */
export async function deletePhoto(
  galleryId: number,
  photoId: number
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/galleries/${galleryId}/photos/${photoId}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch (err) {
    console.error("Gagal menghapus foto via Express:", err);
    return false;
  }
}

/**
 * Hapus ucapan/pesan dari galeri via Express
 */
export async function deleteMessage(
  galleryId: number,
  messageId: number
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/galleries/${galleryId}/messages/${messageId}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch (err) {
    console.error("Gagal menghapus pesan via Express:", err);
    return false;
  }
}
