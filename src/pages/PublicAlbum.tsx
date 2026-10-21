import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from "react";
import {
  Camera,
  Edit3,
  User,
  Heart,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";

import logoImage from "../assets/logo.jpg";
import {
  getGalleryById,
  getGalleries,
  updateGallery,
  type Gallery,
  type GalleryPhoto,
  type GalleryMessage,
} from "../utils/storage";

import {
  fetchGalleryFromSupabase,
  addPhotoToSupabase,
  addMessageToSupabase,
  isSupabaseConfigured,
} from "../lib/supabase";

import "../styles/public-album.css";

function PublicAlbum() {
  const params = new URLSearchParams(window.location.search);
  const queryId = Number(params.get("id"));

  // Load gallery - start empty/clean
  const [gallery, setGallery] = useState<Gallery | null>(() => {
    if (queryId) {
      const found = getGalleryById(queryId);
      if (found) return found;
    }
    return null;
  });

  // Fetch from Supabase if configured
  useEffect(() => {
    if (isSupabaseConfigured && queryId) {
      fetchGalleryFromSupabase(queryId).then((remote) => {
        if (remote) {
          setGallery(remote);
        }
      });
    }
  }, [queryId]);

  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Upload form
  const [uploaderName, setUploaderName] = useState("");
  const [previewImg, setPreviewImg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Message form
  const [guestName, setGuestName] = useState("");
  const [guestText, setGuestText] = useState("");

  const photos = gallery?.photosList || [];
  const messages = gallery?.messagesList || [];

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setNotice("Silakan pilih file gambar (JPG, PNG, WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreviewImg(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!gallery) return;
    if (!previewImg) {
      setNotice("Pilih foto yang ingin diunggah.");
      return;
    }

    setIsSubmitting(true);
    const name = uploaderName.trim() || "Tamu";
    const newPhoto: GalleryPhoto = {
      id: Date.now(),
      url: previewImg,
      name: `Momen dari ${name}`,
      uploaderName: name,
    };

    const nextPhotos = [newPhoto, ...photos];
    const updated: Gallery = {
      ...gallery,
      photos: nextPhotos.length,
      photosList: nextPhotos,
    };

    setGallery(updated);
    updateGallery(updated);

    // Save to Supabase if configured
    if (isSupabaseConfigured) {
      await addPhotoToSupabase(gallery.id, newPhoto);
    }

    setIsSubmitting(false);
    setShowUploadModal(false);
    setPreviewImg("");
    setUploaderName("");
    setNotice("Foto Anda berhasil ditambahkan ke galeri! Terima kasih.");
    setTimeout(() => setNotice(""), 3500);
  };

  const handleMessageSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!gallery) return;
    if (!guestText.trim()) return;

    setIsSubmitting(true);
    const name = guestName.trim() || "Tamu Istimewa";
    const newMsg: GalleryMessage = {
      id: Date.now(),
      name,
      time: "Baru saja",
      message: guestText.trim(),
    };

    const nextMessages = [newMsg, ...messages];
    const updated: Gallery = {
      ...gallery,
      messages: nextMessages.length,
      messagesList: nextMessages,
    };

    setGallery(updated);
    updateGallery(updated);

    // Save to Supabase if configured
    if (isSupabaseConfigured) {
      await addMessageToSupabase(gallery.id, newMsg);
    }

    setIsSubmitting(false);
    setShowMsgModal(false);
    setGuestName("");
    setGuestText("");
    setNotice("Pesan kenangan Anda berhasil dikirim! Terima kasih.");
    setTimeout(() => setNotice(""), 3500);
  };

  if (!gallery) {
    return (
      <main className="public-album-page">
        <header className="pa-navbar">
          <div className="pa-navbar-inner">
            <div className="pa-brand-group">
              <img src={logoImage} alt="Logo KenanganQR" className="pa-logo-img" />
              <div className="pa-brand-text">
                <span className="pa-brand-subtitle">KenanganQR</span>
                <span className="pa-brand-title">Galeri Acara</span>
              </div>
            </div>
          </div>
        </header>

        <div className="pa-container">
          <div className="pa-empty-box" style={{ marginTop: "60px", padding: "40px 20px" }}>
            <ImageIcon size={40} color="#9d804b" style={{ margin: "0 auto 12px" }} />
            <h2 style={{ fontFamily: "Playfair Display, serif", margin: "0 0 8px", color: "#32291e" }}>
              Galeri Tidak Ditemukan
            </h2>
            <p style={{ maxWidth: "360px", margin: "0 auto" }}>
              Silakan periksa kembali tautan yang Anda buka atau pindai QR Code resmi dari pemilik acara untuk melihat galeri foto ini.
            </p>
          </div>

          <footer className="pa-footer">
            <Heart size={15} className="pa-heart-icon" />
            <span>Dibuat dengan KenanganQR</span>
          </footer>
        </div>
      </main>
    );
  }

  return (
    <main className="public-album-page">
      {/* NAVBAR PENGUNJUNG DENGAN LOGO KENANGANQR */}
      <header className="pa-navbar">
        <div className="pa-navbar-inner">
          <div className="pa-brand-group">
            <img
              src={logoImage}
              alt="Logo KenanganQR"
              className="pa-logo-img"
            />
            <div className="pa-brand-text">
              <span className="pa-brand-subtitle">Galeri Kenangan</span>
              <span className="pa-brand-title">{gallery.title}</span>
            </div>
          </div>

          {gallery.allowGuestUploads !== false && (
            <button
              type="button"
              className="pa-nav-upload-btn"
              onClick={() => setShowUploadModal(true)}
            >
              <Camera size={15} />
              <span>Unggah Foto</span>
            </button>
          )}
        </div>
      </header>

      <div className="pa-container">
        {/* HERO BANNER CARD */}
        <section
          className="pa-hero-card"
          style={{
            backgroundImage: gallery.image ? `url(${gallery.image})` : undefined,
            backgroundColor: gallery.image ? undefined : "#9d804b",
          }}
        >
          <div className="pa-hero-overlay" />
          <div className="pa-hero-content">
            <h1 className="pa-hero-title">{gallery.title}</h1>

            <div className="pa-hero-divider">
              <span />
              ✻
              <span />
            </div>

            <p className="pa-hero-subtitle">
              Bagikan momen dan pesan kenangan Anda
            </p>
          </div>
        </section>

        {/* ACTION BUTTONS (Unggah Foto & Tulis Pesan) - SINKRON DENGAN PENGATURAN PEMILIK */}
        {(gallery.allowGuestUploads !== false || gallery.allowGuestMessages !== false) && (
          <div className="pa-action-buttons">
            {gallery.allowGuestUploads !== false && (
              <button
                type="button"
                className={`pa-action-btn ${
                  gallery.allowGuestMessages === false ? "pa-action-btn-single" : ""
                }`}
                onClick={() => setShowUploadModal(true)}
              >
                <Camera size={17} />
                <span>Unggah Foto</span>
              </button>
            )}

            {gallery.allowGuestMessages !== false && (
              <button
                type="button"
                className={`pa-action-btn ${
                  gallery.allowGuestUploads === false ? "pa-action-btn-single" : ""
                }`}
                onClick={() => setShowMsgModal(true)}
              >
                <Edit3 size={17} />
                <span>Tulis Pesan</span>
              </button>
            )}
          </div>
        )}

        {/* SECTION: MOMEN TERBARU */}
        <section className="pa-section">
          <div className="pa-section-header">
            <svg
              className="pa-section-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8Z" />
              <path d="M12 6v6l4 2" />
            </svg>
            <h2 className="pa-section-title">Momen Terbaru ({photos.length})</h2>
          </div>

          {photos.length === 0 ? (
            <div className="pa-empty-box">
              <Camera size={34} color="#9d804b" style={{ margin: "0 auto" }} />
              <p>Belum ada foto yang diunggah.</p>
              {gallery.allowGuestUploads !== false ? (
                <button
                  type="button"
                  className="pa-action-btn"
                  style={{ marginTop: "14px", display: "inline-flex" }}
                  onClick={() => setShowUploadModal(true)}
                >
                  <Camera size={16} /> Unggah Foto Pertama
                </button>
              ) : (
                <small style={{ color: "#a09586", display: "block", marginTop: "8px" }}>
                  Unggahan foto dinonaktifkan oleh penyelenggara.
                </small>
              )}
            </div>
          ) : (
            <div className="pa-photo-grid">
              {photos.map((photo) => (
                <article
                  className="pa-photo-card"
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="pa-photo-img"
                    loading="lazy"
                  />
                  <div className="pa-uploader-badge">
                    <User size={12} />
                    <span>oleh {photo.uploaderName || "Tamu"}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* SECTION: PESAN KENANGAN */}
        <section className="pa-section" style={{ marginTop: "32px" }}>
          <div className="pa-section-header">
            <svg
              className="pa-section-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <h2 className="pa-section-title">Pesan Kenangan ({messages.length})</h2>
          </div>

          {messages.length === 0 ? (
            <div className="pa-empty-box">
              <p>Belum ada pesan kenangan yang dikirim.</p>
              {gallery.allowGuestMessages !== false ? (
                <button
                  type="button"
                  className="pa-action-btn"
                  style={{ marginTop: "14px", display: "inline-flex" }}
                  onClick={() => setShowMsgModal(true)}
                >
                  <Edit3 size={16} /> Tulis Pesan Pertama
                </button>
              ) : (
                <small style={{ color: "#a09586", display: "block", marginTop: "8px" }}>
                  Pesan kenangan dinonaktifkan oleh penyelenggara.
                </small>
              )}
            </div>
          ) : (
            <div className="pa-message-list">
              {messages.map((item) => (
                <article className="pa-message-card" key={item.id}>
                  {/* Decorative corner leaves */}
                  <svg
                    className="pa-message-leaf-left"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                  </svg>
                  <svg
                    className="pa-message-leaf-right"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                  </svg>

                  <p className="pa-message-quote">“{item.message}”</p>
                  <p className="pa-message-author">— {item.name}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* FOOTER PENGUNJUNG (Murni pengunjung, tanpa link ke dashboard) */}
        <footer className="pa-footer">
          <Heart size={15} className="pa-heart-icon" />
          <span>Dibuat dengan KenanganQR</span>
        </footer>
      </div>

      {/* MODAL UNGGAH FOTO */}
      {showUploadModal && (
        <div
          className="pa-modal-backdrop"
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="pa-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="pa-modal-close"
              onClick={() => setShowUploadModal(false)}
              aria-label="Tutup"
            >
              ×
            </button>

            <h3 className="pa-modal-title">Unggah Foto Kenangan</h3>
            <p className="pa-modal-desc">
              Bagikan foto momen spesial Anda untuk {gallery.title}.
            </p>

            <form onSubmit={handleUploadSubmit}>
              <div className="pa-form-group">
                <label className="pa-form-label" htmlFor="uploader-name">
                  Nama Anda
                </label>
                <input
                  id="uploader-name"
                  type="text"
                  placeholder="Contoh: Andi Pratama"
                  className="pa-form-input"
                  value={uploaderName}
                  onChange={(e) => setUploaderName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="pa-form-group">
                <label className="pa-form-label">Pilih Foto</label>
                <div
                  className="pa-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewImg ? (
                    <div>
                      <img
                        src={previewImg}
                        alt="Preview"
                        className="pa-dropzone-preview"
                      />
                      <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#9d804b" }}>
                        Klik untuk mengganti foto
                      </p>
                    </div>
                  ) : (
                    <div>
                      <ImageIcon size={32} color="#9d804b" style={{ margin: "0 auto" }} />
                      <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#32291e", fontWeight: 600 }}>
                        Sentuh di sini untuk memilih foto
                      </p>
                      <span style={{ fontSize: "11px", color: "#807463" }}>
                        JPG, PNG, atau WEBP
                      </span>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleFileChange}
                />
              </div>

              <button
                type="submit"
                className="pa-modal-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Mengunggah..." : "Kirim Foto"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TULIS PESAN */}
      {showMsgModal && (
        <div
          className="pa-modal-backdrop"
          onClick={() => setShowMsgModal(false)}
        >
          <div
            className="pa-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="pa-modal-close"
              onClick={() => setShowMsgModal(false)}
              aria-label="Tutup"
            >
              ×
            </button>

            <h3 className="pa-modal-title">Tulis Pesan Kenangan</h3>
            <p className="pa-modal-desc">
              Kirim ucapan dan doa terbaik Anda untuk {gallery.title}.
            </p>

            <form onSubmit={handleMessageSubmit}>
              <div className="pa-form-group">
                <label className="pa-form-label" htmlFor="guest-name">
                  Nama Anda
                </label>
                <input
                  id="guest-name"
                  type="text"
                  placeholder="Contoh: Siti Nurhaliza"
                  className="pa-form-input"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="pa-form-group">
                <label className="pa-form-label" htmlFor="guest-text">
                  Pesan Kenangan
                </label>
                <textarea
                  id="guest-text"
                  placeholder="Tulis ucapan atau doa Anda di sini..."
                  className="pa-form-textarea"
                  value={guestText}
                  onChange={(e) => setGuestText(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="pa-modal-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Mengirim..." : "Kirim Pesan"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {selectedPhoto && (
        <div
          className="pa-lightbox-backdrop"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            type="button"
            className="pa-lightbox-close"
            onClick={() => setSelectedPhoto(null)}
            aria-label="Tutup"
          >
            ×
          </button>
          <div
            className="pa-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.name}
              className="pa-lightbox-img"
            />
            <div className="pa-lightbox-caption">
              <User size={13} />
              <span>oleh {selectedPhoto.uploaderName || "Tamu"}</span>
            </div>
          </div>
        </div>
      )}

      {/* NOTICE TOAST */}
      {notice && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#2a2217",
            color: "#ffffff",
            padding: "10px 20px",
            borderRadius: "999px",
            fontSize: "13px",
            zIndex: 1100,
            boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Sparkles size={15} color="#e5c583" />
          <span>{notice}</span>
        </div>
      )}
    </main>
  );
}

export default PublicAlbum;
