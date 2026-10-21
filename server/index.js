import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "./prisma.js";

// Muat environment variables dari .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Konfigurasi Supabase Storage & SDK (Untuk upload media & fallback)
const rawUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const supabaseKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "").trim();

const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseKey &&
    supabaseUrl.startsWith("http") &&
    !supabaseUrl.includes("your-project")
);

const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseKey) : null;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Request Logger
app.use((req, res, next) => {
  console.log(`[Express API] ${req.method} ${req.url}`);
  next();
});

// Helper: Memformat objek Galeri agar konsisten untuk Frontend React
function formatGalleryResponse(g) {
  const photos = g.photos || g.gallery_photos || [];
  const messages = g.messages || g.gallery_messages || [];

  return {
    id: Number(g.id),
    title: g.title,
    category: g.category,
    date: g.eventDate || g.event_date || "",
    image: g.coverImage || g.cover_image || "",
    description: g.description || "",
    allowGuestUploads: g.allowGuestUploads ?? g.allow_guest_uploads ?? true,
    allowGuestMessages: g.allowGuestMessages ?? g.allow_guest_messages ?? true,
    photos: photos.length,
    messages: messages.length,
    guests: 0,
    photosList: photos.map((p) => ({
      id: Number(p.id),
      name: p.name || "Foto Kenangan",
      url: p.photoUrl || p.photo_url,
      uploaderName: p.uploaderName || p.uploader_name || "Tamu",
    })),
    messagesList: messages.map((m) => ({
      id: Number(m.id),
      name: m.senderName || m.sender_name,
      time: m.timeDisplay || m.time_display || "Hari ini",
      message: m.message,
    })),
  };
}

// ==========================================
// 1. HEALTH CHECK & STATUS ENDPOINT
// ==========================================
app.get("/api/health", async (req, res) => {
  let prismaStatus = "Not Configured (DATABASE_URL belum diisi password)";
  let supabaseStatus = isSupabaseConfigured ? "Ready (Storage & Auth)" : "Not Configured";

  if (prisma) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      prismaStatus = "Connected to PostgreSQL via Prisma ORM";
    } catch (err) {
      prismaStatus = `Error: ${err.message}`;
    }
  }

  res.json({
    status: "ok",
    framework: "Express.js",
    database: "PostgreSQL (Prisma ORM + Supabase)",
    activeOrm: prisma ? "Prisma ORM (Primary)" : "Supabase Client (Fallback)",
    prismaStatus,
    supabaseStatus,
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 2. GALLERIES ENDPOINTS
// ==========================================

// GET /api/galleries - Ambil semua galeri beserta foto dan pesan
app.get("/api/galleries", async (req, res) => {
  if (!prisma && !supabase) {
    return res.status(503).json({
      error: "Database belum dikonfigurasi di file .env (Prisma atau Supabase)",
    });
  }

  try {
    if (prisma) {
      try {
        const galleries = await prisma.gallery.findMany({
          include: {
            photos: { orderBy: { createdAt: "asc" } },
            messages: { orderBy: { createdAt: "desc" } },
          },
          orderBy: { createdAt: "desc" },
        });
        return res.json(galleries.map(formatGalleryResponse));
      } catch (prismaErr) {
        console.warn("Prisma error on GET /api/galleries, falling back to Supabase client:", prismaErr.message);
      }
    }

    // Fallback: Supabase Client SDK
    if (!supabase) {
      return res.status(503).json({ error: "Layanan database tidak tersedia." });
    }

    const { data, error } = await supabase
      .from("galleries")
      .select("*, gallery_photos(*), gallery_messages(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching galleries via Supabase:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json((data || []).map(formatGalleryResponse));
  } catch (err) {
    console.error("Server error on GET /api/galleries:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/galleries/:id - Ambil satu galeri berdasarkan ID
app.get("/api/galleries/:id", async (req, res) => {
  if (!prisma && !supabase) {
    return res.status(503).json({ error: "Database belum dikonfigurasi" });
  }

  try {
    const rawId = req.params.id;

    if (prisma) {
      try {
        const gallery = await prisma.gallery.findUnique({
          where: { id: BigInt(rawId) },
          include: {
            photos: { orderBy: { createdAt: "asc" } },
            messages: { orderBy: { createdAt: "desc" } },
          },
        });

        if (gallery) {
          return res.json(formatGalleryResponse(gallery));
        }
      } catch (prismaErr) {
        console.warn(`Prisma error on GET /api/galleries/${rawId}, falling back to Supabase:`, prismaErr.message);
      }
    }

    // Fallback: Supabase Client SDK
    if (!supabase) {
      return res.status(503).json({ error: "Layanan database tidak tersedia." });
    }

    const { data: gallery, error } = await supabase
      .from("galleries")
      .select("*, gallery_photos(*), gallery_messages(*)")
      .eq("id", Number(rawId))
      .single();

    if (error || !gallery) {
      return res.status(404).json({ error: "Galeri tidak ditemukan" });
    }

    res.json(formatGalleryResponse(gallery));
  } catch (err) {
    console.error("Server error on GET /api/galleries/:id:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/galleries - Buat atau simpan galeri baru (Upsert)
app.post("/api/galleries", async (req, res) => {
  if (!prisma && !supabase) {
    return res.status(503).json({ error: "Database belum dikonfigurasi" });
  }

  try {
    const {
      id,
      title,
      category,
      date,
      image,
      description,
      allowGuestUploads,
      allowGuestMessages,
    } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: "Judul dan tanggal wajib diisi." });
    }

    const galleryId = BigInt(Math.floor(Number(id)) || Date.now());

    if (prisma) {
      try {
        const savedGallery = await prisma.gallery.upsert({
          where: { id: galleryId },
          update: {
            title,
            category: category || "Pernikahan",
            eventDate: date,
            coverImage: image || "",
            description: description || "",
            allowGuestUploads: allowGuestUploads !== false,
            allowGuestMessages: allowGuestMessages !== false,
          },
          create: {
            id: galleryId,
            title,
            category: category || "Pernikahan",
            eventDate: date,
            coverImage: image || "",
            description: description || "",
            allowGuestUploads: allowGuestUploads !== false,
            allowGuestMessages: allowGuestMessages !== false,
          },
          include: {
            photos: true,
            messages: true,
          },
        });

        return res.status(201).json({
          message: "Galeri berhasil disimpan via Prisma ORM!",
          gallery: formatGalleryResponse(savedGallery),
        });
      } catch (prismaErr) {
        console.warn("Prisma error on POST /api/galleries, falling back to Supabase:", prismaErr.message);
      }
    }

    // Fallback: Supabase Client SDK
    if (!supabase) {
      return res.status(503).json({ error: "Layanan database tidak tersedia." });
    }

    const { data, error } = await supabase
      .from("galleries")
      .upsert({
        id: Number(galleryId),
        title,
        category: category || "Pernikahan",
        event_date: date,
        cover_image: image || "",
        description: description || "",
        allow_guest_uploads: allowGuestUploads !== false,
        allow_guest_messages: allowGuestMessages !== false,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving gallery via Supabase:", error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({
      message: "Galeri berhasil disimpan ke PostgreSQL!",
      gallery: data,
    });
  } catch (err) {
    console.error("Server error on POST /api/galleries:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/galleries/:id - Update galeri (pengaturan, cover, dsb)
app.put("/api/galleries/:id", async (req, res) => {
  if (!prisma && !supabase) {
    return res.status(503).json({ error: "Database belum dikonfigurasi" });
  }

  try {
    const rawId = req.params.id;

    if (prisma) {
      try {
        const updates = {};
        if (req.body.title !== undefined) updates.title = req.body.title;
        if (req.body.category !== undefined) updates.category = req.body.category;
        if (req.body.date !== undefined) updates.eventDate = req.body.date;
        if (req.body.image !== undefined) updates.coverImage = req.body.image;
        if (req.body.description !== undefined) updates.description = req.body.description;
        if (req.body.allowGuestUploads !== undefined)
          updates.allowGuestUploads = req.body.allowGuestUploads;
        if (req.body.allowGuestMessages !== undefined)
          updates.allowGuestMessages = req.body.allowGuestMessages;

        const updated = await prisma.gallery.update({
          where: { id: BigInt(rawId) },
          data: updates,
          include: { photos: true, messages: true },
        });

        return res.json({
          message: "Galeri berhasil diperbarui via Prisma!",
          gallery: formatGalleryResponse(updated),
        });
      } catch (prismaErr) {
        console.warn(`Prisma error on PUT /api/galleries/${rawId}, falling back to Supabase:`, prismaErr.message);
      }
    }

    // Fallback: Supabase Client SDK
    if (!supabase) {
      return res.status(503).json({ error: "Layanan database tidak tersedia." });
    }

    const galleryId = Number(rawId);
    const updates = {};

    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.category !== undefined) updates.category = req.body.category;
    if (req.body.date !== undefined) updates.event_date = req.body.date;
    if (req.body.image !== undefined) updates.cover_image = req.body.image;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.allowGuestUploads !== undefined)
      updates.allow_guest_uploads = req.body.allowGuestUploads;
    if (req.body.allowGuestMessages !== undefined)
      updates.allow_guest_messages = req.body.allowGuestMessages;

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("galleries")
      .update(updates)
      .eq("id", galleryId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: "Galeri berhasil diperbarui!", gallery: data });
  } catch (err) {
    console.error("Server error on PUT /api/galleries/:id:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/galleries/:id - Hapus galeri
app.delete("/api/galleries/:id", async (req, res) => {
  if (!prisma && !supabase) {
    return res.status(503).json({ error: "Database belum dikonfigurasi" });
  }

  try {
    const rawId = req.params.id;

    if (prisma) {
      try {
        await prisma.gallery.delete({
          where: { id: BigInt(rawId) },
        });
        return res.json({ message: "Galeri berhasil dihapus via Prisma." });
      } catch (prismaErr) {
        console.warn(`Prisma error on DELETE /api/galleries/${rawId}, falling back to Supabase:`, prismaErr.message);
      }
    }

    // Fallback: Supabase Client SDK
    if (!supabase) {
      return res.status(503).json({ error: "Layanan database tidak tersedia." });
    }

    const { error } = await supabase
      .from("galleries")
      .delete()
      .eq("id", Number(rawId));

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: "Galeri berhasil dihapus dari database." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. PHOTOS ENDPOINTS
// ==========================================

// POST /api/galleries/:id/photos - Tambahkan foto baru ke galeri
app.post("/api/galleries/:id/photos", async (req, res) => {
  if (!prisma && !supabase) {
    return res.status(503).json({ error: "Database belum dikonfigurasi" });
  }

  try {
    const rawId = req.params.id;
    const { id, url, name, uploaderName } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL atau file foto wajib disertakan." });
    }

    const photoId = BigInt(Math.floor(Number(id)) || Date.now());

    if (prisma) {
      try {
        const photo = await prisma.galleryPhoto.create({
          data: {
            id: photoId,
            galleryId: BigInt(rawId),
            photoUrl: url,
            name: name || "Foto Kenangan",
            uploaderName: uploaderName || "Tamu",
          },
        });

        return res.status(201).json({
          message: "Foto berhasil disimpan via Prisma!",
          photo: {
            id: Number(photo.id),
            name: photo.name,
            url: photo.photoUrl,
            uploaderName: photo.uploaderName,
          },
        });
      } catch (prismaErr) {
        console.warn("Prisma error on POST photo, falling back to Supabase:", prismaErr.message);
      }
    }

    // Fallback: Supabase Client SDK
    if (!supabase) {
      return res.status(503).json({ error: "Layanan database tidak tersedia." });
    }

    const { data, error } = await supabase
      .from("gallery_photos")
      .insert({
        id: Number(photoId),
        gallery_id: Number(rawId),
        photo_url: url,
        name: name || "Foto Kenangan",
        uploader_name: uploaderName || "Tamu",
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting photo via Supabase:", error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({
      message: "Foto berhasil disimpan ke database!",
      photo: data,
    });
  } catch (err) {
    console.error("Server error on POST photo:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/galleries/:id/photos/:photoId - Hapus foto
app.delete("/api/galleries/:id/photos/:photoId", async (req, res) => {
  if (!prisma && !supabase) {
    return res.status(503).json({ error: "Database belum dikonfigurasi" });
  }

  try {
    const { photoId } = req.params;

    if (prisma) {
      try {
        await prisma.galleryPhoto.delete({
          where: { id: BigInt(photoId) },
        });
        return res.json({ message: "Foto berhasil dihapus via Prisma." });
      } catch (prismaErr) {
        console.warn(`Prisma error on DELETE photo #${photoId}, falling back to Supabase:`, prismaErr.message);
      }
    }

    // Fallback: Supabase Client SDK
    if (!supabase) {
      return res.status(503).json({ error: "Layanan database tidak tersedia." });
    }

    const { error } = await supabase
      .from("gallery_photos")
      .delete()
      .eq("id", Number(photoId));

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: "Foto berhasil dihapus." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. MESSAGES ENDPOINTS
// ==========================================

// POST /api/galleries/:id/messages - Kirim pesan kenangan / ucapan tamu
app.post("/api/galleries/:id/messages", async (req, res) => {
  if (!prisma && !supabase) {
    return res.status(503).json({ error: "Database belum dikonfigurasi" });
  }

  try {
    const rawId = req.params.id;
    const { id, name, message, time } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Pesan tidak boleh kosong." });
    }

    const messageId = BigInt(Math.floor(Number(id)) || Date.now());

    if (prisma) {
      try {
        const entry = await prisma.galleryMessage.create({
          data: {
            id: messageId,
            galleryId: BigInt(rawId),
            senderName: name || "Tamu Istimewa",
            message: message.trim(),
            timeDisplay: time || "Baru saja",
          },
        });

        return res.status(201).json({
          message: "Pesan berhasil disimpan via Prisma!",
          entry: {
            id: Number(entry.id),
            name: entry.senderName,
            message: entry.message,
            time: entry.timeDisplay,
          },
        });
      } catch (prismaErr) {
        console.warn("Prisma error on POST message, falling back to Supabase:", prismaErr.message);
      }
    }

    // Fallback: Supabase Client SDK
    if (!supabase) {
      return res.status(503).json({ error: "Layanan database tidak tersedia." });
    }

    const { data, error } = await supabase
      .from("gallery_messages")
      .insert({
        id: Number(messageId),
        gallery_id: Number(rawId),
        sender_name: name || "Tamu Istimewa",
        message: message.trim(),
        time_display: time || "Baru saja",
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting message via Supabase:", error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({
      message: "Pesan berhasil disimpan ke database!",
      entry: data,
    });
  } catch (err) {
    console.error("Server error on POST message:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/galleries/:id/messages/:messageId - Hapus pesan
app.delete("/api/galleries/:id/messages/:messageId", async (req, res) => {
  if (!prisma && !supabase) {
    return res.status(503).json({ error: "Database belum dikonfigurasi" });
  }

  try {
    const { messageId } = req.params;

    if (prisma) {
      try {
        await prisma.galleryMessage.delete({
          where: { id: BigInt(messageId) },
        });
        return res.json({ message: "Pesan berhasil dihapus via Prisma." });
      } catch (prismaErr) {
        console.warn(`Prisma error on DELETE message #${messageId}, falling back to Supabase:`, prismaErr.message);
      }
    }

    // Fallback: Supabase Client SDK
    if (!supabase) {
      return res.status(503).json({ error: "Layanan database tidak tersedia." });
    }

    const { error } = await supabase
      .from("gallery_messages")
      .delete()
      .eq("id", Number(messageId));

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: "Pesan berhasil dihapus." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. STORAGE / UPLOAD ENDPOINT (Supabase Bucket)
// ==========================================
app.post("/api/upload", async (req, res) => {
  if (!supabase) {
    return res.status(503).json({
      error: "Supabase Storage belum dikonfigurasi di file .env",
    });
  }

  try {
    const { base64Data, fileName, folder = "uploads" } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: "base64Data diperlukan untuk upload file." });
    }

    // Ekstrak buffer dari base64 string
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: "Format data base64 tidak valid." });
    }

    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    const ext = contentType.split("/")[1] || "png";
    const filePath = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("gallery-media")
      .upload(filePath, buffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return res.status(500).json({ error: uploadError.message });
    }

    const { data } = supabase.storage
      .from("gallery-media")
      .getPublicUrl(filePath);

    res.json({
      url: data.publicUrl,
      fileName: filePath,
    });
  } catch (err) {
    console.error("Server upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// START SERVER
app.listen(PORT, () => {
  console.log("==================================================");
  console.log(`🚀 [KenanganQR] Express.js Server berjalan di port ${PORT}`);
  console.log(`🔗 Endpoint API: http://localhost:${PORT}/api/health`);
  console.log(`💎 Prisma ORM: ${prisma ? "Aktif (Primary DB)" : "Menunggu DATABASE_URL valid"}`);
  console.log(`📦 Supabase SDK: ${isSupabaseConfigured ? "Aktif (Storage & Fallback)" : "Belum Dikonfigurasi"}`);
  console.log("==================================================");
});
