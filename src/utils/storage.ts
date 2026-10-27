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
  createdAt?: string;
  isSubscribed?: boolean;
  canDownload?: boolean;
  daysActive?: number;
  daysRemaining?: number;
  isTrialExpired?: boolean;
  photosPurged?: boolean;
  subscriptionPlan?: string;
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

// ==========================================
// PENGELOLAAN STATUS BERLANGGANAN (LOCAL CACHE & SYNC)
// ==========================================

export interface UserSubscriptionData {
  isSubscribed: boolean;
  planId?: string;
  planName?: string;
  expiresAt?: string;
  canDownload?: boolean;
}

export function getUserSubscription(userEmail?: string): UserSubscriptionData {
  if (!userEmail) return { isSubscribed: false, canDownload: false };
  const key = `kenanganqr-sub-${userEmail.trim().toLowerCase()}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { isSubscribed: false, canDownload: false };
    const data = JSON.parse(raw);
    if (data.expiresAt && new Date(data.expiresAt).getTime() > Date.now()) {
      return {
        isSubscribed: true,
        planId: data.planId,
        planName: data.planName,
        expiresAt: data.expiresAt,
        canDownload: true,
      };
    }
  } catch {}
  return { isSubscribed: false, canDownload: false };
}

export function saveUserSubscription(
  userEmail: string,
  sub: { planId: string; planName: string; durationDays: number }
): void {
  const cleanEmail = userEmail.trim().toLowerCase();
  const key = `kenanganqr-sub-${cleanEmail}`;
  const expiresAt = new Date(
    Date.now() + sub.durationDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const data = {
    isSubscribed: true,
    planId: sub.planId,
    planName: sub.planName,
    expiresAt,
    canDownload: true,
  };
  localStorage.setItem(key, JSON.stringify(data));

  // Trigger event agar UI komponen lain yang sedang aktif langsung sinkron tanpa perlu refresh manual
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("kenanganqr-subscription-updated", {
        detail: { email: cleanEmail, ...data },
      })
    );
  }
}

export async function fetchSubscriptionStatus(
  userEmail: string
): Promise<UserSubscriptionData> {
  const cleanEmail = (userEmail || "").trim().toLowerCase();
  if (!cleanEmail) {
    return { isSubscribed: false, canDownload: false };
  }

  const token = getAccessToken();

  try {
    const res = await fetch(`/api/subscription/status?email=${encodeURIComponent(cleanEmail)}`, {
      headers: {
        "x-user-email": cleanEmail,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.isSubscribed) {
        saveUserSubscription(cleanEmail, {
          planId: data.plan || "basic",
          planName: data.planName || "Paket Berlangganan",
          durationDays: data.durationDays || 7,
        });

        return {
          isSubscribed: true,
          planId: data.plan,
          planName: data.planName,
          expiresAt: data.expiresAt,
          canDownload: true,
        };
      } else {
        // Jika server mengembalikan false, cek apakah cache lokal masih valid aktif
        const cached = getUserSubscription(cleanEmail);
        if (cached.isSubscribed) {
          return cached;
        }

        return {
          isSubscribed: false,
          planId: "free",
          planName: undefined,
          canDownload: false,
        };
      }
    }
  } catch (err) {
    console.warn("Gagal fetch subscription status dari server:", err);
  }

  return getUserSubscription(cleanEmail);
}
