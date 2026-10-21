import type { UserProfile } from "../utils/storage";
import { saveUser } from "../utils/storage";

const API_BASE = "/api/auth";

export interface AuthResult {
  success: boolean;
  message?: string;
  error?: string;
  user?: UserProfile;
  notRegistered?: boolean;
}

/**
 * Pendaftaran akun baru
 */
export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error || "Gagal mendaftar akun. Silakan coba lagi.",
      };
    }

    if (data.user) {
      saveUser(data.user);
    }

    return {
      success: true,
      message: data.message || "Pendaftaran akun berhasil!",
      user: data.user,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Tidak dapat terhubung ke server autentikasi.";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Masuk akun terdaftar (Wajib sudah punya akun di database)
 */
export async function loginUser(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error || "Login gagal. Silakan periksa kembali email dan kata sandi Anda.",
        notRegistered: data.notRegistered || res.status === 404,
      };
    }

    if (data.user) {
      saveUser(data.user);
    }

    return {
      success: true,
      message: data.message || "Login berhasil!",
      user: data.user,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Tidak dapat terhubung ke server autentikasi.";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Login / Daftar via Akun Google OAuth
 */
export async function loginWithGoogleOAuth(
  email: string,
  name?: string,
  avatar?: string
): Promise<AuthResult> {
  try {
    const res = await fetch(`${API_BASE}/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, avatar }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error || "Gagal masuk menggunakan Google.",
      };
    }

    if (data.user) {
      saveUser(data.user);
    }

    return {
      success: true,
      message: data.message || "Login Google berhasil!",
      user: data.user,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Tidak dapat terhubung ke server autentikasi.";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Ganti kata sandi akun aktif
 */
export async function changeUserPassword(
  email: string,
  currentPassword: string,
  newPassword: string
): Promise<AuthResult> {
  try {
    const res = await fetch(`${API_BASE}/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, currentPassword, newPassword }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error || "Gagal mengubah kata sandi.",
      };
    }

    return {
      success: true,
      message: data.message || "Kata sandi berhasil diubah!",
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Tidak dapat terhubung ke server autentikasi.";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Reset kata sandi akun (Lupa kata sandi)
 */
export async function resetUserPassword(
  email: string,
  newPassword: string
): Promise<AuthResult> {
  try {
    const res = await fetch(`${API_BASE}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, newPassword }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error || "Gagal mereset kata sandi.",
        notRegistered: res.status === 404,
      };
    }

    return {
      success: true,
      message: data.message || "Kata sandi Anda berhasil diperbarui!",
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Tidak dapat terhubung ke server autentikasi.";
    return {
      success: false,
      error: errorMsg,
    };
  }
}
