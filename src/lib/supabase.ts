import { createClient } from "@supabase/supabase-js";
import type { Gallery, GalleryPhoto, GalleryMessage } from "../utils/storage";

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith("http") &&
    !supabaseUrl.includes("your-project")
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

import {
  fetchGalleries,
  fetchGalleryById,
  saveGallery,
  addPhoto,
  addMessage,
  deletePhoto,
  deleteMessage,
} from "./api";

// ==========================================
// SUPABASE & EXPRESS BACKEND OPERATIONS
// ==========================================

export async function fetchAllGalleriesFromSupabase(
  userEmail?: string
): Promise<Gallery[]> {
  // 1. Coba ambil melalui Express Backend API terlebih dahulu jika ada
  const apiData = await fetchGalleries(userEmail);
  if (apiData !== null) {
    if (userEmail) {
      const lower = userEmail.trim().toLowerCase();
      return apiData.filter((g) => g.userEmail && g.userEmail.toLowerCase() === lower);
    }
    return apiData;
  }

  // 2. Fallback langsung ke Supabase jika server Express belum berjalan
  if (!supabase) return [];

  try {
    let query = supabase
      .from("galleries")
      .select("*, gallery_photos(*), gallery_messages(*)")
      .order("created_at", { ascending: false });

    // HANYA AMBIL GALERI MILIK USER YANG SEDANG LOGIN
    if (userEmail && userEmail.trim().length > 0) {
      query = query.eq("user_email", userEmail.trim().toLowerCase());
    }

    const { data, error } = await query;

    if (error || !data) return [];

    return data.map((g) => ({
      id: Number(g.id),
      userEmail: g.user_email || undefined,
      title: g.title,
      category: g.category,
      date: g.event_date,
      image: g.cover_image || "",
      description: g.description || "",
      allowGuestUploads: g.allow_guest_uploads,
      allowGuestMessages: g.allow_guest_messages,
      photos: (g.gallery_photos || []).length,
      messages: (g.gallery_messages || []).length,
      guests: 0,
      photosList: (g.gallery_photos || []).map(
        (p: { id: number; name: string; photo_url: string; uploader_name: string }) => ({
          id: p.id,
          name: p.name || "Foto",
          url: p.photo_url,
          uploaderName: p.uploader_name || "Tamu",
        })
      ),
      messagesList: (g.gallery_messages || []).map(
        (m: { id: number; sender_name: string; time_display: string; message: string }) => ({
          id: m.id,
          name: m.sender_name,
          time: m.time_display || "Hari ini",
          message: m.message,
        })
      ),
    }));
  } catch (err) {
    console.error("Gagal mengambil daftar galeri dari Supabase:", err);
    return [];
  }
}

export async function fetchGalleryFromSupabase(
  id: number,
  userEmail?: string
): Promise<Gallery | null> {
  // 1. Coba ambil dari Express Backend API
  const apiGallery = await fetchGalleryById(id, userEmail);
  if (apiGallery) return apiGallery;

  // 2. Fallback langsung ke Supabase
  if (!supabase) return null;

  try {
    const { data: gallery, error } = await supabase
      .from("galleries")
      .select("*, gallery_photos(*), gallery_messages(*)")
      .eq("id", id)
      .single();

    if (error || !gallery) return null;

    const photosList: GalleryPhoto[] = (gallery.gallery_photos || []).map(
      (p: { id: number; name: string; photo_url: string; uploader_name: string }) => ({
        id: p.id,
        name: p.name || "Foto Kenangan",
        url: p.photo_url,
        uploaderName: p.uploader_name || "Tamu",
      })
    );

    const messagesList: GalleryMessage[] = (gallery.gallery_messages || []).map(
      (m: { id: number; sender_name: string; time_display: string; message: string }) => ({
        id: m.id,
        name: m.sender_name,
        time: m.time_display || "Hari ini",
        message: m.message,
      })
    );

    return {
      id: Number(gallery.id),
      userEmail: gallery.user_email || undefined,
      title: gallery.title,
      category: gallery.category,
      date: gallery.event_date,
      image: gallery.cover_image || "",
      description: gallery.description || "",
      allowGuestUploads: gallery.allow_guest_uploads,
      allowGuestMessages: gallery.allow_guest_messages,
      photos: photosList.length,
      messages: messagesList.length,
      guests: 0,
      photosList,
      messagesList,
    };
  } catch (err) {
    console.error("Gagal mengambil galeri dari Supabase:", err);
    return null;
  }
}

export async function saveGalleryToSupabase(
  gallery: Gallery,
  userEmail?: string
): Promise<boolean> {
  // 1. Coba simpan melalui Express Backend API
  const apiSaved = await saveGallery(gallery);
  if (apiSaved) return true;

  // 2. Fallback langsung ke Supabase
  if (!supabase) return false;

  const emailToSave = (userEmail || gallery.userEmail || "").trim().toLowerCase();

  try {
    const { error } = await supabase.from("galleries").upsert({
      id: gallery.id,
      user_email: emailToSave || null,
      title: gallery.title,
      category: gallery.category,
      event_date: gallery.date,
      cover_image: gallery.image,
      description: gallery.description,
      allow_guest_uploads: gallery.allowGuestUploads,
      allow_guest_messages: gallery.allowGuestMessages,
    });

    if (error) {
      console.error("Error upsert gallery to Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Gagal menyimpan galeri ke Supabase:", err);
    return false;
  }
}

export async function deleteGalleryFromSupabase(
  galleryId: number,
  userEmail?: string
): Promise<boolean> {
  if (!supabase) return false;

  try {
    let query = supabase.from("galleries").delete().eq("id", galleryId);

    // Keamanan tambahan: pastikan hanya pemilik email yang bisa menghapus dari Supabase
    if (userEmail && userEmail.trim().length > 0) {
      query = query.eq("user_email", userEmail.trim().toLowerCase());
    }

    const { error } = await query;
    if (error) {
      console.error("Error deleting gallery from Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Gagal menghapus galeri dari Supabase:", err);
    return false;
  }
}

export async function addPhotoToSupabase(
  galleryId: number,
  photo: GalleryPhoto
): Promise<boolean> {
  // 1. Coba tambah melalui Express Backend API
  const apiAdded = await addPhoto(galleryId, photo);
  if (apiAdded) return true;

  // 2. Fallback langsung ke Supabase
  if (!supabase) return false;

  try {
    const { error } = await supabase.from("gallery_photos").insert({
      id: photo.id,
      gallery_id: galleryId,
      name: photo.name,
      photo_url: photo.url,
      uploader_name: photo.uploaderName || "Tamu",
    });

    if (error) {
      console.error("Error inserting photo to Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Gagal menambahkan foto ke Supabase:", err);
    return false;
  }
}

export async function addMessageToSupabase(
  galleryId: number,
  message: GalleryMessage
): Promise<boolean> {
  // 1. Coba tambah melalui Express Backend API
  const apiAdded = await addMessage(galleryId, message);
  if (apiAdded) return true;

  // 2. Fallback langsung ke Supabase
  if (!supabase) return false;

  try {
    const { error } = await supabase.from("gallery_messages").insert({
      id: message.id,
      gallery_id: galleryId,
      sender_name: message.name,
      message: message.message,
      time_display: message.time || "Baru saja",
    });

    if (error) {
      console.error("Error inserting message to Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Gagal menambahkan pesan ke Supabase:", err);
    return false;
  }
}

export async function deletePhotoFromSupabase(
  galleryId: number,
  photoId: number
): Promise<boolean> {
  // 1. Coba hapus melalui Express Backend API
  const apiDeleted = await deletePhoto(galleryId, photoId);
  if (apiDeleted) return true;

  // 2. Fallback langsung ke Supabase
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from("gallery_photos")
      .delete()
      .eq("id", photoId)
      .eq("gallery_id", galleryId);

    if (error) {
      console.error("Error deleting photo from Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Gagal menghapus foto dari Supabase:", err);
    return false;
  }
}

export async function deleteMessageFromSupabase(
  galleryId: number,
  messageId: number
): Promise<boolean> {
  // 1. Coba hapus melalui Express Backend API
  const apiDeleted = await deleteMessage(galleryId, messageId);
  if (apiDeleted) return true;

  // 2. Fallback langsung ke Supabase
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from("gallery_messages")
      .delete()
      .eq("id", messageId)
      .eq("gallery_id", galleryId);

    if (error) {
      console.error("Error deleting message from Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Gagal menghapus pesan dari Supabase:", err);
    return false;
  }
}

export async function uploadImageToSupabase(
  file: File,
  folder = "uploads"
): Promise<string | null> {
  if (!supabase) return null;

  try {
    const ext = file.name.split(".").pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("gallery-media")
      .upload(fileName, file);

    if (uploadError) {
      console.error("Gagal upload media ke Supabase Storage:", uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from("gallery-media")
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (err) {
    console.error("Error uploading image:", err);
    return null;
  }
}
