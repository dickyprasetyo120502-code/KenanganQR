import { useState, type MouseEvent } from "react";
import { Images, QrCode, Users } from "lucide-react";

import heroImage from "../assets/hero-kenangan.jpg";
import logoImage from "../assets/logo.jpg";
import { getUser } from "../utils/storage";
import MidtransPaymentModal from "../components/MidtransPaymentModal";
import ConfirmSubscriptionModal, { type PlanDetail } from "../components/ConfirmSubscriptionModal";
import "../styles/home.css";
const features = [
  {
    number: "1",
    icon: Images,
    title: "Buat Galeri",
    description: "Buat album digital untuk menyimpan foto dan video acara kamu.",
  },
  {
    number: "2",
    icon: QrCode,
    title: "Dapatkan QR Code",
    description: "Bagikan QR Code agar teman dan keluarga bisa membuka galeri.",
  },
  {
    number: "3",
    icon: Users,
    title: "Kumpulkan Kenangan",
    description: "Kumpulkan foto, video, dan momen berharga dari semua orang.",
  },
];

const plans = [
  {
    name: "Gratis",
    price: "Rp 0",
    period: "7 hari",
    description: "Coba buat kenangan pertamamu.",
    features: ["Galeri dasar", "Unggah foto", "Berlaku 7 hari"],
    button: "Mulai Gratis",
    className: "",
  },
  {
    name: "Basic",
    price: "Rp 19.000",
    period: "30 hari",
    description: "Untuk momen spesial bersama.",
    features: [
      "Galeri premium",
      "Upload foto dan video",
      "Video hingga 1 GB",
      "Kustomisasi tema",
    ],
    button: "Pilih Basic",
    className: "",
  },
  {
    name: "Premium",
    price: "Rp 50.000",
    period: "30 hari",
    description: "Kenangan spesial untuk momen besar.",
    features: [
      "Semua fitur Basic",
      "Video hingga 5 GB",
      "Statistik kunjungan",
      "Tampilan eksklusif",
    ],
    button: "Pilih Premium",
    className: "plan-featured",
  },
];

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmPlanId, setConfirmPlanId] = useState<"basic" | "premium">("basic");
  const [showMidtransModal, setShowMidtransModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState({
    name: "Premium",
    price: 50000,
    duration: "30 hari akses",
  });
  const user = getUser();

  const handleStartGallery = (event?: MouseEvent) => {
    if (event) event.preventDefault();
    setMenuOpen(false);
    if (user) {
      window.location.href = "/dashboard/create";
    } else {
      window.location.href = "/login?redirect=/dashboard/create";
    }
  };

  const handlePlanClick = (event: MouseEvent, plan: (typeof plans)[0]) => {
    event.preventDefault();
    if (plan.name === "Gratis") {
      handleStartGallery();
      return;
    }
    const isPrem = plan.name === "Premium";
    setConfirmPlanId(isPrem ? "premium" : "basic");
    setShowConfirmModal(true);
  };

  const handleConfirmHomePlan = (plan: PlanDetail) => {
    setSelectedPlan({
      name: plan.name,
      price: plan.price,
      duration: plan.duration,
    });
    setShowConfirmModal(false);
    setShowMidtransModal(true);
  };

  return (
    <main className="home-page">
      <header className="site-header">
        <a
          className="brand"
          href="#home"
          aria-label="KenanganQR beranda"
        >
          <img src={logoImage} alt="" className="brand-logo" />

          <span className="brand-name">
            Kenangan<span>QR</span>
          </span>
        </a>

        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        <nav className={menuOpen ? "site-nav nav-open" : "site-nav"}>
          <a href="#home" onClick={() => setMenuOpen(false)}>
            Beranda
          </a>

          <a href="#cara-kerja" onClick={() => setMenuOpen(false)}>
            Cara Kerja
          </a>

          <a href="#harga" onClick={() => setMenuOpen(false)}>
            Harga
          </a>

          {user ? (
            <a
              className="nav-login"
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
            >
              Dashboard
            </a>
          ) : (
            <a
              className="nav-login"
              href="/login"
              onClick={() => setMenuOpen(false)}
            >
              Masuk
            </a>
          )}

          <a
            className="nav-register"
            href="/login?redirect=/dashboard/create"
            onClick={handleStartGallery}
          >
            Buat Galeri ↗
          </a>
        </nav>
      </header>

      <section className="hero-section" id="home">
        <div className="hero-image">
          <img
            className="hero-photo"
            src={heroImage}
            alt="Momen kenangan bersama orang tercinta"
          />

          <div className="hero-image-overlay" />

          <div className="hero-content">
            <p className="eyebrow hero-eyebrow">
              ABADIKAN SETIAP CERITA
            </p>

            <h1>
              Satu QR,
              <br />
              Ribuan
              <br />
              Kenangan.
            </h1>

            <p className="hero-description">
              Kumpulkan foto, video, dan ucapan dari orang-orang
              tercinta dalam satu galeri, cukup dengan satu QR Code.
            </p>

            <a
              className="gold-button"
              href="/login?redirect=/dashboard/create"
              onClick={handleStartGallery}
            >
              Buat Galeri Gratis <span>→</span>
            </a>
          </div>
        </div>
      </section>

      
      <section className="how-section section-shell" id="cara-kerja">
        <div className="section-heading">
          <p className="eyebrow">SIMPLE DAN BERMAKNA</p>
          <h2>Cara Kerja</h2>
          <p>
            Buat galeri kenangan dalam hitungan menit,
            lalu bagikan QR Code-mu.
          </p>
        </div>

        <div className="steps-grid">
          {features.map((feature) => (
            <article className="step-card" key={feature.number}>
              <div className="step-icon-wrap">
                <span className="step-number">{feature.number}</span>
                <feature.icon className="step-icon" size={32} strokeWidth={1.8} />
              </div>

              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pricing-section section-shell" id="harga">
        <div className="section-heading">
          <p className="eyebrow">PILIH PAKET TERBAIK</p>
          <h2>Harga yang Fleksibel</h2>
          <p>
            Mulai gratis, dan tingkatkan kapan saja sesuai kebutuhanmu.
          </p>
          
        </div>

        <div className="pricing-grid">
          {plans.map((plan) => (
            <article
              className={`price-card ${plan.className}`}
              key={plan.name}
            >
              {plan.name === "Premium" && (
                <span className="popular-label">PALING POPULER</span>
              )}

              <h3>{plan.name}</h3>
              <p className="plan-description">{plan.description}</p>

              <div className="plan-price">
                <strong>{plan.price}</strong>
                <span>/ {plan.period}</span>
              </div>

              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <span>✓</span> {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={
                  plan.className
                    ? "plan-button plan-button-gold"
                    : "plan-button"
                }
                onClick={(e) => handlePlanClick(e, plan)}
              >
                {plan.name === "Gratis" ? plan.button : `Bayar ${plan.name} (Midtrans)`}
              </button>
            </article>
          ))}
        </div>

        <p className="pricing-note">
          &nbsp; Karena setiap kenangan pantas untuk selamanya.
        </p>
      </section>

      <section className="closing-section" id="mulai">
        <p className="eyebrow">MOMENMU LAYAK DIKENANG</p>

        <h2>Setiap kenangan punya cerita.</h2>

        <p>
          Mulai kumpulkan cerita dari orang-orang yang berarti bagimu.
        </p>

        <a
          className="gold-button"
          href="/login?redirect=/dashboard/create"
          onClick={handleStartGallery}
        >
          Mulai Buat Kenangan <span>→</span>
        </a>
      </section>

      <footer className="site-footer">
        <a className="brand" href="#home">
          <img src={logoImage} alt="" className="brand-logo" />

          <span className="brand-name">
            Kenangan<span>QR</span>
          </span>
        </a>

        <p>Setiap momen berarti, setiap cerita abadi.</p>
        <span>© 2026 KenanganQR</span>
      </footer>

      {/* MODAL KONFIRMASI SEBELUM MIDTRANS */}
      <ConfirmSubscriptionModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        selectedPlanId={confirmPlanId}
        onConfirm={handleConfirmHomePlan}
      />

      {/* MODAL PEMBAYARAN MIDTRANS */}
      <MidtransPaymentModal
        isOpen={showMidtransModal}
        onClose={() => setShowMidtransModal(false)}
        planName={selectedPlan.name}
        planPrice={selectedPlan.price}
        planDuration={selectedPlan.duration}
        userEmail={user?.email || ""}
        userName={user?.name || ""}
        onPaymentSuccess={(info) => {
          alert(`Pembayaran Midtrans berhasil (${info.orderId})! Paket ${info.planName} aktif.`);
          window.location.href = user ? "/dashboard" : "/login?redirect=/dashboard";
        }}
      />
    </main>
  );
}

export default Home;