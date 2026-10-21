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

export function getGalleries(): Gallery[] {
  try {
    const raw = localStorage.getItem(GALLERIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Gallery[]) : [];
  } catch {
    return [];
  }
}

export function saveGalleries(galleries: Gallery[]): void {
  localStorage.setItem(GALLERIES_KEY, JSON.stringify(galleries));
}

export function getGalleryById(id: number): Gallery | undefined {
  const list = getGalleries();
  return list.find((g) => g.id === id);
}

export function updateGallery(updated: Gallery): void {
  const list = getGalleries();
  const index = list.findIndex((g) => g.id === updated.id);
  if (index >= 0) {
    list[index] = updated;
  } else {
    list.unshift(updated);
  }
  saveGalleries(list);
}
