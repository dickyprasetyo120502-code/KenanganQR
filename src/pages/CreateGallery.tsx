
import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import {
  Camera,
  CalendarDays,
  Heart,
  ImagePlus,
  X,
  Check,
  Images,
} from "lucide-react";

import logoImage from "../assets/logo.jpg";
import { saveGalleryToSupabase, isSupabaseConfigured } from "../lib/supabase";
import { getUser, getGalleries, saveGalleries, type Gallery } from "../utils/storage";
import "../styles/CreateGallery.css";

function CreateGallery() {
  const [user, setUser] = useState(() => getUser());

  useEffect(() => {
    if (!user || !user.email) {
      window.location.href = "/login?redirect=/dashboard/create";
    }
  }, [user]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] =
    useState<Gallery["category"]>("Pernikahan");
  const [date, setDate] = useState("");
  const [cover, setCover] = useState("");
  const [allowGuestUploads, setAllowGuestUploads] = useState(true);
  const [allowGuestMessages, setAllowGuestMessages] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [customCategory, setCustomCategory] = useState("");

  function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Pilih file gambar seperti JPG, PNG, atau WebP.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage("Ukuran foto sampul maksimal 2 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCover(reader.result);
        setMessage("");
      }
    };

    reader.onerror = () => {
      setMessage("Foto gagal dibaca. Silakan coba lagi.");
    };

    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!title.trim()) {
      setMessage("Nama galeri wajib diisi.");
      return;
    }

    if (!date) {
      setMessage("Silakan pilih tanggal acara.");
      return;
    }

    if (!user || !user.email) {
      setMessage("Silakan masuk terlebih dahulu untuk membuat galeri.");
      window.location.href = "/login?redirect=/dashboard/create";
      return;
    }

    setSaving(true);

    try {
      const chosenCategory =
        category === "Lainnya" && customCategory.trim()
          ? customCategory.trim()
          : category || "Acara Spesial";

      const userEmail = user.email.trim().toLowerCase();

      const newGallery: Gallery = {
        id: Date.now(),
        userEmail,
        title: title.trim(),
        category: chosenCategory,
        date: new Date(`${date}T12:00:00`).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        photos: 0,
        messages: 0,
        guests: 0,
        image:
          cover ||
          "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85",
        description: description.trim(),
        allowGuestUploads,
        allowGuestMessages,
        isNew: true,
      };

      // Simpan ke Supabase jika sudah terhubung dengan menyertakan userEmail
      if (isSupabaseConfigured) {
        await saveGalleryToSupabase(newGallery, userEmail);
      }

      // Simpan ke localStorage khusus akun user ini
      const existing = getGalleries(userEmail);
      saveGalleries([newGallery, ...existing], userEmail);

      window.location.href = "/dashboard";
    } catch {
      setMessage(
        "Galeri gagal disimpan. Coba gunakan foto sampul yang lebih kecil atau hapus data demo lama."
      );
      setSaving(false);
    }
  }

  return (
    <main className="create-gallery-page">
      <header className="create-gallery-navbar">
        <a href="/dashboard" className="create-gallery-brand">
          <img src={logoImage} alt="Logo KenanganQR" />
          <span>
            Kenangan<span>QR</span>
          </span>
        </a>

        <a href="/dashboard" className="create-gallery-back">
          Kembali ke Dashboard
        </a>
      </header>

      <div className="create-gallery-layout">
        <section className="create-gallery-main">
          <div className="create-gallery-heading">
            <h1>Buat Galeri Baru</h1>
            <span />
            <p>Isi detail galeri, lalu bagikan QR code kepada tamu</p>
          </div>

          <form className="create-gallery-form" onSubmit={handleSubmit}>
            <label className="create-gallery-label">Foto Sampul</label>

            <label className="create-cover-upload">
              {cover ? (
                <>
                  <img src={cover} alt="Pratinjau foto sampul" />
                  <span className="create-cover-change">
                    <Camera size={18} /> Ganti foto sampul
                  </span>
                </>
              ) : (
                <span className="create-cover-empty">
                  <Camera size={35} />
                  <span>Klik untuk unggah foto sampul</span>
                  <small>JPG, PNG, atau WebP · Maksimal 2 MB</small>
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
              />
            </label>

            {cover && (
              <button
                type="button"
                className="create-remove-cover"
                onClick={() => setCover("")}
              >
                <X size={15} /> Hapus foto sampul
              </button>
            )}

            <label className="create-gallery-label" htmlFor="gallery-name">
              Nama Galeri
            </label>
            <input
              id="gallery-name"
              className="create-gallery-input"
              type="text"
              placeholder="Contoh: Pernikahan Rara & Bima"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={100}
              required
            />

            <label className="create-gallery-label" htmlFor="gallery-description">
              Deskripsi
            </label>
            <textarea
              id="gallery-description"
              className="create-gallery-textarea"
              placeholder="Ceritakan momen spesial di galeri ini..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              rows={3}
            />

            <div className="create-gallery-fields">
              <div className="form-group">
  <label className="form-label" htmlFor="category">
    Jenis Acara
  </label>

  <div className="category-select-wrapper">
    <span className="category-icon">♡</span>

    <select
      id="category"
      className="category-select"
      value={category}
      onChange={(e) => setCategory(e.target.value)}
      required
    >
      <option value="" disabled>
        Pilih jenis acara
      </option>
      <option value="Liburan & Traveling">✈️ Liburan & Traveling</option>
      <option value="Keluarga">🏡 Keluarga</option>
      <option value="Persahabatan">💗 Persahabatan</option>
      <option value="Wisuda">🎓 Wisuda</option>
      <option value="Ulang Tahun">🎂 Ulang Tahun</option>
      <option value="Pernikahan">💍 Pernikahan</option>
      <option value="Anniversary">💕 Anniversary</option>
      <option value="Sekolah & Kampus">📚 Sekolah & Kampus</option>
      <option value="Komunitas">🤝 Komunitas</option>
      <option value="Bayi & Anak">🧸 Bayi & Anak</option>
      <option value="Acara Kantor">💼 Acara Kantor</option>
      <option value="Lainnya">✨ Lainnya</option>
    </select>
  </div>

  {category === "Lainnya" && (
    <input
      className="category-custom-input"
      type="text"
      placeholder="Contoh: Buka Bersama, Tunangan..."
      value={customCategory}
      onChange={(e) => setCustomCategory(e.target.value)}
      required
    />
  )}
</div>

              <div>
                <label className="create-gallery-label" htmlFor="gallery-date">
                  Tanggal Acara
                </label>
                <div className="create-gallery-date-wrap">
                  <CalendarDays size={18} />
                  <input
                    id="gallery-date"
                    type="date"
                    className="create-gallery-input"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="create-gallery-toggles">
              <label className="create-toggle-row">
                <input
                  type="checkbox"
                  checked={allowGuestUploads}
                  onChange={(event) => setAllowGuestUploads(event.target.checked)}
                />
                <span className="create-toggle" />
                <span>Izinkan tamu mengunggah foto</span>
              </label>

              <label className="create-toggle-row">
                <input
                  type="checkbox"
                  checked={allowGuestMessages}
                  onChange={(event) => setAllowGuestMessages(event.target.checked)}
                />
                <span className="create-toggle" />
                <span>Izinkan tamu mengirim pesan</span>
              </label>
            </div>

            {message && (
              <p className="create-gallery-message" role="alert">
                {message}
              </p>
            )}

            <button
              type="submit"
              className="create-gallery-submit"
              disabled={saving}
            >
              {saving ? "Menyimpan..." : "Buat Galeri"}
            </button>
          </form>
        </section>

        <aside className="create-gallery-preview-card">
          <h2>Preview Galeri</h2>
          <p>
            Ini adalah gambaran awal galeri Anda. Foto kenangan akan muncul
            setelah ditambahkan.
          </p>

          <div className="create-phone">
            <div className="create-phone-screen">
              <div className="create-phone-cover">
                {cover ? (
                  <img src={cover} alt="" />
                ) : (
                  <div className="create-phone-placeholder">
                    <ImagePlus size={34} />
                    <span>Foto sampul</span>
                  </div>
                )}
              </div>

              <div className="create-phone-content">
                <div className="create-phone-heart">
                  <Heart size={22} />
                </div>
                <h3>{title.trim() || "Nama Galeri Anda"}</h3>
                <p>
                  {date
                    ? new Date(`${date}T12:00:00`).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Tanggal acara"}
                </p>
                <div className="create-phone-divider" />
                <div className="create-phone-empty">
                  <Images size={25} />
                  <strong>Belum ada foto</strong>
                  <span>Foto kenangan akan ditampilkan di sini.</span>
                </div>
                <div className="create-phone-count">0 foto · 0 pesan</div>
              </div>
            </div>
          </div>

          <div className="create-gallery-preview-note">
            <Check size={17} />
            <span>Galeri dibuat tanpa foto tambahan otomatis.</span>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default CreateGallery;
