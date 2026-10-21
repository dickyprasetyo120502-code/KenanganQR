import { useGoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, User, ArrowRight } from "lucide-react";

import heroImage from "../assets/login.jpg";
import logoImage from "../assets/logo.jpg";
import { saveUser, getUser } from "../utils/storage";
import "../styles/auth.css";

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  // Modal to complete name if needed
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingUser, setPendingUser] = useState<{ email: string; avatar?: string } | null>(null);
  const [fullName, setFullName] = useState("");

  const params = new URLSearchParams(window.location.search);
  const redirectUrl = params.get("redirect") || "/dashboard";

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const response = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Gagal mengambil akun Google.");
        }

        const data = await response.json();
        
        // If Google provides a name, check or ask
        if (data.name && data.name.trim().length > 0) {
          saveUser({
            name: data.name.trim(),
            email: data.email,
            avatar: data.picture,
          });
          window.location.href = redirectUrl;
        } else {
          // Name is missing, prompt user to enter their name first
          setPendingUser({ email: data.email, avatar: data.picture });
          setShowNameModal(true);
        }
      } catch {
        setMessage("Login Google gagal. Silakan coba lagi.");
      }
    },
    onError: () => {
      setMessage("Login Google dibatalkan atau gagal.");
    },
  });

  function handleSaveNameModal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fullName.trim() || !pendingUser) return;

    saveUser({
      name: fullName.trim(),
      email: pendingUser.email,
      avatar: pendingUser.avatar,
    });

    window.location.href = redirectUrl;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setMessage("Silakan masukkan email dan kata sandi.");
      return;
    }

    // Check if user already exists
    const existing = getUser();
    const displayName =
      existing && existing.email === email && existing.name
        ? existing.name
        : email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    saveUser({
      name: displayName,
      email: email.trim(),
      avatar: existing?.avatar,
    });

    window.location.href = redirectUrl;
  }

  return (
    <main className="login-design">
      {/* NAVBAR */}
      <header className="login-navbar">
        <a href="/" className="login-brand">
          <img src={logoImage} alt="" />
          <span>
            Kenangan<span className="login-gold-text">QR</span>
          </span>
        </a>

        
      </header>

      {/* KONTEN UTAMA */}
      <section className="login-layout">
        {/* FOTO KIRI */}
        <div className="login-photo-panel">
          <img
            src={heroImage}
            alt="Momen pernikahan dan kebersamaan keluarga"
            className="login-photo"
          />

          <div className="login-photo-shade" />

          <div className="login-photo-quote">
            <h1>
              “Setiap kenangan
              <br />
              layak disimpan”
            </h1>
            <span className="login-quote-line" />
          </div>
        </div>

        

        {/* FORM LOGIN */}
<div className="login-form-panel">
  <div className="login-form-card">

    {/* LINK KEMBALI KE BERANDA */}
    <a href="/" className="back-home-link">
      ← Kembali ke Beranda
    </a>

    <h2>Selamat Datang Kembali</h2>
    <p className="login-description">
      Masuk untuk mengelola galeri kenangan Anda
    </p>

            <form onSubmit={handleSubmit}>
              <div className="login-input-box">
                <Mail size={23} />
                <input
                  type="email"
                  placeholder="Email"
                  aria-label="Email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="login-input-box">
                <Lock size={22} />

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Kata Sandi"
                  aria-label="Kata Sandi"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
            <a href="/forgot-password" className="forgot-password-link">
            Lupa Kata Sandi?
            </a>
                            
              </div>

              {message && (
                <p className="login-message" role="status">
                  {message}
                </p>
              )}

              <button type="submit" className="login-submit-button">
                Masuk
              </button>
            </form>

            <div className="login-divider">
              <span />
              <p>atau</p>
              <span />
            </div>

            
        <button
          type="button"
          className="login-google-button"
          onClick={() => googleLogin()}
        >
          <span className="login-google-letter">G</span>
          Masuk dengan Google
        </button>

        <p className="login-register-text">
          Belum punya akun?{" "}
          <a href={`/register?redirect=${encodeURIComponent(redirectUrl)}`}>
            Daftar Gratis
          </a>
        </p>
      </div>
    </div>
  </section>

  {showNameModal && (
    <div className="auth-modal-overlay">
      <div className="auth-modal-card">
        <div className="auth-modal-icon">
          <User size={28} />
        </div>
        <h3>Selamat Datang!</h3>
        <p>
          Akun Google Anda ({pendingUser?.email}) berhasil terhubung. Silakan masukkan nama lengkap Anda untuk akun KenanganQR.
        </p>

        <form onSubmit={handleSaveNameModal} className="auth-modal-form">
          <div className="login-input-box" style={{ marginBottom: "16px" }}>
            <User size={20} />
            <input
              type="text"
              placeholder="Nama Lengkap Anda"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <button type="submit" className="login-submit-button" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <span>Lanjutkan</span>
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  )}
</main>
  );
}

export default Login;