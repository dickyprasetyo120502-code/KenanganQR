import { useState } from "react";
import { ArrowLeft, Mail, KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { resetUserPassword } from "../lib/auth";
import "../styles/auth.css";

function ForgotPassword() {
  const params = new URLSearchParams(window.location.search);
  const initialEmail = params.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isNotRegistered, setIsNotRegistered] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      setMessage("Silakan masukkan alamat email akun Anda.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setMessage("Kata sandi baru minimal harus 8 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Konfirmasi kata sandi tidak cocok. Silakan periksa kembali.");
      return;
    }

    setLoading(true);
    setMessage("");
    setIsNotRegistered(false);

    const result = await resetUserPassword(email.trim(), newPassword);
    setLoading(false);

    if (!result.success) {
      setMessage(result.error || "Gagal mengatur ulang kata sandi.");
      if (result.notRegistered) {
        setIsNotRegistered(true);
      }
      return;
    }

    setIsSuccess(true);
  }

  return (
    <div className="forgot-page">
      <div className="forgot-card">
        <a href="/login" className="back-home-link">
          <ArrowLeft size={16} />
          Kembali ke Login
        </a>

        <div className="forgot-icon">
          <KeyRound size={28} />
        </div>

        <h1>Atur Ulang Kata Sandi</h1>

        <p className="forgot-description">
          Masukkan alamat email akun Anda dan buat kata sandi baru untuk memulihkan akses galeri Anda.
        </p>

        {isSuccess ? (
          <div className="forgot-success">
            <CheckCircle2 size={32} style={{ color: "#16a34a" }} />

            <h2 style={{ fontSize: "18px", color: "#1e293b", margin: "12px 0 4px" }}>
              Kata Sandi Berhasil Diperbarui!
            </h2>

            <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: "14px" }}>
              Kata sandi untuk akun <strong>{email}</strong> telah berhasil disimpan di database.
              Sekarang Anda dapat masuk menggunakan kata sandi baru ini.
            </p>

            <a href={`/login?email=${encodeURIComponent(email)}`} className="forgot-submit" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <span>Masuk ke Akun Anda</span>
              <ArrowRight size={16} />
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label htmlFor="forgot-email">Alamat Email Terdaftar</label>
            <div className="forgot-input-wrapper">
              <Mail size={18} />
              <input
                id="forgot-email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <label htmlFor="forgot-new-password">Kata Sandi Baru</label>
            <div className="forgot-input-wrapper" style={{ position: "relative" }}>
              <Lock size={18} />
              <input
                id="forgot-new-password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimal 8 karakter"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button
                type="button"
                className="password-toggle"
                style={{ position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)" }}
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <label htmlFor="forgot-confirm-password">Konfirmasi Kata Sandi Baru</label>
            <div className="forgot-input-wrapper" style={{ position: "relative" }}>
              <Lock size={18} />
              <input
                id="forgot-confirm-password"
                type={showConfirm ? "text" : "password"}
                placeholder="Ulangi kata sandi baru"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button
                type="button"
                className="password-toggle"
                style={{ position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)" }}
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label="Toggle confirm password visibility"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {message && (
              <div
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
                  margin: "12px 0",
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 500 }}>{message}</p>
                  {isNotRegistered && (
                    <a
                      href={`/register?email=${encodeURIComponent(email)}`}
                      style={{
                        display: "inline-block",
                        marginTop: "8px",
                        color: "#b49a6c",
                        fontWeight: 600,
                        textDecoration: "underline",
                      }}
                    >
                      Daftar akun baru sekarang →
                    </a>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="forgot-submit"
              disabled={loading}
              style={{
                opacity: loading ? 0.75 : 1,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                marginTop: "16px",
              }}
            >
              {loading && <Loader2 size={18} className="spin-animate" />}
              <span>{loading ? "Menyimpan ke Database..." : "Simpan Kata Sandi Baru"}</span>
            </button>
          </form>
        )}

        <p className="forgot-footer">
          Ingat kata sandi Anda?{" "}
          <a href="/login">Masuk di sini</a>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
