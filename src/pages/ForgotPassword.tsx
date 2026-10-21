
import { useState } from "react";
import { ArrowLeft, Mail, KeyRound } from "lucide-react";

import "../styles/auth.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      return;
    }

    setSubmitted(true);
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

        <h1>Lupa Kata Sandi?</h1>

        <p className="forgot-description">
          Jangan khawatir! Masukkan alamat email yang
          kamu gunakan saat mendaftar. Kami akan
          membantu kamu memulihkan akses akun.
        </p>

        {submitted ? (
          <div className="forgot-success">
            <Mail size={22} />

            <p>
              Permintaan untuk <strong>{email}</strong>{" "}
              sudah dicatat pada tampilan ini.
            </p>

            <p>
              Pengiriman email reset belum aktif.
              Fitur ini perlu dihubungkan ke layanan
              autentikasi terlebih dahulu.
            </p>

            <a href="/login" className="forgot-submit">
              Kembali ke Login
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label htmlFor="forgot-email">
              Alamat Email
            </label>

            <div className="forgot-input-wrapper">
              <Mail size={18} />

              <input
                id="forgot-email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
              />
            </div>

            <button type="submit" className="forgot-submit">
              Kirim Instruksi Reset
            </button>
          </form>
        )}

        <p className="forgot-footer">
          Ingat kata sandi kamu?{" "}
          <a href="/login">Masuk di sini</a>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
