import { useGoogleLogin, GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, AlertCircle, UserPlus, Loader2 } from "lucide-react";

import heroImage from "../assets/login.jpg";
import logoImage from "../assets/logo.jpg";
import { loginUser, loginWithGoogleOAuth, decodeGoogleJwt } from "../lib/auth";
import "../styles/auth.css";

function Login() {
  const params = new URLSearchParams(window.location.search);
  const redirectUrl = params.get("redirect") || "/dashboard";
  const initialEmail = params.get("email") || "";
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isNotRegistered, setIsNotRegistered] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1. Handler untuk Google Identity Services (GoogleLogin button credential)
  const handleGoogleCredentialSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setMessage("Kredensial login Google tidak ditemukan.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setIsNotRegistered(false);

      const decoded = decodeGoogleJwt(credentialResponse.credential);
      if (!decoded || !decoded.email) {
        throw new Error("Gagal membaca profil dari token Google.");
      }

      const authRes = await loginWithGoogleOAuth(
        decoded.email,
        decoded.name,
        decoded.picture,
        "login"
      );

      if (authRes.success) {
        window.location.href = redirectUrl;
      } else {
        setMessage(authRes.error || "Gagal masuk menggunakan Google.");
      }
    } catch (err: unknown) {
      console.error("Google credential login error:", err);
      const errText = err instanceof Error ? err.message : "Silakan coba lagi.";
      setMessage(`Login Google gagal: ${errText}`);
    } finally {
      setLoading(false);
    }
  };

  // 2. Handler untuk Custom Popup Button (useGoogleLogin)
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
          throw new Error("Gagal mengambil profil akun Google.");
        }

        const data = await response.json();
        
        // Gunakan nama dari Google atau fallback nama akun
        const candidateName =
          data.name && data.name.trim().length > 0
            ? data.name.trim()
            : data.email
              ? data.email.split("@")[0]
              : "Pengguna Kenangan";

        const authRes = await loginWithGoogleOAuth(
          data.email,
          candidateName,
          data.picture,
          "login"
        );

        if (authRes.success) {
          window.location.href = redirectUrl;
        } else {
          setMessage(authRes.error || "Gagal masuk menggunakan Google.");
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
      const code: string = errorResponse.error || "";
      if (code === "popup_closed_by_user") {
        setMessage("Login Google dibatalkan karena jendela popup ditutup.");
      } else if (code === "access_denied") {
        setMessage(
          "Akses Google ditolak (Error 403: access_denied). Akun Google Anda belum ditambahkan ke 'Test Users' di Google Cloud Console, atau status OAuth Consent Screen masih dalam pengujian (Testing)."
        );
      } else if (code === "origin_mismatch" || code.includes("origin")) {
        setMessage(
          `Error 400 (origin_mismatch): Asal '${window.location.origin}' belum terdaftar di 'Authorized JavaScript origins' pada Google Cloud Console.`
        );
      } else {
        setMessage(
          `Login Google gagal: ${errorResponse.error_description || code || "Pastikan Authorized JavaScript Origins di Google Cloud Console telah mengizinkan " + window.location.origin}`
        );
      }
    },
    onNonOAuthError: (nonOAuthError) => {
      console.warn("Google non-OAuth error:", nonOAuthError);
      if (nonOAuthError.type === "popup_failed_to_open") {
        setMessage(
          "Jendela popup Google diblokir oleh browser. Harap izinkan pop-up (pop-up blocker) di browser Anda atau gunakan tombol Google resmi di bawah."
        );
      } else {
        setMessage("Jendela login Google ditutup sebelum autentikasi selesai.");
      }
    },
  });


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

            <div className="google-login-group" style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
              <button
                type="button"
                className="login-google-button"
                onClick={() => {
                  if (!googleClientId) {
                    setMessage("Client ID Google belum disetel di file .env (VITE_GOOGLE_CLIENT_ID).");
                    return;
                  }
                  googleLogin();
                }}
                disabled={loading}
              >
                <span className="login-google-letter">G</span>
                Masuk dengan Google
              </button>

              {googleClientId && (
                <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                  <GoogleLogin
                    onSuccess={handleGoogleCredentialSuccess}
                    onError={() => {
                      setMessage("Autentikasi Google gagal. Pastikan Authorized JavaScript Origins di Google Cloud Console telah mengizinkan " + window.location.origin);
                    }}
                    theme="outline"
                    size="large"
                    text="signin_with"
                    shape="rectangular"
                    width="100%"
                  />
                </div>
              )}
            </div>


        <p className="login-register-text">
          Belum punya akun?{" "}
          <a href={`/register?redirect=${encodeURIComponent(redirectUrl)}`}>
            Daftar Gratis
          </a>
        </p>
      </div>
    </div>
  </section>
</main>
  );
}

export default Login;