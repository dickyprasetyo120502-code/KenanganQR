-- ==============================================================================
-- DATABASE SCHEMA: KENANGANQR (PostgreSQL for Supabase)
-- ==============================================================================
-- Cara Menggunakan:
-- 1. Buka Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Pilih Project Anda -> Buka menu "SQL Editor" di bilah kiri
-- 3. Tempel (Paste) seluruh script SQL ini -> Klik "Run"
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL: USERS (Akun & Autentikasi Pengguna: Email & Password)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON public.users (LOWER(email));

-- 2b. TABEL: PROFILES (Data Pengguna / Pemilik Acara - Supabase Auth Compatible)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- 3. TABEL: GALLERIES (Galeri Album Acara)
CREATE TABLE IF NOT EXISTS public.galleries (
    id BIGINT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_email TEXT,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'Pernikahan' NOT NULL,
    event_date TEXT NOT NULL,
    cover_image TEXT,
    description TEXT,
    allow_guest_uploads BOOLEAN DEFAULT TRUE NOT NULL,
    allow_guest_messages BOOLEAN DEFAULT TRUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. TABEL: GALLERY_PHOTOS (Foto-foto dalam Galeri)
CREATE TABLE IF NOT EXISTS public.gallery_photos (
    id BIGINT PRIMARY KEY,
    gallery_id BIGINT REFERENCES public.galleries(id) ON DELETE CASCADE NOT NULL,
    name TEXT DEFAULT 'Foto Kenangan',
    photo_url TEXT NOT NULL,
    uploader_name TEXT DEFAULT 'Tamu' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. TABEL: GALLERY_MESSAGES (Pesan & Doa dari Tamu Pengunjung)
CREATE TABLE IF NOT EXISTS public.gallery_messages (
    id BIGINT PRIMARY KEY,
    gallery_id BIGINT REFERENCES public.galleries(id) ON DELETE CASCADE NOT NULL,
    sender_name TEXT NOT NULL,
    message TEXT NOT NULL,
    time_display TEXT DEFAULT 'Baru saja',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. INDEXES UNTUK PERFORMA QUERY
CREATE INDEX IF NOT EXISTS idx_galleries_user_id ON public.galleries(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_gallery_id ON public.gallery_photos(gallery_id);
CREATE INDEX IF NOT EXISTS idx_messages_gallery_id ON public.gallery_messages(gallery_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_messages ENABLE ROW LEVEL SECURITY;

-- POLICIES: PROFILES
DROP POLICY IF EXISTS "Profiles can be viewed by owner and public" ON public.profiles;
CREATE POLICY "Profiles can be viewed by owner and public"
    ON public.profiles FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- POLICIES: GALLERIES
-- Siapapun (pengunjung dengan QR code) bisa melihat galeri aktif
DROP POLICY IF EXISTS "Anyone can view active galleries" ON public.galleries;
CREATE POLICY "Anyone can view active galleries"
    ON public.galleries FOR SELECT
    USING (is_active = true);

-- Pemilik yang terautentikasi bisa membuat galeri
DROP POLICY IF EXISTS "Users can create galleries" ON public.galleries;
CREATE POLICY "Users can create galleries"
    ON public.galleries FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Pemilik galeri bisa mengupdate galerinya
DROP POLICY IF EXISTS "Owner can update own galleries" ON public.galleries;
CREATE POLICY "Owner can update own galleries"
    ON public.galleries FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- Pemilik galeri bisa menghapus galerinya
DROP POLICY IF EXISTS "Owner can delete own galleries" ON public.galleries;
CREATE POLICY "Owner can delete own galleries"
    ON public.galleries FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- POLICIES: GALLERY_PHOTOS
-- Siapapun bisa melihat foto dalam galeri
DROP POLICY IF EXISTS "Anyone can view photos in gallery" ON public.gallery_photos;
CREATE POLICY "Anyone can view photos in gallery"
    ON public.gallery_photos FOR SELECT
    USING (true);

-- Pengunjung hanya boleh upload foto JIKA allow_guest_uploads = true di galeri terkait
DROP POLICY IF EXISTS "Guests can upload photos if allowed" ON public.gallery_photos;
CREATE POLICY "Guests can upload photos if allowed"
    ON public.gallery_photos FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.galleries
            WHERE galleries.id = gallery_photos.gallery_id
            AND galleries.allow_guest_uploads = true
        )
    );

-- Pemilik galeri bisa menghapus foto
DROP POLICY IF EXISTS "Gallery owner can delete photos" ON public.gallery_photos;
CREATE POLICY "Gallery owner can delete photos"
    ON public.gallery_photos FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.galleries
            WHERE galleries.id = gallery_photos.gallery_id
            AND (galleries.user_id = auth.uid() OR galleries.user_id IS NULL)
        )
    );

-- POLICIES: GALLERY_MESSAGES
-- Siapapun bisa membaca pesan kenangan
DROP POLICY IF EXISTS "Anyone can view messages" ON public.gallery_messages;
CREATE POLICY "Anyone can view messages"
    ON public.gallery_messages FOR SELECT
    USING (true);

-- Pengunjung hanya boleh mengirim pesan JIKA allow_guest_messages = true di galeri terkait
DROP POLICY IF EXISTS "Guests can write messages if allowed" ON public.gallery_messages;
CREATE POLICY "Guests can write messages if allowed"
    ON public.gallery_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.galleries
            WHERE galleries.id = gallery_messages.gallery_id
            AND galleries.allow_guest_messages = true
        )
    );

-- Pemilik galeri bisa menghapus pesan
DROP POLICY IF EXISTS "Gallery owner can delete messages" ON public.gallery_messages;
CREATE POLICY "Gallery owner can delete messages"
    ON public.gallery_messages FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.galleries
            WHERE galleries.id = gallery_messages.gallery_id
            AND (galleries.user_id = auth.uid() OR galleries.user_id IS NULL)
        )
    );

-- ==============================================================================
-- 7. SUPABASE STORAGE SETUP (Bucket untuk Media & Foto)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-media', 'gallery-media', true)
ON CONFLICT (id) DO NOTHING;

-- Kebijakan Storage: Siapapun bisa melihat gambar
DROP POLICY IF EXISTS "Public can view gallery media" ON storage.objects;
CREATE POLICY "Public can view gallery media"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'gallery-media');

-- Kebijakan Storage: Siapapun (pengunjung) bisa mengunggah ke gallery-media
DROP POLICY IF EXISTS "Public can upload to gallery media" ON storage.objects;
CREATE POLICY "Public can upload to gallery media"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'gallery-media');

-- Kebijakan Storage: Pemilik bisa menghapus foto di storage
DROP POLICY IF EXISTS "Users can delete from gallery media" ON storage.objects;
CREATE POLICY "Users can delete from gallery media"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'gallery-media');
