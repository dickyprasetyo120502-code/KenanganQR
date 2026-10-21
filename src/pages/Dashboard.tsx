import logoImage from "../assets/logo.jpg";
import { useMemo, useState, useRef, useEffect } from "react";
import {
  Image,
  MessageSquare,
  Users,
  PlusCircle,
  CalendarDays,
  QrCode,
  Eye,
  Settings,
  MoreVertical,
  Gift,
  Heart,
  ChevronDown,
  Search,
  Plus,
  X,
  LogOut,
  Images,
  HelpCircle,
  Download,
  Copy,
  Check,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

import {
  getUser,
  saveUser,
  removeUser,
  getGalleries,
  saveGalleries,
  type UserProfile,
  type Gallery,
} from "../utils/storage";

import {
  fetchAllGalleriesFromSupabase,
  saveGalleryToSupabase,
  deleteGalleryFromSupabase,
  isSupabaseConfigured,
} from "../lib/supabase";

import "../styles/dashboard.css";

function Dashboard() {
  const [user, setUser] = useState<UserProfile | null>(() => getUser());
  const [galleries, setGalleries] = useState<Gallery[]>(() =>
    getGalleries(user?.email)
  );

  useEffect(() => {
    // Jika belum login, arahkan ke halaman login
    if (!user || !user.email) {
      window.location.assign("/login");
      return;
    }

    // Ambil HANYA galeri milik user yang sedang login
    if (isSupabaseConfigured) {
      fetchAllGalleriesFromSupabase(user.email).then((remote) => {
        if (remote) {
          setGalleries(remote);
          saveGalleries(remote, user.email);
        }
      });
    }
  }, [user?.email]);

  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] =
    useState<string>("Pernikahan");
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [selectedQR, setSelectedQR] = useState<Gallery | null>(null);
  const [notice, setNotice] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Profile modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileEmail, setProfileEmail] = useState(user?.email || "");

  // Name required prompt if user has no name
  const isNameMissing = !user || !user.name || user.name.trim().length === 0;
  const [showNamePrompt, setShowNamePrompt] = useState(isNameMissing);
  const [promptName, setPromptName] = useState("");

  const qrCanvasRef = useRef<HTMLDivElement>(null);

  const filteredGalleries = useMemo(
    () =>
      galleries.filter((gallery) =>
        gallery.title.toLowerCase().includes(search.toLowerCase())
      ),
    [galleries, search]
  );

  const userInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : "U";

  function handleSaveGalleries(nextGalleries: Gallery[]) {
    setGalleries(nextGalleries);
    saveGalleries(nextGalleries, user?.email);
  }

  async function createGallery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = newTitle.trim();

    if (!title) {
      setNotice("Masukkan nama galeri terlebih dahulu.");
      return;
    }

    const gallery: Gallery = {
      id: Date.now(),
      userEmail: user?.email ? user.email.trim().toLowerCase() : undefined,
      title,
      category: newCategory,
      date: new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      photos: 0,
      messages: 0,
      guests: 0,
      image:
        "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=85",
      allowGuestUploads: true,
      allowGuestMessages: true,
      isNew: true,
    };

    handleSaveGalleries([gallery, ...galleries]);

    if (isSupabaseConfigured && user?.email) {
      await saveGalleryToSupabase(gallery, user.email);
    }

    setNewTitle("");
    setNewCategory("Pernikahan");
    setShowCreate(false);
    setNotice("Galeri berhasil dibuat!");
  }

  async function deleteGallery(id: number) {
    const confirmed = window.confirm("Yakin ingin menghapus galeri ini?");
    if (!confirmed) return;

    handleSaveGalleries(galleries.filter((gallery) => gallery.id !== id));
    setActiveMenu(null);

    // Hapus dari Supabase agar permanen
    if (isSupabaseConfigured && user?.email) {
      await deleteGalleryFromSupabase(id, user.email);
    }

    setNotice("Galeri berhasil dihapus.");
  }

  function viewGallery(gallery: Gallery) {
    window.location.assign(`/gallery-detail?id=${gallery.id}&tab=Foto`);
  }

  function manageGallery(gallery: Gallery) {
    window.location.assign(`/gallery-detail?id=${gallery.id}&tab=Pengaturan`);
  }

  function logout() {
    const confirmed = window.confirm("Yakin ingin keluar dari akun Anda?");
    if (confirmed) {
      removeUser();
      window.location.assign("/login");
    }
  }

  function handleSaveProfile(e: React.FormEvent) {
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
  }

  function handleSaveFirstTimeName(e: React.FormEvent) {
    e.preventDefault();
    if (!promptName.trim()) return;

    const updatedUser: UserProfile = {
      name: promptName.trim(),
      email: user?.email || "pengguna@kenanganqr.id",
      avatar: user?.avatar,
    };

    saveUser(updatedUser);
    setUser(updatedUser);
    setShowNamePrompt(false);
    setNotice(`Selamat datang, ${updatedUser.name}!`);
  }

  const handleCopyLink = async (gallery: Gallery) => {
    const link = `${window.location.origin}/galeri?id=${gallery.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(gallery.id);
      setNotice(`Link galeri tamu "${gallery.title}" berhasil disalin!`);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      setNotice(`Salin manual: ${link}`);
    }
  };

  const handleDownloadQR = (gallery: Gallery) => {
    const canvas = document.querySelector("#dashboard-qr-canvas") as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `QR-${gallery.title.replace(/\s+/g, "-")}.png`;
      downloadLink.click();
      setNotice("QR Code berhasil diunduh.");
    }
  };

  return (
    <main className="dashboard-page">
      <header className="dashboard-navbar">
        <a href="/" className="dashboard-brand">
          <img
            src={logoImage}
            alt="Logo KenanganQR"
            className="dashboard-brand-logo"
          />
          <span>
            Kenangan<span className="dashboard-brand-gold">QR</span>
          </span>
        </a>

        <div className="dashboard-profile">
          <button
            type="button"
            className="dashboard-profile-button"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label="Buka menu profil"
          >
            <span className="dashboard-avatar">{userInitial}</span>
            <span className="dashboard-profile-btn-name">{user?.name || "Profil"}</span>
            <ChevronDown size={16} />
          </button>

          {profileOpen && (
            <div className="dashboard-profile-menu">
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
              <button
                type="button"
                onClick={() => {
                  const confirmed = window.confirm(
                    "Apakah Anda yakin ingin mengosongkan semua data galeri dan memulai dari awal seperti baru?"
                  );
                  if (confirmed) {
                    localStorage.removeItem("kenanganqr-galleries");
                    setGalleries([]);
                    setProfileOpen(false);
                    setNotice("Semua galeri berhasil dikosongkan. Anda dapat mulai membuat galeri baru!");
                  }
                }}
                style={{ color: "#b94a48" }}
              >
                <X size={16} /> Kosongkan Galeri (Mulai Baru)
              </button>
              <button type="button" onClick={logout}>
                <LogOut size={16} /> Keluar
              </button>
            </div>
          )}
        </div>
      </header>

      <section className="dashboard-content">
        <div className="dashboard-heading">
          <div>
            <h1>Galeri Saya</h1>
            <p>Kelola semua galeri kenangan Anda</p>
          </div>

          <button
            type="button"
            className="dashboard-create-button"
            onClick={() => {
              window.location.href = "/dashboard/create";
            }}
          >
            <PlusCircle size={20} />
            Buat Galeri Baru
          </button>
        </div>

        {notice && (
          <div className="dashboard-notice" role="status">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Tutup pesan"
            >
              <X size={17} />
            </button>
          </div>
        )}

        <div className="dashboard-stats">
          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon">
              <Image size={23} />
            </span>
            <div>
              <strong>{galleries.length}</strong>
              <span>Galeri Aktif</span>
            </div>
          </article>

          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon">
              <Images size={23} />
            </span>
            <div>
              <strong>
                {galleries.reduce((total, gallery) => total + gallery.photos, 0)}
              </strong>
              <span>Total Foto</span>
            </div>
          </article>

          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon">
              <MessageSquare size={23} />
            </span>
            <div>
              <strong>
                {galleries.reduce(
                  (total, gallery) => total + gallery.messages,
                  0
                )}
              </strong>
              <span>Pesan Kenangan</span>
            </div>
          </article>

          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon">
              <Users size={23} />
            </span>
            <div>
              <strong>
                {galleries.reduce((total, gallery) => total + gallery.guests, 0)}
              </strong>
              <span>Tamu Hari Ini</span>
            </div>
          </article>
        </div>

        <div className="dashboard-gallery-toolbar">
          <h2>Semua Galeri</h2>
          <label className="dashboard-search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Cari nama galeri..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        {filteredGalleries.length > 0 ? (
          <div className="dashboard-gallery-grid">
            {filteredGalleries.map((gallery) => (
              <article className="dashboard-gallery-card" key={gallery.id}>
                <div className="dashboard-gallery-image-wrap">
                  {gallery.image ? (
                    <img
                      src={gallery.image}
                      alt={gallery.title}
                      className="dashboard-gallery-image"
                    />
                  ) : (
                    <div className="dashboard-gallery-image dashboard-gallery-placeholder">
                      <Images size={34} />
                      <span>Belum ada foto sampul</span>
                    </div>
                  )}
                  {gallery.isNew && (
                    <span className="dashboard-new-badge">
                      <span>★</span> Baru
                    </span>
                  )}
                </div>

                <div className="dashboard-gallery-body">
                  <h3>{gallery.title}</h3>

                  <span
                    className={`dashboard-category dashboard-category-${
                      gallery.category === "Ulang Tahun"
                        ? "birthday"
                        : gallery.category === "Reuni"
                        ? "reunion"
                        : "wedding"
                    }`}
                  >
                    {gallery.category === "Pernikahan" ? (
                      <Heart size={14} fill="currentColor" />
                    ) : gallery.category === "Ulang Tahun" ? (
                      <Gift size={14} />
                    ) : (
                      <Users size={14} />
                    )}
                    {gallery.category}
                  </span>

                  <div className="dashboard-gallery-details">
                    <div className="dashboard-gallery-date">
                      <CalendarDays size={16} />
                      <span>{gallery.date}</span>
                    </div>

                    <button
                      type="button"
                      className="dashboard-qr-preview"
                      onClick={() => setSelectedQR(gallery)}
                      aria-label={`Lihat QR Code ${gallery.title}`}
                    >
                      <QRCodeCanvas
                        value={`${window.location.origin}/galeri?id=${gallery.id}`}
                        size={38}
                        bgColor="#ffffff"
                        fgColor="#2b2319"
                        level="M"
                      />
                      <span>Bagikan QR</span>
                    </button>

                    <div className="dashboard-gallery-meta">
                      <span>
                        <Image size={16} /> {gallery.photos} foto
                      </span>
                      <span className="dashboard-meta-dot">·</span>
                      <span>
                        <MessageSquare size={16} /> {gallery.messages} pesan
                      </span>
                    </div>
                  </div>

                  <div className="dashboard-gallery-actions">
                    <button
                      type="button"
                      className="dashboard-view-button"
                      onClick={() => viewGallery(gallery)}
                    >
                      <Eye size={18} /> Lihat
                    </button>
                    <button
                      type="button"
                      className="dashboard-manage-button"
                      onClick={() => manageGallery(gallery)}
                    >
                      <Settings size={18} /> Kelola
                    </button>
                    <div className="dashboard-more-wrap">
                      <button
                        type="button"
                        className="dashboard-more-button"
                        aria-label={`Menu ${gallery.title}`}
                        onClick={() =>
                          setActiveMenu(
                            activeMenu === gallery.id ? null : gallery.id
                          )
                        }
                      >
                        <MoreVertical size={20} />
                      </button>

                      {activeMenu === gallery.id && (
                        <div className="dashboard-more-menu">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedQR(gallery);
                              setActiveMenu(null);
                            }}
                          >
                            <QrCode size={15} /> Tampilkan QR
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              manageGallery(gallery);
                              setActiveMenu(null);
                            }}
                          >
                            <Settings size={15} /> Kelola galeri
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleCopyLink(gallery);
                              setActiveMenu(null);
                            }}
                          >
                            {copiedId === gallery.id ? (
                              <Check size={15} color="#2e7d32" />
                            ) : (
                              <Copy size={15} />
                            )}
                            Salin tautan
                          </button>
                          <button
                            type="button"
                            className="dashboard-delete-action"
                            onClick={() => deleteGallery(gallery.id)}
                          >
                            <X size={15} /> Hapus galeri
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty">
            <Images size={42} />
            <h3>Galeri belum ada atau tidak ditemukan</h3>
            <p>Mulai simpan kenangan pertama dengan membuat galeri baru.</p>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/dashboard/create";
              }}
            >
              <Plus size={18} /> Buat Galeri
            </button>
          </div>
        )}

        <footer className="dashboard-footer">
          <span>© 2026 KenanganQR</span>
          <span>
            <HelpCircle size={15} /> Setiap kenangan layak disimpan.
          </span>
        </footer>
      </section>

      {/* MODAL BUAT CEPAT */}
      {showCreate && (
        <div
          className="dashboard-modal-backdrop"
          onClick={() => setShowCreate(false)}
        >
          <section
            className="dashboard-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-gallery-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dashboard-modal-heading">
              <div>
                <h2 id="create-gallery-title">Buat Galeri Baru</h2>
                <p>Mulai kumpulkan momen berharga Anda.</p>
              </div>
              <button
                type="button"
                className="dashboard-modal-close"
                onClick={() => setShowCreate(false)}
                aria-label="Tutup formulir"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createGallery}>
              <label htmlFor="gallery-title">Nama Galeri</label>
              <input
                id="gallery-title"
                type="text"
                placeholder="Contoh: Pernikahan Rara & Bima"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                required
                autoFocus
              />

              <label htmlFor="gallery-category">Kategori</label>
              <select
                id="gallery-category"
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
              >
                <option value="Pernikahan">💍 Pernikahan</option>
                <option value="Ulang Tahun">🎂 Ulang Tahun</option>
                <option value="Reuni">🤝 Reuni</option>
                <option value="Wisuda">🎓 Wisuda</option>
                <option value="Keluarga">🏡 Keluarga</option>
                <option value="Liburan & Traveling">✈️ Liburan & Traveling</option>
                <option value="Lainnya">✨ Lainnya</option>
              </select>

              <div className="dashboard-modal-actions">
                <button
                  type="button"
                  className="dashboard-modal-cancel"
                  onClick={() => setShowCreate(false)}
                >
                  Batal
                </button>
                <button type="submit" className="dashboard-modal-submit">
                  <PlusCircle size={18} /> Buat Galeri
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* MODAL QR CODE INTERAKTIF DENGAN FITUR UNDUH & SALIN */}
      {selectedQR && (
        <div
          className="dashboard-modal-backdrop"
          onClick={() => setSelectedQR(null)}
        >
          <section
            className="dashboard-modal dashboard-qr-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="dashboard-modal-close dashboard-qr-close"
              onClick={() => setSelectedQR(null)}
              aria-label="Tutup QR Code"
            >
              <X size={20} />
            </button>

            <span className="dashboard-qr-large-icon">
              <QrCode size={27} />
            </span>
            <h2 id="qr-modal-title">QR Code untuk Tamu</h2>
            <p className="dashboard-qr-gallery-title">{selectedQR.title}</p>

            <div className="dashboard-qr-canvas-card" ref={qrCanvasRef}>
              <QRCodeCanvas
                id="dashboard-qr-canvas"
                value={`${window.location.origin}/galeri?id=${selectedQR.id}`}
                size={220}
                bgColor="#ffffff"
                fgColor="#241e15"
                level="H"
                includeMargin={true}
              />
            </div>

            <p className="dashboard-qr-note">
              Ajak tamu memindai QR Code ini untuk melihat foto dan mengirimkan ucapan langsung.
            </p>

            <div className="dashboard-qr-modal-actions">
              <button
                type="button"
                className="dashboard-modal-submit"
                onClick={() => handleDownloadQR(selectedQR)}
              >
                <Download size={18} />
                Unduh Gambar QR
              </button>

              <button
                type="button"
                className="dashboard-modal-cancel"
                onClick={() => handleCopyLink(selectedQR)}
              >
                {copiedId === selectedQR.id ? (
                  <>
                    <Check size={18} color="#2e7d32" />
                    Tersalin!
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    Salin Link
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* MODAL PENGATURAN PROFIL PENGGUNA */}
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
                <p>Sesuaikan data akun dan nama tampilan Anda.</p>
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
              <label htmlFor="profile-name">Nama Lengkap</label>
              <input
                id="profile-name"
                type="text"
                placeholder="Nama lengkap Anda"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
              />

              <label htmlFor="profile-email">Alamat Email</label>
              <input
                id="profile-email"
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

      {/* PROMPT NAMA SAAT GMAIL PERTAMA KALI / NAMA KOSONG */}
      {showNamePrompt && (
        <div className="dashboard-modal-backdrop">
          <section
            className="dashboard-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dashboard-modal-heading">
              <div>
                <h2>Lengkapi Profil Anda</h2>
                <p>Masukkan nama Anda untuk memulai menggunakan KenanganQR.</p>
              </div>
            </div>

            <form onSubmit={handleSaveFirstTimeName}>
              <label htmlFor="first-name">Nama Lengkap Anda</label>
              <input
                id="first-name"
                type="text"
                placeholder="Contoh: Rina Septiani"
                value={promptName}
                onChange={(e) => setPromptName(e.target.value)}
                required
                autoFocus
              />

              <button
                type="submit"
                className="dashboard-modal-submit"
                style={{ width: "100%", marginTop: "16px" }}
              >
                Simpan & Mulai Gunakan
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default Dashboard;
