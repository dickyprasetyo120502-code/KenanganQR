export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
}

export interface GalleryPhoto {
  id: number;
  url: string;
  name: string;
  uploaderName?: string;
}

export interface GalleryMessage {
  id: number;
  name: string;
  time: string;
  message: string;
}

export interface Gallery {
  id: number;
  userEmail?: string;
  title: string;
  category: string;
  date: string;
  photos: number;
  messages: number;
  guests: number;
  image: string;
  description?: string;
  allowGuestUploads: boolean;
  allowGuestMessages: boolean;
  isNew?: boolean;
  photosList?: GalleryPhoto[];
  messagesList?: GalleryMessage[];
}

const USER_KEY = "kenanganqr-user";
const GALLERIES_KEY = "kenanganqr-galleries";

const ACCESS_TOKEN_KEY = "kenanganqr-access-token";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function saveAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function removeAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function getUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function saveUser(user: UserProfile): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeUser(): void {
  localStorage.removeItem(USER_KEY);
}

export function getGalleries(userEmail?: string): Gallery[] {
  try {
    const raw = localStorage.getItem(GALLERIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (!userEmail) return parsed as Gallery[];
    const lower = userEmail.trim().toLowerCase();
    return (parsed as Gallery[]).filter(
      (g) => g.userEmail && g.userEmail.toLowerCase() === lower
    );
  } catch {
    return [];
  }
}

export function saveGalleries(galleries: Gallery[], userEmail?: string): void {
  try {
    if (!userEmail) {
      localStorage.setItem(GALLERIES_KEY, JSON.stringify(galleries));
      return;
    }
    const lower = userEmail.trim().toLowerCase();
    const raw = localStorage.getItem(GALLERIES_KEY);
    const existing: Gallery[] = raw ? JSON.parse(raw) : [];
    // Pertahankan galeri milik user lain, perbarui galeri milik user ini
    const others = existing.filter(
      (g) => g.userEmail && g.userEmail.toLowerCase() !== lower
    );
    const currentWithEmail = galleries.map((g) => ({
      ...g,
      userEmail: g.userEmail || lower,
    }));
    localStorage.setItem(
      GALLERIES_KEY,
      JSON.stringify([...currentWithEmail, ...others])
    );
  } catch {
    // fallback
  }
}

export function getGalleryById(id: number): Gallery | undefined {
  try {
    const raw = localStorage.getItem(GALLERIES_KEY);
    if (!raw) return undefined;
    const list: Gallery[] = JSON.parse(raw);
    return Array.isArray(list) ? list.find((g) => g.id === id) : undefined;
  } catch {
    return undefined;
  }
}

export function updateGallery(updated: Gallery): void {
  try {
    const raw = localStorage.getItem(GALLERIES_KEY);
    const list: Gallery[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex((g) => g.id === updated.id);
    if (index >= 0) {
      list[index] = updated;
    } else {
      list.unshift(updated);
    }
    localStorage.setItem(GALLERIES_KEY, JSON.stringify(list));
  } catch {
    // Jika penyimpanan gagal (misal QuotaExceededError karena ada gambar base64 besar),
    // simpan versi bersih tanpa dataURL base64 berlebih agar state galeri tetap tersimpan
    try {
      const raw = localStorage.getItem(GALLERIES_KEY);
      const list: Gallery[] = raw ? JSON.parse(raw) : [];
      const sanitized = {
        ...updated,
        photosList: (updated.photosList || []).map((p) => ({
          ...p,
          url: p.url.startsWith("data:") ? "" : p.url,
        })),
      };
      const index = list.findIndex((g) => g.id === updated.id);
      if (index >= 0) {
        list[index] = sanitized;
      } else {
        list.unshift(sanitized);
      }
      localStorage.setItem(GALLERIES_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  }
}
