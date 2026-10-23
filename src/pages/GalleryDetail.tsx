import logo from "../assets/logo.jpg";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  Copy,
  Download,
  Image as ImageIcon,
  Link as LinkIcon,
  MessageCircle,
  QrCode,
  Settings,
  Trash2,
  Upload,
  CalendarDays,
  LogOut,
  X,
  Sparkles,
  CreditCard,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { downloadDesignedQRCard } from "../utils/qrDesign";
import MidtransPaymentModal from "../components/MidtransPaymentModal";
import ConfirmSubscriptionModal, { type PlanDetail } from "../components/ConfirmSubscriptionModal";

import {
  getUser,
  saveUser,
  removeUser,
  getGalleries,
  getGalleryById,
  updateGallery,
  type UserProfile,
  type Gallery,
  type GalleryPhoto,
  type GalleryMessage,
} from "../utils/storage";

import {
  saveGalleryToSupabase,
  fetchGalleryFromSupabase,
  addPhotoToSupabase,
  deletePhotoFromSupabase,
  uploadImageToSupabase,
  isSupabaseConfigured,
} from "../lib/supabase";

import "../styles/gallery-detail.css";

const fallbackCover =
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1800&q=85";

function GalleryDetail() {
  const params = new URLSearchParams(window.location.search);
  const queryId = Number(params.get("id"));

  const [user, setUser] = useState<UserProfile | null>(() => getUser());

  // Find gallery or fallback
  const [gallery, setGallery] = useState<Gallery>(() => {
    const userEmail = getUser()?.email;
    if (queryId) {
      const found = getGalleryById(queryId);
      if (found) return found;
    }
    const userGalleries = getGalleries(userEmail);
    if (userGalleries.length > 0) return userGalleries[0];

    // default demo gallery if nothing in storage
    return {
      id: queryId || Date.now(),
      userEmail: userEmail ? userEmail.trim().toLowerCase() : undefined,
      title: "Galeri Kenangan Saya",
      category: "Pernikahan",
      date: new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      photos: 0,
      messages: 0,
      guests: 0,
      image: fallbackCover,
      allowGuestUploads: true,
      allowGuestMessages: true,
      photosList: [],
      messagesList: [],
    };
  });

  const [activeTab, setActiveTab] = useState<"Foto" | "Pesan Kenangan" | "Pengaturan">(() => {
    const tabParam = params.get("tab");
    if (tabParam === "Pengaturan" || tabParam === "settings") return "Pengaturan";
    if (tabParam === "Pesan Kenangan") return "Pesan Kenangan";
    return "Foto";
  });

  const [photos, setPhotos] = useState<GalleryPhoto[]>(() => gallery.photosList || []);
  const [messages, setMessages] = useState<GalleryMessage[]>(() => gallery.messagesList || []);

  // Ambil data terbaru dari Supabase/Backend jika tersedia dan proteksi akses pemilik
  useEffect(() => {
    // 1. Cek autentikasi user
    if (!user || !user.email) {
      // Jika membuka dengan queryId (kemungkinan tamu yang membuka link detail alih-alih link tamu)
      if (queryId) {
        window.location.assign(`/galeri?id=${queryId}`);
      } else {
        window.location.assign(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      }
      return;
    }

    // 2. Ambil data terbaru dari Supabase jika ada queryId
    if (queryId) {
      fetchGalleryFromSupabase(queryId).then((remote) => {
        if (remote) {
          // Proteksi akses: jika album ini milik orang lain (userEmail berbeda),
          // alihkan user ke tampilan album tamu (/galeri?id=...) agar tidak bisa mengelola album orang lain
          if (
            remote.userEmail &&
            user.email &&
            remote.userEmail.trim().toLowerCase() !== user.email.trim().toLowerCase()
          ) {
            window.location.assign(`/galeri?id=${queryId}`);
            return;
          }

          setGallery(remote);
          setPhotos(remote.photosList || []);
          setMessages(remote.messagesList || []);
          setAllowGuestUploads(remote.allowGuestUploads ?? true);
          setAllowGuestMessages(remote.allowGuestMessages ?? true);
        }
      });
    }
  }, [queryId, user?.email]);

  const [packageType, setPackageType] = useState<"basic" | "premium">("basic");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showMidtransModal, setShowMidtransModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [notice, setNotice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Profile dropdown and settings modal
  const [profileOpen, setProfileOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileEmail, setProfileEmail] = useState(user?.email || "");

  // Guest settings
  const [allowGuestUploads, setAllowGuestUploads] = useState<boolean>(
    gallery.allowGuestUploads ?? true
  );
  const [allowGuestMessages, setAllowGuestMessages] = useState<boolean>(
    gallery.allowGuestMessages ?? true
  );

  const guestUrl = `${window.location.origin}/galeri?id=${gallery.id}`;

  const userInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : "U";

  const handleGuestUploadsChange = (enabled: boolean) => {
    setAllowGuestUploads(enabled);
    const userEmail = user?.email ? user.email.trim().toLowerCase() : gallery.userEmail;
    const updated: Gallery = {
      ...gallery,
      userEmail,
      allowGuestUploads: enabled,
    };
    setGallery(updated);
    updateGallery(updated);
    if (isSupabaseConfigured && userEmail) {
      saveGalleryToSupabase(updated, userEmail);
    }
    setNotice(
      enabled
        ? "Izin unggah foto dari tamu berhasil diaktifkan."
        : "Izin unggah foto dari tamu dinonaktifkan."
    );
  };

  const handleGuestMessagesChange = (enabled: boolean) => {
    setAllowGuestMessages(enabled);
    const userEmail = user?.email ? user.email.trim().toLowerCase() : gallery.userEmail;
    const updated: Gallery = {
      ...gallery,
      userEmail,
      allowGuestMessages: enabled,
    };
    setGallery(updated);
    updateGallery(updated);
    if (isSupabaseConfigured && userEmail) {
      saveGalleryToSupabase(updated, userEmail);
    }
    setNotice(
      enabled
        ? "Izin pesan kenangan dari tamu berhasil diaktifkan."
        : "Izin pesan kenangan dari tamu dinonaktifkan."
    );
  };

  const handleCoverChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setNotice("Pilih file gambar seperti JPG, PNG, atau WebP.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const userEmail = user?.email ? user.email.trim().toLowerCase() : gallery.userEmail;
        const updated: Gallery = {
          ...gallery,
          userEmail,
          image: reader.result,
        };
        setGallery(updated);
        updateGallery(updated);
        if (isSupabaseConfigured && userEmail) {
          saveGalleryToSupabase(updated, userEmail);
        }
        setNotice("Foto sampul album berhasil diperbarui!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;

    const selectedFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );
    if (selectedFiles.length === 0) return;

    setShowUpload(false);
    setNotice("Sedang mengunggah foto...");

    const createdPhotos: GalleryPhoto[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      let photoUrl = "";

      if (isSupabaseConfigured) {
        try {
          const uploadedUrl = await uploadImageToSupabase(file);
          if (uploadedUrl) {
            photoUrl = uploadedUrl;
          }
        } catch (err) {
          console.warn("Gagal upload ke Supabase Storage, menggunakan base64 fallback:", err);
        }
      }

      if (!photoUrl) {
        photoUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve("");
          reader.readAsDataURL(file);
        });
      }

      if (!photoUrl) continue;

      const newPhoto: GalleryPhoto = {
        id: Date.now() + i,
        url: photoUrl,
        name: file.name,
        uploaderName: user?.name || "Pemilik Galeri",
      };

      createdPhotos.push(newPhoto);

      if (isSupabaseConfigured) {
        await addPhotoToSupabase(gallery.id, newPhoto);
      }
    }

    if (createdPhotos.length > 0) {
      const nextPhotos = [...createdPhotos, ...photos];
      setPhotos(nextPhotos);

      const userEmail = user?.email ? user.email.trim().toLowerCase() : gallery.userEmail;
      const updated: Gallery = {
        ...gallery,
        userEmail,
        photos: nextPhotos.length,
        photosList: nextPhotos,
      };
      setGallery(updated);
      updateGallery(updated);
      if (isSupabaseConfigured && userEmail) {
        saveGalleryToSupabase(updated, userEmail);
      }
      setNotice(`${createdPhotos.length} foto berhasil ditambahkan ke galeri!`);
    } else {
      setNotice("Gagal mengunggah foto.");
    }
  };

  const handleDeletePhoto = async (id: number) => {
    const photo = photos.find((item) => item.id === id);
    if (photo && photo.url.startsWith("blob:")) {
      URL.revokeObjectURL(photo.url);
    }

    const nextPhotos = photos.filter((item) => item.id !== id);
    setPhotos(nextPhotos);

    const userEmail = user?.email ? user.email.trim().toLowerCase() : gallery.userEmail;
    const updated: Gallery = {
      ...gallery,
      userEmail,
      photos: nextPhotos.length,
      photosList: nextPhotos,
    };
    setGallery(updated);
    updateGallery(updated);

    if (isSupabaseConfigured) {
      await deletePhotoFromSupabase(gallery.id, id);
      if (userEmail) {
        saveGalleryToSupabase(updated, userEmail);
      }
    }
    setNotice("Foto berhasil dihapus.");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(guestUrl);
      setCopied(true);
      setNotice("Tautan galeri berhasil disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice("Salin tautan ini: " + guestUrl);
    }
  };

  const handleDownloadQR = (mode: "designed" | "plain" = "designed") => {
    const canvas = document.querySelector("#gd-guest-qr-canvas") as HTMLCanvasElement;
    if (canvas) {
      if (mode === "designed") {
        downloadDesignedQRCard({
          qrCanvas: canvas,
          title: gallery.title,
          category: gallery.category,
          eventDate: gallery.date,
          guestUrl,
        });
        setNotice("Kartu Desain QR Code berhasil diunduh (Format siap cetak).");
      } else {
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `QR-${gallery.title.replace(/\s+/g, "-")}.png`;
        downloadLink.click();
        setNotice("Gambar QR Code polos berhasil diunduh.");
      }
    }
  };

  const handleDownload = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmPlan = (plan: PlanDetail) => {
    setPackageType(plan.id);
    setShowConfirmModal(false);
    setShowMidtransModal(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;

    const updatedUser: UserProfile = {
      name: profileName.trim(),
      email: profileEmail.trim() || user?.email || "",
      avatar: user?.avatar,
    };

    saveUser(updatedUser);
    setUser(updatedUser);
    setShowProfileModal(false);
    setNotice("Profil berhasil diperbarui!");
  };

  const logout = () => {
    const confirmed = window.confirm("Yakin ingin keluar dari akun Anda?");
    if (confirmed) {
      removeUser();
      window.location.assign("/login");
    }
  };

  return (
    <div className="gd-page">
      {/* NAVBAR */}
      <header className="gd-navbar">
        <a className="gd-brand" href="/dashboard">
          <img
            src={logo}
            alt="Logo KenanganQR"
            className="gd-brand-logo"
            style={{ width: "32px", height: "32px", borderRadius: "6px" }}
          />
          <span className="gd-brand-text">
            Kenangan<span style={{ color: "#bd9841" }}>QR</span>
          </span>
        </a>

        {/* PROFILE SECTION DENGAN NAMA PENDAFTAR & MENU INTERAKTIF */}
        <div className="gd-account" style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "20px",
            }}
            aria-label="Menu akun"
          >
            <div className="gd-avatar gd-account-avatar">
              {userInitial}
            </div>

            <span className="gd-account-name" style={{ fontWeight: 600, color: "#342e24" }}>
              {user?.name || "Pengguna"}
            </span>

            <ChevronDown size={15} color="#8c7041" />
          </button>

          {profileOpen && (
            <div
              className="dashboard-profile-menu"
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "8px",
                width: "240px",
                zIndex: 100,
              }}
            >
              <div className="dashboard-profile-header">
                <span className="dashboard-avatar-large">{userInitial}</span>
                <div>
                  <p className="dashboard-profile-name">{user?.name || "Pengguna"}</p>
                  <p className="dashboard-profile-email">{user?.email || "Belum ada email"}</p>
                </div>
              </div>

              <div className="dashboard-profile-divider" />

              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  setProfileName(user?.name || "");
                  setProfileEmail(user?.email || "");
                  setShowProfileModal(true);
                }}
              >
                <Settings size={16} /> Pengaturan Profil
              </button>
              <button type="button" onClick={logout}>
                <LogOut size={16} /> Keluar
              </button>
            </div>
          )}
        </div>
      </header>

      {/* KONTEN UTAMA */}
      <main className="gd-main">
        <a className="gd-back-link" href="/dashboard">
          <ArrowLeft size={17} />
          Kembali ke Dashboard Galeri Saya
        </a>

        <div className="gd-layout">
          <section className="gd-primary">
            {/* HERO BANNER DENGAN FOTO SAMPUL YANG SESUAI DENGAN PILIHAN DI DASHBOARD */}
            <div
              className="gd-hero"
              style={{
                backgroundImage: `linear-gradient(90deg, rgba(20, 18, 14, 0.72) 0%, rgba(20, 18, 14, 0.25) 100%), url(${gallery.image || fallbackCover})`,
                backgroundPosition: "center",
                backgroundSize: "cover",
              }}
            >
              <div className="gd-hero-overlay" />

              <label className="gd-edit-button" style={{ cursor: "pointer" }}>
                <Camera size={15} />
                <span>Ganti Foto Sampul</span>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleCoverChange}
                />
              </label>

              <div className="gd-hero-content">
                <span className="gd-eyebrow">
                  {gallery.category?.toUpperCase() || "ALBUM KENANGAN"}
                </span>

                <h1>{gallery.title}</h1>

                <p className="gd-hero-date">
                  <CalendarDays size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
                  {gallery.date}
                  <span>•</span>
                  {photos.length} Foto
                  <span>•</span>
                  {messages.length} Pesan
                </p>

                {gallery.description && (
                  <p style={{ margin: "0 0 14px", fontSize: "13.5px", color: "rgba(255,255,255,0.85)", maxWidth: "600px" }}>
                    {gallery.description}
                  </p>
                )}

                <div className="gd-stats">
                  <div className="gd-stat">
                    <div>
                      <strong>{photos.length}</strong>
                      <span>Foto Tersimpan</span>
                    </div>
                  </div>

                  <div className="gd-stat">
                    <div>
                      <strong>{messages.length}</strong>
                      <span>Pesan Kenangan</span>
                    </div>
                  </div>

                  <div className="gd-stat">
                    <div>
                      <strong>{allowGuestUploads ? "Aktif" : "Nonaktif"}</strong>
                      <span>Upload Tamu</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* TAB TOOLBAR */}
            <div className="gd-content-toolbar">
              <div className="gd-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "Foto"}
                  className={activeTab === "Foto" ? "gd-tab active" : "gd-tab"}
                  onClick={() => setActiveTab("Foto")}
                >
                  <ImageIcon size={18} />
                  Foto ({photos.length})
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "Pesan Kenangan"}
                  className={
                    activeTab === "Pesan Kenangan"
                      ? "gd-tab active"
                      : "gd-tab"
                  }
                  onClick={() => setActiveTab("Pesan Kenangan")}
                >
                  <MessageCircle size={18} />
                  Pesan Kenangan ({messages.length})
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "Pengaturan"}
                  className={
                    activeTab === "Pengaturan" ? "gd-tab active" : "gd-tab"
                  }
                  onClick={() => setActiveTab("Pengaturan")}
                >
                  <Settings size={18} />
                  Pengaturan
                </button>
              </div>

              {activeTab === "Foto" && (
                <button
                  type="button"
                  className="gd-button gd-button-gold gd-upload-button"
                  onClick={() => setShowUpload(true)}
                >
                  <Upload size={17} />
                  Unggah Foto
                </button>
              )}
            </div>

            {/* TAB FOTO */}
            {activeTab === "Foto" && (
              <div className="gd-photo-section">
                {photos.length === 0 ? (
                  <div className="gd-empty">
                    <div className="gd-empty-icon">
                      <Camera size={30} />
                    </div>
                    <h3>Belum ada foto kenangan</h3>
                    <p>
                      Mulai kumpulkan momen spesial dengan mengunggah foto
                      pertama ke galeri ini.
                    </p>
                    <button
                      type="button"
                      className="gd-button gd-button-gold"
                      onClick={() => setShowUpload(true)}
                    >
                      <Upload size={17} />
                      Unggah Foto Pertama
                    </button>
                  </div>
                ) : (
                  <div className="gd-photo-grid">
                    {photos.map((photo) => (
                      <article className="gd-photo-card" key={photo.id}>
                        <img src={photo.url} alt={photo.name} />

                        <div className="gd-photo-caption">
                          <div className="gd-avatar">{userInitial}</div>
                          <span>{photo.name}</span>
                        </div>

                        <button
                          type="button"
                          className="gd-photo-delete"
                          aria-label={`Hapus ${photo.name}`}
                          onClick={() => handleDeletePhoto(photo.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB PESAN KENANGAN */}
            {activeTab === "Pesan Kenangan" && (
              <section className="gd-panel">
                <div className="gd-section-heading">
                  <div>
                    <h2>Pesan Kenangan</h2>
                    <p>Ucapan dan doa dari orang-orang tersayang untuk {gallery.title}.</p>
                  </div>
                  <span className="gd-count">{messages.length} pesan</span>
                </div>

                {messages.length === 0 ? (
                  <div className="gd-empty gd-empty-small">
                    <MessageCircle size={30} />
                    <h3>Belum ada pesan</h3>
                    <p>Pesan dari tamu yang memindai QR Code akan tampil di bagian ini.</p>
                  </div>
                ) : (
                  <div className="gd-message-list">
                    {messages.map((message) => (
                      <article className="gd-message" key={message.id}>
                        <div className="gd-avatar">{message.name.charAt(0)}</div>
                        <div>
                          <div className="gd-message-meta">
                            <strong>{message.name}</strong>
                            <span>{message.time}</span>
                          </div>
                          <p>{message.message}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* TAB PENGATURAN GALERI */}
            {activeTab === "Pengaturan" && (
              <section className="gd-panel">
                <div className="gd-settings">
                  <div className="gd-settings-heading">
                    <h2>Pengaturan Galeri</h2>
                    <p>Kelola izin dan cara tamu berinteraksi dengan galeri "{gallery.title}".</p>
                  </div>

                  {/* TOGGLE IZIN UPLOAD FOTO DARI TAMU */}
                  <div className="gd-setting-item">
                    <div className="gd-setting-info">
                      <h3>Unggahan foto dari tamu</h3>
                      <p>Atur izin apakah tamu yang memindai QR Code boleh menambahkan foto ke album ini.</p>
                      <span className={allowGuestUploads ? "gd-setting-status is-on" : "gd-setting-status"}>
                        {allowGuestUploads ? "✓ Diizinkan" : "✕ Tidak diizinkan"}
                      </span>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={allowGuestUploads}
                      aria-label="Izinkan unggahan foto dari tamu"
                      className={`gd-toggle ${allowGuestUploads ? "is-on" : ""}`}
                      onClick={() => handleGuestUploadsChange(!allowGuestUploads)}
                    >
                      <span className="gd-toggle-knob" />
                    </button>
                  </div>

                  {/* TOGGLE IZIN PESAN KENANGAN DARI TAMU */}
                  <div className="gd-setting-item">
                    <div className="gd-setting-info">
                      <h3>Pesan kenangan</h3>
                      <p>Atur izin apakah tamu boleh mengirim pesan ucapan dan doa di galeri ini.</p>
                      <span className={allowGuestMessages ? "gd-setting-status is-on" : "gd-setting-status"}>
                        {allowGuestMessages ? "✓ Diizinkan" : "✕ Tidak diizinkan"}
                      </span>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={allowGuestMessages}
                      aria-label="Izinkan pesan kenangan dari tamu"
                      className={`gd-toggle ${allowGuestMessages ? "is-on" : ""}`}
                      onClick={() => handleGuestMessagesChange(!allowGuestMessages)}
                    >
                      <span className="gd-toggle-knob" />
                    </button>
                  </div>

                  {/* FOTO SAMPUL PADA PENGATURAN */}
                  <div className="gd-setting-item" style={{ flexDirection: "column", alignItems: "flex-start", gap: "14px" }}>
                    <div className="gd-setting-info">
                      <h3>Foto Sampul Galeri</h3>
                      <p>Foto sampul utama yang dilihat tamu saat pertama kali membuka galeri Anda.</p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                      <img
                        src={gallery.image || fallbackCover}
                        alt="Sampul Galeri"
                        style={{
                          width: "120px",
                          height: "80px",
                          objectFit: "cover",
                          borderRadius: "8px",
                          border: "1px solid #e0d5c3",
                        }}
                      />
                      <button
                        type="button"
                        className="gd-button gd-button-outline"
                        onClick={() => coverInputRef.current?.click()}
                      >
                        <Camera size={16} /> Ganti Foto Sampul
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </section>

          {/* SIDEBAR DENGAN QR CODE WAJIB, UNDUH QR, & SALIN LINK */}
          <aside className="gd-sidebar">
            <section className="gd-side-card gd-qr-card">
              <div className="gd-card-heading">
                <span className="gd-heading-icon">
                  <QrCode size={21} />
                </span>
                <div>
                  <h2>QR untuk Tamu</h2>
                  <p>Ajak tamu membagikan foto dan pesan kenangan melalui QR ini.</p>
                </div>
              </div>

              {/* KARTU PREVIEW QR DENGAN KOTAK BERDESAIN (SIAP CETAK) */}
              <div
                style={{
                  background: "linear-gradient(145deg, #fdfbf7 0%, #faf3e8 100%)",
                  border: "2px solid #deb857",
                  borderRadius: "18px",
                  padding: "16px",
                  margin: "12px 0 16px",
                  textAlign: "center",
                  boxShadow: "0 8px 24px rgba(189, 152, 65, 0.12)",
                  position: "relative",
                }}
              >
                {/* Pill Top Brand */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#ffffff",
                    border: "1px solid #d4af37",
                    borderRadius: "20px",
                    padding: "3px 12px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#946800",
                    marginBottom: "8px",
                    letterSpacing: "0.5px",
                  }}
                >
                  <Sparkles size={12} />
                  <span>KENANGAN QR</span>
                </div>

                <h3
                  style={{
                    margin: "0 0 2px",
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#231f1a",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {gallery.title}
                </h3>
                <p style={{ margin: "0 0 12px", fontSize: "11.5px", color: "#8a661c", fontWeight: 500 }}>
                  ✦ {gallery.category} • {gallery.date} ✦
                </p>

                {/* Kotak Putih Tempat QR Code dengan Corner Accents */}
                <div
                  className="gd-qr-canvas-container"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "12px",
                    background: "#ffffff",
                    borderRadius: "14px",
                    border: "1.5px solid #e8cb85",
                    margin: "0 auto",
                    width: "fit-content",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <QRCodeCanvas
                    id="gd-guest-qr-canvas"
                    value={guestUrl}
                    size={155}
                    bgColor="#ffffff"
                    fgColor="#241e15"
                    level="H"
                    includeMargin={true}
                  />
                </div>

                {/* Scan me pill */}
                <div
                  style={{
                    display: "inline-block",
                    background: "linear-gradient(135deg, #d8ab3e 0%, #b5871f 100%)",
                    color: "#ffffff",
                    borderRadius: "16px",
                    padding: "4px 14px",
                    fontSize: "11px",
                    fontWeight: 700,
                    marginTop: "10px",
                    boxShadow: "0 2px 8px rgba(181, 135, 31, 0.3)",
                  }}
                >
                  📷 PINDAI SAYA
                </div>
              </div>

              <div className="gd-link-field">
                <span style={{ fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {guestUrl}
                </span>
                <button
                  type="button"
                  aria-label="Salin link"
                  onClick={handleCopyLink}
                >
                  {copied ? <Check size={17} color="#2e7d32" /> : <Copy size={17} />}
                </button>
              </div>

              {/* TOMBOL UNDUH QR DENGAN DESAIN KOTAK RESMI */}
              <button
                type="button"
                className="gd-button gd-button-gold gd-full-button"
                onClick={() => handleDownloadQR("designed")}
                title="Unduh kartu QR lengkap dengan kotak desain elegan siap cetak"
              >
                <Download size={17} />
                Unduh Desain Kartu QR (Siap Cetak)
              </button>

              {/* TOMBOL UNDUH QR POLOS */}
              <button
                type="button"
                className="gd-button gd-button-soft gd-full-button"
                style={{ fontSize: "12px", padding: "8px 12px" }}
                onClick={() => handleDownloadQR("plain")}
                title="Unduh hanya gambar QR Code polos"
              >
                <QrCode size={14} />
                Unduh QR Code Polos
              </button>

              {/* TOMBOL SALIN LINK */}
              <button
                type="button"
                className="gd-button gd-button-soft gd-full-button"
                onClick={handleCopyLink}
              >
                <LinkIcon size={17} />
                {copied ? "Link Berhasil Disalin!" : "Salin Link Galeri"}
              </button>
            </section>

            {/* PAKET DOWNLOAD / BERLANGGANAN */}
            <section className="gd-side-card">
              <div className="gd-card-heading">
                <span className="gd-heading-icon">
                  <CreditCard size={20} />
                </span>
                <div>
                  <h2>Paket Berlangganan</h2>
                  <p>Tingkatkan paket untuk kapasitas tak terbatas & unduh foto HD.</p>
                </div>
              </div>

              <div className="gd-package-options">
                <button
                  type="button"
                  className={
                    packageType === "basic"
                      ? "gd-package selected"
                      : "gd-package"
                  }
                  onClick={() => {
                    setPackageType("basic");
                    setShowConfirmModal(true);
                  }}
                  title="Pilih Paket Basic (Rp 19.000)"
                >
                  <span className="gd-package-top">
                    Basic
                    <span className="gd-radio-dot" />
                  </span>
                  <strong>Rp 19.000</strong>
                  <small>7 hari akses</small>
                </button>

                <button
                  type="button"
                  className={
                    packageType === "premium"
                      ? "gd-package selected"
                      : "gd-package"
                  }
                  onClick={() => {
                    setPackageType("premium");
                    setShowConfirmModal(true);
                  }}
                  title="Pilih Paket Premium (Rp 50.000)"
                >
                  <span className="gd-package-top">
                    Premium
                    <span className="gd-radio-dot" />
                  </span>
                  <strong>Rp 50.000</strong>
                  <small>30 hari akses</small>
                </button>
              </div>

              <button
                type="button"
                className="gd-button gd-button-gold gd-full-button"
                onClick={handleDownload}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                <CreditCard size={18} />
                <span>Pilih & Lanjutkan ({packageType === "premium" ? "Rp 50.000" : "Rp 19.000"})</span>
              </button>
            </section>
          </aside>
        </div>
      </main>

      {/* MODAL UNGGAH FOTO */}
      {showUpload && (
        <div
          className="gd-modal-backdrop"
          onClick={() => setShowUpload(false)}
        >
          <section
            className="gd-upload-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gd-upload-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="gd-modal-close"
              aria-label="Tutup"
              onClick={() => setShowUpload(false)}
            >
              ×
            </button>

            <div className="gd-empty-icon">
              <Upload size={28} />
            </div>
            <h2 id="gd-upload-title">Unggah Foto</h2>
            <p>Pilih foto kenangan dari perangkat Anda untuk album "{gallery.title}".</p>

            <button
              type="button"
              className="gd-upload-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon size={28} />
              <strong>Klik untuk memilih foto</strong>
              <span>Format JPG, PNG, atau WEBP</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => handleUpload(event.target.files)}
            />

            <button
              type="button"
              className="gd-button gd-button-outline gd-full-button"
              onClick={() => setShowUpload(false)}
            >
              Batal
            </button>
          </section>
        </div>
      )}

      {/* MODAL PENGATURAN PROFIL DARI GALLERY DETAIL */}
      {showProfileModal && (
        <div
          className="dashboard-modal-backdrop"
          onClick={() => setShowProfileModal(false)}
        >
          <section
            className="dashboard-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dashboard-modal-heading">
              <div>
                <h2>Pengaturan Profil</h2>
                <p>Sesuaikan nama akun dan email Anda.</p>
              </div>
              <button
                type="button"
                className="dashboard-modal-close"
                onClick={() => setShowProfileModal(false)}
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            <div className="profile-edit-avatar-preview">
              <span className="dashboard-avatar-large">
                {profileName.trim().charAt(0).toUpperCase() || userInitial}
              </span>
              <div>
                <strong>Inisial Tampilan: {profileName.trim().charAt(0).toUpperCase() || userInitial}</strong>
                <p>Inisial ini akan muncul di pojok kanan atas navbar Anda.</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile}>
              <label htmlFor="gd-profile-name">Nama Lengkap</label>
              <input
                id="gd-profile-name"
                type="text"
                placeholder="Nama lengkap Anda"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
              />

              <label htmlFor="gd-profile-email">Alamat Email</label>
              <input
                id="gd-profile-email"
                type="email"
                placeholder="nama@email.com"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
              />

              <div className="dashboard-modal-actions">
                <button
                  type="button"
                  className="dashboard-modal-cancel"
                  onClick={() => setShowProfileModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="dashboard-modal-submit">
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* FEEDBACK NOTICE TOAST */}
      {notice && (
        <div className="gd-toast" role="status">
          <span>{notice}</span>
          <button
            type="button"
            aria-label="Tutup pesan"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}

      {/* MODAL KONFIRMASI PERTANYAAN YAKIN SEBELUM MIDTRANS */}
      <ConfirmSubscriptionModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        selectedPlanId={packageType}
        onConfirm={handleConfirmPlan}
      />

      {/* MODAL PEMBAYARAN MIDTRANS */}
      <MidtransPaymentModal
        isOpen={showMidtransModal}
        onClose={() => setShowMidtransModal(false)}
        planName={packageType === "premium" ? "Premium" : "Basic"}
        planPrice={packageType === "premium" ? 50000 : 19000}
        planDuration={packageType === "premium" ? "30 hari akses" : "7 hari akses"}
        userEmail={user?.email || gallery.userEmail || "user@kenanganqr.com"}
        userName={user?.name || "Pengguna KenanganQR"}
        onPaymentSuccess={(info) => {
          setNotice(`Pembayaran Midtrans berhasil (${info.orderId})! Paket ${info.planName} aktif.`);
        }}
      />
    </div>
  );
}

export default GalleryDetail;
