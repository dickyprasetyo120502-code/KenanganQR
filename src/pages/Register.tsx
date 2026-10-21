import { useGoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { Eye, EyeOff, Images, Users, Infinity as InfinityIcon, User, ArrowRight, Loader2, AlertCircle } from "lucide-react";

import heroImage from "../assets/register.jpg";
import logoImage from "../assets/logo.jpg";
import { registerUser, loginWithGoogleOAuth } from "../lib/auth";
import "../styles/auth.css";

function Register() {
  const params = new URLSearchParams(window.location.search);
  const redirectUrl = params.get("redirect") || "/dashboard";
  const initialEmail = params.get("email") || "";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<{ email: string; avatar?: string } | null>(null);
  const [googleName, setGoogleName] = useState("");

  const strength =
    password.length === 0
      ? 0
      : password.length < 8
        ? 1
        : /[A-Z]/.test(password) &&
            /[0-9]/.test(password) &&
            /[^A-Za-z0-9]/.test(password)
          ? 4
          : 2;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setMessage("Nama lengkap wajib diisi.");
      return;
    }

    if (password.length < 8) {
      setMessage("Kata sandi harus minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    if (!agreed) {
      setMessage("Silakan setujui ketentuan layanan terlebih dahulu.");
      return;
    }

    setLoading(true);
    setMessage("");

    const res = await registerUser(name.trim(), email.trim(), password);
    setLoading(false);

    if (!res.success) {
      setMessage(res.error || "Pendaftaran akun gagal. Silakan coba lagi.");
      return;
    }

    window.location.href = redirectUrl;
  }

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        setMessage("");

        const response = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Gagal mengambil data akun Google.");
        }

        const data = await response.json();

        if (data.name && data.name.trim().length > 0) {
          const authRes = await loginWithGoogleOAuth(
            data.email,
            data.name.trim(),
            data.picture
          );

          if (authRes.success) {
            window.location.href = redirectUrl;
          } else {
            setMessage(authRes.error || "Pendaftaran Google gagal.");
          }
        } else {
          setPendingGoogleUser({ email: data.email, avatar: data.picture });
          setShowNameModal(true);
        }
      } catch {
        setMessage("Gagal mengambil data Google. Silakan coba lagi.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setMessage("Login Google gagal. Silakan coba lagi.");
    },
  });

  async function handleSaveGoogleName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!googleName.trim() || !pendingGoogleUser) return;

    setLoading(true);
    const authRes = await loginWithGoogleOAuth(
      pendingGoogleUser.email,
      googleName.trim(),
      pendingGoogleUser.avatar
    );
    setLoading(false);

    if (authRes.success) {
      window.location.href = redirectUrl;
    } else {
      setMessage(authRes.error || "Gagal menyimpan akun.");
    }
  }


  return (
    <main className="auth-page">
      <section className="auth-visual">
        <img
          src={heroImage}
          alt="Momen berharga bersama orang tercinta"
          className="auth-background"
        />
        <div className="auth-visual-overlay" />

        <a href="/" className="auth-visual-brand">
          <img src={logoImage} alt="" />
          <span>Kenangan<span className="gold-text">QR</span></span>
        </a>

        <div className="visual-top-label">
          FOTO <span>•</span> CERITA <span>•</span> SELAMANYA
        </div>

        <div className="visual-copy">
          <h1>
            Setiap momen
            <br />
            layak dikenang
            <br />
            <span>selamanya.</span>
          </h1>

          <div className="visual-line" />

          <p>
            ABADIKAN HARI INI,
            <br />
            UNTUK MASA DEPAN NANTI
          </p>

          <div className="visual-features">
            <div>
              <Images size={27} />
              <span>Simpan Foto</span>
            </div>
            <div>
              <Users size={27} />
              <span>Bagikan Cerita</span>
            </div>
            <div>
              <InfinityIcon size={29} />
              <span>Selamanya Bersama</span>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-form-side">
        <a href="/" className="mobile-auth-brand">
          <img src={logoImage} alt="" />
          <span>Kenangan<span className="gold-text">QR</span></span>
        </a>

        <div className="auth-form-container">
          <a href="/" className="form-brand">
            <img src={logoImage} alt="" />
            <span>Kenangan<span className="gold-text">QR</span></span>
          </a>

          <h2>Buat Akun</h2>
          <p className="auth-subtitle">
            Mulai buat galeri kenanganmu secara gratis.
          </p>

          
            <button
            type="button"
            className="google-button"
            onClick={() => googleLogin()}
            >
            <span className="google-letter">G</span>
            Daftar dengan Google
            </button>


          <div className="auth-divider">
            <span />
            <p>atau</p>
            <span />
          </div>

          <form onSubmit={handleSubmit}>
            <label htmlFor="register-name">Nama Lengkap</label>
            <input
              id="register-name"
              type="text"
              placeholder="Masukkan nama lengkap Anda"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />

            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />

            <label htmlFor="register-password">Kata Sandi</label>
            <div className="password-field">
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>

            <div className="password-strength" aria-label="Kekuatan kata sandi">
              {[1, 2, 3, 4].map((level) => (
                <span
                  key={level}
                  className={strength >= level ? "strength-active" : ""}
                />
              ))}
            </div>
            <p className="strength-caption">
              {password.length === 0
                ? "Kekuatan kata sandi"
                : strength === 1
                  ? "Kata sandi lemah"
                  : strength === 4
                    ? "Kata sandi kuat"
                    : "Kata sandi sedang"}
            </p>

            <label htmlFor="register-confirm">Konfirmasi Kata Sandi</label>
            <div className="password-field">
              <input
                id="register-confirm"
                type={showConfirm ? "text" : "password"}
                placeholder="Ulangi kata sandi Anda"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showConfirm ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>

            <label className="terms-label">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
              />
              <span>
                Saya menyetujui <a href="#ketentuan">Ketentuan Layanan</a>{" "}
                dan <a href="#privasi">Kebijakan Privasi</a>.
              </span>
            </label>

            {message && (
              <div
                className="auth-message"
                role="status"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  padding: "12px",
                  backgroundColor: "#fef2f2",
                  color: "#991b1b",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>{message}</span>
              </div>
            )}

            <button
              type="submit"
              className="auth-submit"
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
              <span>{loading ? "Mendaftarkan Akun..." : "Daftar Gratis"}</span>
              {!loading && <span>→</span>}
            </button>
          </form>

          <div className="auth-bottom">
            Sudah punya akun?{" "}
            <a href={`/login?redirect=${encodeURIComponent(redirectUrl)}`}>Masuk</a>
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
              Akun Google Anda ({pendingGoogleUser?.email}) berhasil terhubung. Silakan masukkan nama lengkap Anda untuk akun KenanganQR.
            </p>

            <form onSubmit={handleSaveGoogleName} className="auth-modal-form">
              <div className="login-input-box" style={{ marginBottom: "16px" }}>
                <User size={20} />
                <input
                  type="text"
                  placeholder="Nama Lengkap Anda"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="login-submit-button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
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

export default Register;
