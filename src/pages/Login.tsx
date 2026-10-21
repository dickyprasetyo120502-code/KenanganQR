import { useGoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, AlertCircle, UserPlus, Loader2 } from "lucide-react";

import heroImage from "../assets/login.jpg";
import logoImage from "../assets/logo.jpg";
import { loginUser, loginWithGoogleOAuth } from "../lib/auth";
import "../styles/auth.css";

function Login() {
  const params = new URLSearchParams(window.location.search);
  const redirectUrl = params.get("redirect") || "/dashboard";
  const initialEmail = params.get("email") || "";

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isNotRegistered, setIsNotRegistered] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modal to complete name if needed
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingUser, setPendingUser] = useState<{ email: string; avatar?: string } | null>(null);
  const [fullName, setFullName] = useState("");

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        setMessage("");
        setIsNotRegistered(false);

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
        
        if (data.name && data.name.trim().length > 0) {
          const authRes = await loginWithGoogleOAuth(
            data.email,
            data.name.trim(),
            data.picture,
            "login"
          );

          if (authRes.success) {
            window.location.href = redirectUrl;
          } else {
            setMessage(authRes.error || "Gagal masuk menggunakan Google.");
          }
        } else {
          setPendingUser({ email: data.email, avatar: data.picture });
          setShowNameModal(true);
        }
      } catch (err: unknown) {
        console.error("Google login error:", err);
        const errText = err instanceof Error ? err.message : "Silakan coba lagi.";
        setMessage(`Login Google gagal: ${errText}`);
      } finally {
        setLoading(false);
      }
    },
    onError: (errorResponse) => {
      console.warn("Google OAuth error:", errorResponse);
      setMessage("Login Google dibatalkan atau popup ditutup. Pastikan Authorized JavaScript Origins di Google Cloud Console telah mengizinkan http://localhost:5173.");
    },
  });

  async function handleSaveNameModal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fullName.trim() || !pendingUser) return;

    setLoading(true);
    const authRes = await loginWithGoogleOAuth(
      pendingUser.email,
      fullName.trim(),
      pendingUser.avatar,
      "login"
    );
    setLoading(false);

    if (authRes.success) {
      window.location.href = redirectUrl;
    } else {
      if (authRes.notRegistered) {
        setEmail(pendingUser.email);
        setIsNotRegistered(true);
        setShowNameModal(false);
        setMessage(authRes.error || "Akun belum terdaftar. Anda wajib membuat akun terlebih dahulu sebelum masuk!");
      } else {
        setMessage(authRes.error || "Gagal menyimpan akun.");
      }
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setMessage("Silakan masukkan email dan kata sandi.");
      setIsNotRegistered(false);
      return;
    }

    setLoading(true);
    setMessage("");
    setIsNotRegistered(false);

    const result = await loginUser(email.trim(), password);
    setLoading(false);

    if (!result.success) {
      setMessage(result.error || "Login gagal. Silakan periksa email dan kata sandi Anda.");
      if (result.notRegistered) {
        setIsNotRegistered(true);
      }
      return;
    }

    // Login berhasil
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
            <a
              href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`}
              className="forgot-password-link"
            >
              Lupa Kata Sandi?
            </a>
                            
              </div>

              {message && (
                <div
                  className={`login-message ${isNotRegistered ? "login-message-alert" : ""}`}
                  role="status"
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px", color: isNotRegistered ? "#c53030" : "#a16207" }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 500 }}>{message}</p>
                      {isNotRegistered && (
                        <div style={{ marginTop: "10px" }}>
                          <a
                            href={`/register?redirect=${encodeURIComponent(redirectUrl)}&email=${encodeURIComponent(email)}`}
                            className="login-register-alert-btn"
                          >
                            <UserPlus size={15} />
                            <span>Daftar Akun Baru Sekarang</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="login-submit-button"
                disabled={loading}
                style={{
                  opacity: loading ? 0.75 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {loading && <Loader2 size={18} className="spin-animate" />}
                <span>{loading ? "Memverifikasi Akun..." : "Masuk"}</span>
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