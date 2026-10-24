import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import midtransClient from "midtrans-client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "./prisma.js";
import crypto from "node:crypto";
import {
  startCronScheduler,
  checkUserSubscription,
  checkAndProcessGalleries,
} from "./cronService.js";

// Muat environment variables dari .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Konfigurasi Midtrans Snap Sandbox / Production
const isMidtransProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
const snap = new midtransClient.Snap({
  isProduction: isMidtransProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.VITE_MIDTRANS_CLIENT_KEY,
});

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
function formatGalleryResponse(g, subscriptionInfo = null) {
  const photos = g.photos || g.gallery_photos || [];
  const messages = g.messages || g.gallery_messages || [];

  const createdTime = g.createdAt || g.created_at ? new Date(g.createdAt || g.created_at).getTime() : Date.now();
  const diffDays = Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24));
  const daysActive = Math.max(0, diffDays);
  const daysRemaining = Math.max(0, 7 - daysActive);

  const isSubscribed = Boolean(subscriptionInfo?.isSubscribed);
  const isTrialExpired = !isSubscribed && daysActive >= 7;
  const photosPurged = Boolean(g.photosPurgedAt || g.photos_purged_at);

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
    createdAt: g.createdAt || g.created_at || new Date().toISOString(),
    userEmail: g.userEmail || g.user_email || "",
    daysActive,
    daysRemaining,
    isSubscribed,
    // Peraturan: Kalo belum berlangganan, tidak boleh download gambar / kartu QR
    canDownload: isSubscribed,
    isTrialExpired,
    photosPurged,
    subscriptionPlan: isSubscribed
      ? subscriptionInfo?.planName || "Paket Berlangganan"
      : "Gratis (Uji Coba 7 Hari)",
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
// 1b. AUTHENTICATION & USER ENDPOINTS
// ==========================================

function formatUserResponse(user) {
  return {
    id: user.id,
    name: user.fullName || user.full_name,
    email: user.email,
    avatar: user.avatarUrl || user.avatar_url || null,
    createdAt: user.createdAt || user.created_at,
  };
}
// Membuat access token untuk pengguna yang berhasil login
function createAccessToken(user) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET belum dikonfigurasi.");
  }

  return jwt.sign(
    {
      email: user.email,
    },
    secret,
    {
      subject: String(user.id),
      expiresIn: "30d",
    }
  );
}
// Memverifikasi token JWT dari request dengan fallback email pengguna
async function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization;

  if (authorization && authorization.startsWith("Bearer ")) {
    const token = authorization.slice(7);
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.auth = {
        userId: payload.sub,
        email: payload.email,
      };
      return next();
    } catch {
      // Token kedaluwarsa / invalid, lanjutkan ke fallback
    }
  }

  // Fallback: Jika token belum tersimpan di browser namun identitas email dikirim
  const fallbackEmail = (
    req.body?.userEmail ||
    req.headers["x-user-email"] ||
    ""
  ).trim().toLowerCase();

  if (fallbackEmail && prisma) {
    try {
      const fallbackUser = await prisma.user.findFirst({
        where: { email: { equals: fallbackEmail, mode: "insensitive" } },
      });
      if (fallbackUser) {
        req.auth = {
          userId: fallbackUser.id,
          email: fallbackUser.email,
        };
        return next();
      }
    } catch (e) {
      console.warn("Fallback auth error:", e.message);
    }
  }

  return res.status(401).json({
    error: "Sesi login tidak ditemukan atau kedaluwarsa. Silakan login kembali.",
  });
}

// POST /api/auth/register - Pendaftaran akun baru
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Nama lengkap wajib diisi." });
  }

  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Alamat email wajib diisi." });
  }

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: "Format email tidak valid." });
  }

  if (!password || password.length < 8) {
    return res.status(400).json({ error: "Kata sandi minimal harus 8 karakter." });
  }

  try {
    // 1. Cek apakah email sudah terdaftar via Prisma
    if (prisma) {
      try {
        const existing = await prisma.user.findFirst({
          where: {
            email: {
              equals: cleanEmail,
              mode: "insensitive",
            },
          },
        });

        if (existing) {
          return res.status(409).json({
            error: "Email sudah terdaftar. Silakan langsung masuk ke akun Anda.",
          });
        }

        const passwordHash = bcrypt.hashSync(password, 10);
        const newUser = await prisma.user.create({
          data: {
            fullName: name.trim(),
            email: cleanEmail,
            passwordHash,
          },
        });

        const accessToken = createAccessToken(newUser);
        return res.status(201).json({
          message: "Pendaftaran berhasil! Akun Anda telah dibuat.",
          accessToken,
          user: formatUserResponse(newUser),
        });
      } catch (prismaErr) {
        console.warn("Prisma error on /api/auth/register, falling back to Supabase:", prismaErr.message);
      }
    }

    // Fallback: Supabase Client SDK
    if (!supabase) {
      return res.status(503).json({ error: "Layanan database tidak tersedia." });
    }

    const { data: existingSupabase } = await supabase
      .from("users")
      .select("id, email")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (existingSupabase) {
      return res.status(409).json({
        error: "Email sudah terdaftar. Silakan langsung masuk ke akun Anda.",
      });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const { data: createdSupabase, error: insertErr } = await supabase
      .from("users")
      .insert({
        full_name: name.trim(),
        email: cleanEmail,
        password_hash: passwordHash,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Supabase user insert error:", insertErr);
      return res.status(500).json({ error: insertErr.message });
    }

    res.status(201).json({
      message: "Pendaftaran berhasil! Akun Anda telah dibuat.",
      user: formatUserResponse(createdSupabase),
    });
  } catch (err) {
    console.error("Server error on /api/auth/register:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login - Masuk ke akun terdaftar (Wajib sudah punya akun)
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Silakan masukkan alamat email Anda." });
  }

  if (!password) {
    return res.status(400).json({ error: "Silakan masukkan kata sandi Anda." });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    let user = null;

    if (prisma) {
      try {
        user = await prisma.user.findFirst({
          where: {
            email: {
              equals: cleanEmail,
              mode: "insensitive",
            },
          },
        });
      } catch (prismaErr) {
        console.warn("Prisma error on /api/auth/login, falling back to Supabase:", prismaErr.message);
      }
    }

    if (!user && supabase) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .ilike("email", cleanEmail)
        .maybeSingle();

      if (!error && data) {
        user = data;
      }
    }

    // JIKA USER BELUM MEMILIKI AKUN DI DATABASE:
    if (!user) {
      return res.status(404).json({
        error: "Akun belum terdaftar. Anda wajib membuat akun terlebih dahulu sebelum masuk!",
        notRegistered: true,
      });
    }

    const userHash = user.passwordHash || user.password_hash;

    // JIKA USER DAFTAR LEWAT GOOGLE TANPA KATA SANDI
    if (!userHash) {
      return res.status(400).json({
        error: "Akun ini didaftarkan via Google. Silakan masuk menggunakan tombol Masuk dengan Google.",
      });
    }

    // CEK KECOCOKAN KATA SANDI MENGGUNAKAN BCRYPT
    const isPasswordValid = bcrypt.compareSync(password, userHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Kata sandi yang Anda masukkan salah. Silakan periksa kembali.",
      });
    }

    // LOGIN SUKSES
const accessToken = createAccessToken(user);

return res.json({
  message: "Login berhasil! Selamat datang kembali.",
  accessToken,
  user: formatUserResponse(user),
});
  } catch (err) {
    console.error("Server error on /api/auth/login:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/google - Login atau Daftar via Google OAuth
app.post("/api/auth/google", async (req, res) => {
  const { email, name, avatar, mode = "login" } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Email akun Google diperlukan." });
  }

  const cleanEmail = email.trim().toLowerCase();
  const displayName = name ? name.trim() : cleanEmail.split("@")[0];

  try {
    if (prisma) {
      try {
        let user = await prisma.user.findFirst({
          where: {
            email: {
              equals: cleanEmail,
              mode: "insensitive",
            },
          },
        });

        if (user) {
          if (avatar && !user.avatarUrl) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { avatarUrl: avatar },
            });
          }
          const accessToken = createAccessToken(user);
          return res.json({
            message: "Login Google berhasil!",
            accessToken,
            user: formatUserResponse(user),
          });
        }

        // Jika akun belum pernah ada, buatkan otomatis dan langsung login!
        const newUser = await prisma.user.create({
          data: {
            fullName: displayName,
            email: cleanEmail,
            avatarUrl: avatar || null,
          },
        });

        const accessToken = createAccessToken(newUser);
        return res.status(200).json({
          message: "Login Google berhasil! Akun Anda telah siap.",
          accessToken,
          user: formatUserResponse(newUser),
        });
      } catch (prismaErr) {
        console.warn("Prisma error on /api/auth/google, falling back to Supabase:", prismaErr.message);
      }
    }

    // Fallback: Supabase Client SDK
    if (!supabase) {
      return res.status(503).json({ error: "Layanan database tidak tersedia." });
    }

    const { data: existing } = await supabase
      .from("users")
      .select("*")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (existing) {
      if (avatar && !existing.avatar_url) {
        await supabase
          .from("users")
          .update({ avatar_url: avatar })
          .eq("id", existing.id);
      }
      return res.json({
        message: "Login Google berhasil!",
        user: formatUserResponse(existing),
      });
    }

    // Buat akun baru di Supabase jika belum ada dan langsung login
    const { data: created, error } = await supabase
      .from("users")
      .insert({
        full_name: displayName,
        email: cleanEmail,
        avatar_url: avatar || null,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({
      message: "Login Google berhasil! Akun Anda telah siap.",
      user: formatUserResponse(created),
    });
  } catch (err) {
    console.error("Server error on /api/auth/google:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/change-password - Ganti kata sandi akun
app.post("/api/auth/change-password", async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ error: "Email dan kata sandi baru wajib diisi." });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Kata sandi baru minimal harus 8 karakter." });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    let user = null;

    if (prisma) {
      user = await prisma.user.findFirst({
        where: { email: { equals: cleanEmail, mode: "insensitive" } },
      });
    } else if (supabase) {
      const { data } = await supabase
        .from("users")
        .select("*")
        .ilike("email", cleanEmail)
        .maybeSingle();
      user = data;
    }

    if (!user) {
      return res.status(404).json({ error: "Pengguna tidak ditemukan." });
    }

    const currentHash = user.passwordHash || user.password_hash;
    if (currentHash) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Kata sandi saat ini harus diisi." });
      }
      const isMatch = bcrypt.compareSync(currentPassword, currentHash);
      if (!isMatch) {
        return res.status(401).json({ error: "Kata sandi saat ini tidak cocok." });
      }
    }

    const newHash = bcrypt.hashSync(newPassword, 10);

    if (prisma) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });
    } else if (supabase) {
      await supabase
        .from("users")
        .update({ password_hash: newHash, updated_at: new Date().toISOString() })
        .eq("id", user.id);
    }

    return res.json({ message: "Kata sandi berhasil diperbarui!" });
  } catch (err) {
    console.error("Server error on change-password:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password - Reset kata sandi berdasarkan email
app.post("/api/auth/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ error: "Email dan kata sandi baru wajib diisi." });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Kata sandi baru minimal harus 8 karakter." });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    let user = null;

    if (prisma) {
      try {
        user = await prisma.user.findFirst({
          where: { email: { equals: cleanEmail, mode: "insensitive" } },
        });
      } catch (prismaErr) {
        console.warn("Prisma error on /api/auth/reset-password, falling back to Supabase:", prismaErr.message);
      }
    }

    if (!user && supabase) {
      const { data, error: sbErr } = await supabase
        .from("users")
        .select("*")
        .ilike("email", cleanEmail)
        .maybeSingle();
      if (!sbErr && data) {
        user = data;
      }
    }

    if (!user) {
      return res.status(404).json({
        error: "Email tidak terdaftar dalam sistem. Silakan periksa kembali atau buat akun baru.",
        notRegistered: true,
      });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    let updated = false;

    if (prisma) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: newHash },
        });
        updated = true;
      } catch (prismaErr) {
        console.warn("Prisma update error on reset-password, falling back to Supabase:", prismaErr.message);
      }
    }

    if (!updated && supabase) {
      const { error: sbUpdateErr } = await supabase
        .from("users")
        .update({ password_hash: newHash, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (sbUpdateErr) {
        console.error("Supabase user update error on reset-password:", sbUpdateErr);
        return res.status(500).json({ error: sbUpdateErr.message });
      }
      updated = true;
    }

    return res.json({
      message: "Kata sandi Anda berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.",
    });
  } catch (err) {
    console.error("Server error on reset-password:", err);
    res.status(500).json({ error: err.message });
  }
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
    const userEmail = (req.query.email || "").trim().toLowerCase();
    let subInfo = null;
    if (userEmail) {
      subInfo = await checkUserSubscription(userEmail);
    }

    if (prisma) {
      try {
        const galleries = await prisma.gallery.findMany({
          include: {
            photos: { orderBy: { createdAt: "asc" } },
            messages: { orderBy: { createdAt: "desc" } },
          },
          orderBy: { createdAt: "desc" },
        });
        return res.json(
          await Promise.all(
            galleries.map(async (gal) => {
              const gallerySub = gal.userEmail
                ? await checkUserSubscription(gal.userEmail)
                : subInfo;
              return formatGalleryResponse(gal, gallerySub);
            })
          )
        );
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

    res.json((data || []).map((gal) => formatGalleryResponse(gal, subInfo)));
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
          const subInfo = await checkUserSubscription(gallery.userEmail);
          return res.json(formatGalleryResponse(gallery, subInfo));
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

    const subInfo = await checkUserSubscription(gallery.user_email);
    res.json(formatGalleryResponse(gallery, subInfo));
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



/* ==========================================
   MIDTRANS PAYMENT - CREATE SNAP TRANSACTION
========================================== */
app.post(
  "/api/payments/create",
  authenticateToken,
  async (req, res) => {
    let payment = null;

    try {
      // Pembayaran wajib menggunakan database utama.
      if (!prisma) {
        return res.status(503).json({
          error: "Database pembayaran belum tersedia.",
        });
      }

      if (
        !process.env.MIDTRANS_SERVER_KEY ||
        !process.env.VITE_MIDTRANS_CLIENT_KEY
      ) {
        return res.status(503).json({
          error: "Konfigurasi pembayaran belum tersedia.",
        });
      }

      // Harga dan durasi hanya ditentukan oleh backend.
      const plans = {
        basic: {
          name: "Paket Basic",
          price: 19000,
          durationDays: 7,
        },
        premium: {
          name: "Paket Premium",
          price: 50000,
          durationDays: 30,
        },
      };

      const { planId } = req.body ?? {};

      if (
        typeof planId !== "string" ||
        !Object.hasOwn(plans, planId)
      ) {
        return res.status(400).json({
          error: "Paket tidak valid.",
        });
      }

      // Ambil identitas dari auth atau email, lalu cocokkan dengan database.
      let user = null;
      if (req.auth.userId) {
        user = await prisma.user.findUnique({
          where: {
            id: req.auth.userId,
          },
        });
      }

      if (!user && req.auth.email) {
        user = await prisma.user.findFirst({
          where: {
            email: {
              equals: req.auth.email,
              mode: "insensitive",
            },
          },
        });
      }

      if (!user) {
        return res.status(401).json({
          error: "Akun tidak ditemukan. Silakan login kembali.",
        });
      }

      const plan = plans[planId];

      const orderId = `KQR-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;

      // Simpan transaksi terlebih dahulu sebagai PENDING.
      payment = await prisma.payment.create({
        data: {
          orderId,
          userId: user.id,
          planId,
          planName: plan.name,
          amount: plan.price,
          durationDays: plan.durationDays,
          status: "PENDING",
        },
      });

      let transaction;

      try {
        transaction = await snap.createTransaction({
          transaction_details: {
            order_id: orderId,
            gross_amount: plan.price,
          },
          item_details: [
            {
              id: planId,
              price: plan.price,
              quantity: 1,
              name: plan.name,
            },
          ],
          customer_details: {
            first_name: (
              user.fullName || "Pelanggan"
            ).slice(0, 50),
            email: user.email,
          },
          custom_expiry: {
            expiry_duration: 60,
            unit: "minute",
          },
        });
      } catch (midtransError) {
        // Status tetap PENDING jika hasil request Midtrans
        // tidak dapat dipastikan. Jangan anggap pembayaran gagal
        // sebelum statusnya diperiksa melalui API Midtrans.
        console.error(
          "Gagal meminta transaksi Snap:",
          midtransError.message
        );

        return res.status(502).json({
          error:
            "Token pembayaran belum dapat diperoleh. Periksa status transaksi sebelum mencoba lagi.",
          orderId,
        });
      }

      return res.status(201).json({
        orderId,
        planId,
        planName: plan.name,
        amount: plan.price,
        durationDays: plan.durationDays,
        token: transaction.token,
        redirectUrl: transaction.redirect_url,
      });
    } catch (err) {
      console.error(
        "Gagal membuat transaksi pembayaran:",
        err.message
      );

      return res.status(500).json({
        error: "Transaksi belum dapat dibuat. Silakan coba lagi.",
      });
    }
  }
);




/* ==========================================
   MIDTRANS WEBHOOK - PAYMENT NOTIFICATION
========================================== */
app.post("/api/payments/notification", async (req, res) => {
  try {
    if (!prisma || !process.env.MIDTRANS_SERVER_KEY) {
      return res.status(503).json({
        error: "Layanan pembayaran belum tersedia.",
      });
    }

    // Verifikasi notifikasi melalui API resmi Midtrans.
    const statusResponse =
      await snap.transaction.notification(req.body);

    const {
      order_id: orderId,
      transaction_status: transactionStatus,
      fraud_status: fraudStatus,
      transaction_id: transactionId,
      payment_type: paymentType,
      status_code: statusCode,
      gross_amount: grossAmount,
    } = statusResponse;

    if (!orderId || !transactionStatus) {
      return res.status(400).json({
        error: "Data transaksi dari Midtrans tidak lengkap.",
      });
    }

    // Cari transaksi yang dibuat oleh backend KenanganQR.
    const payment = await prisma.payment.findUnique({
      where: { orderId },
    });

    if (!payment) {
      return res.status(404).json({
        error: "Transaksi tidak ditemukan.",
      });
    }

    // Validasi nominal dan kode status sukses.
    if (
      !Number.isFinite(Number(grossAmount)) ||
      Number(grossAmount) !== payment.amount
    ) {
      return res.status(400).json({
        error: "Nominal transaksi tidak cocok.",
      });
    }

    let newStatus;

    if (
      transactionStatus === "settlement" ||
      (transactionStatus === "capture" &&
        fraudStatus === "accept")
    ) {
      if (statusCode !== "200" && statusCode !== 200) {
        return res.status(400).json({
          error: "Kode status pembayaran tidak valid.",
        });
      }

      newStatus = "PAID";
    } else if (transactionStatus === "pending") {
      newStatus = "PENDING";
    } else if (transactionStatus === "expire") {
      newStatus = "EXPIRED";
    } else if (transactionStatus === "cancel") {
      newStatus = "CANCELLED";
    } else if (transactionStatus === "deny") {
      newStatus = "FAILED";
    } else if (
      transactionStatus === "refund" ||
      transactionStatus === "partial_refund"
    ) {
      newStatus = "REFUNDED";
    } else {
      // Status lain tidak boleh dianggap sebagai pembayaran sukses.
      return res.status(200).json({
        message: "Status transaksi diterima tanpa perubahan.",
      });
    }

    // Jangan biarkan notifikasi lama menurunkan status PAID.
    if (payment.status === "PAID" && newStatus !== "REFUNDED") {
      return res.status(200).json({
        message: "Pembayaran sudah terkonfirmasi.",
      });
    }

    await prisma.payment.update({
      where: { orderId },
      data: {
        status: newStatus,
        midtransTransactionId: transactionId ?? undefined,
        paymentType: paymentType ?? undefined,
        ...(newStatus === "PAID" && !payment.paidAt
          ? { paidAt: new Date() }
          : {}),
      },
    });

    console.log(`[Midtrans] Order ${orderId}: ${newStatus}`);

    return res.status(200).json({
      message: "Notifikasi berhasil diproses.",
    });
  } catch (error) {
    console.error(
      "Gagal memproses notifikasi Midtrans:",
      error.message
    );

    return res.status(500).json({
      error: "Notifikasi belum dapat diproses.",
    });
  }
});

/* ==========================================
   MIDTRANS PAYMENT - SYNC TRANSACTION STATUS
========================================== */
app.post("/api/payments/sync/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ error: "Order ID wajib diisi." });
    }

    if (!prisma) {
      return res.status(503).json({ error: "Database belum siap." });
    }

    const payment = await prisma.payment.findUnique({
      where: { orderId },
    });

    if (!payment) {
      return res.status(404).json({ error: "Transaksi tidak ditemukan." });
    }

    // Periksa status langsung ke Midtrans API
    let statusResponse = null;
    try {
      statusResponse = await snap.transaction.status(orderId);
    } catch (midErr) {
      console.warn("Gagal cek status ke Midtrans API:", midErr.message);
      return res.json({
        status: payment.status,
        orderId: payment.orderId,
        payment,
      });
    }

    const {
      transaction_status: transactionStatus,
      fraud_status: fraudStatus,
      transaction_id: transactionId,
      payment_type: paymentType,
    } = statusResponse;

    let newStatus = payment.status;

    if (
      transactionStatus === "settlement" ||
      (transactionStatus === "capture" && (fraudStatus === "accept" || !fraudStatus))
    ) {
      newStatus = "PAID";
    } else if (transactionStatus === "pending") {
      newStatus = "PENDING";
    } else if (transactionStatus === "expire") {
      newStatus = "EXPIRED";
    } else if (transactionStatus === "cancel") {
      newStatus = "CANCELLED";
    } else if (transactionStatus === "deny") {
      newStatus = "FAILED";
    }

    if (newStatus !== payment.status) {
      await prisma.payment.update({
        where: { orderId },
        data: {
          status: newStatus,
          midtransTransactionId: transactionId || payment.midtransTransactionId,
          paymentType: paymentType || payment.paymentType,
          ...(newStatus === "PAID" && !payment.paidAt ? { paidAt: new Date() } : {}),
        },
      });
    }

    return res.json({
      success: true,
      status: newStatus,
      orderId,
      paymentType,
    });
  } catch (err) {
    console.error("Gagal sync status pembayaran:", err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/subscription/status - Cek status langganan akun
app.get("/api/subscription/status", async (req, res) => {
  try {
    const email = (
      req.query.email ||
      req.headers["x-user-email"] ||
      ""
    ).trim().toLowerCase();

    if (!email) {
      return res.json({
        isSubscribed: false,
        plan: "free",
        canDownload: false,
      });
    }

    const sub = await checkUserSubscription(email);
    return res.json({
      ...sub,
      canDownload: sub.isSubscribed,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/cron/check-subscriptions - Manual trigger scheduler peringatan 5 hari & purge 7 hari
app.post("/api/cron/check-subscriptions", async (req, res) => {
  try {
    const result = await checkAndProcessGalleries();
    return res.json({
      message: "Pengecekan masa gratis 7 hari dan peringatan hari ke-5 berhasil dijalankan.",
      result,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default app;

// Jalankan server hanya untuk pengembangan lokal.
// Pada Vercel, request akan ditangani oleh function.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log("==================================================");
    console.log(`[KenanganQR] Express.js Server berjalan di port ${PORT}`);
    console.log(`Endpoint API: http://localhost:${PORT}/api/health`);
    console.log(
      `Prisma ORM: ${prisma ? "Aktif (Primary DB)" : "Menunggu DATABASE_URL valid"}`
    );
    console.log(
      `Supabase SDK: ${
        isSupabaseConfigured ? "Aktif (Storage & Fallback)" : "Belum Dikonfigurasi"
      }`
    );
    console.log("==================================================");
  });

  // Aktifkan scheduler background otomatis untuk pengecekan masa aktif galeri
  startCronScheduler();
}
