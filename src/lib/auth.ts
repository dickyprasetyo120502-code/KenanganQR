import bcrypt from "bcryptjs";
import { supabase } from "./supabase";
import type { UserProfile } from "../utils/storage";
import { saveUser, saveAccessToken } from "../utils/storage";

const API_BASE = "/api/auth";

export interface AuthResult {
  success: boolean;
  message?: string;
  error?: string;
  user?: UserProfile;
  notRegistered?: boolean;
}

/**
 * Helper untuk parsing response HTTP secara aman tanpa melempar SyntaxError (Unexpected end of JSON)
 * jika server merespons dengan status 405 Method Not Allowed, 502/504, atau halaman HTML.
 */
async function parseResponseSafe(
  res: Response,
): Promise<{ isJson: boolean; data: any }> {
  try {
    const text = await res.text();
    if (!text || !text.trim()) {
      return { isJson: false, data: null };
    }
    const data = JSON.parse(text);
    return { isJson: true, data };
  } catch {
    return { isJson: false, data: null };
  }
}

/**
 * Pendaftaran akun baru
 * Prioritas 1: Express Backend API (via Prisma & PostgreSQL)
 * Prioritas 2 (Fallback): Supabase Client SDK langsung
 */
export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  // 1. Coba melalui Express Backend API jika server sedang berjalan
  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cleanName, email: cleanEmail, password }),
    });

    const parsed = await parseResponseSafe(res);
    if (parsed.isJson && parsed.data) {
      if (!res.ok) {
        return {
          success: false,
          error:
            parsed.data.error || "Gagal mendaftar akun. Silakan coba lagi.",
        };
      }

      if (parsed.data.user) {
        saveUser(parsed.data.user);

        if (parsed.data.accessToken) {
          saveAccessToken(parsed.data.accessToken);
        }
      }

      return {
        success: true,
        message: parsed.data.message || "Pendaftaran akun berhasil!",
        user: parsed.data.user,
      };
    }
  } catch (err) {
    console.warn(
      "Express backend API tidak dapat dijangkau, beralih ke Supabase fallback:",
      err,
    );
  }

  // 2. Fallback langsung ke Supabase Client jika Express server tidak aktif
  if (!supabase) {
    return {
      success: false,
      error:
        "Tidak dapat terhubung ke server autentikasi atau database Supabase.",
    };
  }

  try {
    // Cek apakah email sudah terdaftar sebelumnya
    const { data: existing, error: checkErr } = await supabase
      .from("users")
      .select("id, email")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (!checkErr && existing) {
      return {
        success: false,
        error: "Email sudah terdaftar. Silakan langsung masuk ke akun Anda.",
      };
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const { data: createdUser, error: insertErr } = await supabase
      .from("users")
      .insert({
        full_name: cleanName,
        email: cleanEmail,
        password_hash: passwordHash,
      })
      .select()
      .single();

    if (insertErr || !createdUser) {
      return {
        success: false,
        error: insertErr?.message || "Gagal menyimpan akun baru ke database.",
      };
    }

    const userProfile: UserProfile = {
      name: createdUser.full_name || cleanName,
      email: createdUser.email,
      avatar: createdUser.avatar_url || undefined,
    };

    saveUser(userProfile);

    return {
      success: true,
      message: "Pendaftaran akun berhasil!",
      user: userProfile,
    };
  } catch (sbErr: unknown) {
    const errorMsg =
      sbErr instanceof Error
        ? sbErr.message
        : "Gagal mendaftar melalui database Supabase.";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Masuk akun terdaftar (Wajib sudah punya akun di database)
 * Prioritas 1: Express Backend API (via Prisma & PostgreSQL)
 * Prioritas 2 (Fallback): Supabase Client SDK langsung
 */
export async function loginUser(
  email: string,
  password: string,
): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Coba melalui Express Backend API jika server sedang berjalan
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail, password }),
    });

    const parsed = await parseResponseSafe(res);
    if (parsed.isJson && parsed.data) {
      if (!res.ok) {
        return {
          success: false,
          error:
            parsed.data.error ||
            "Login gagal. Silakan periksa kembali email dan kata sandi Anda.",
          notRegistered: parsed.data.notRegistered || res.status === 404,
        };
      }

      if (parsed.data.user) {
        saveUser(parsed.data.user);

        if (parsed.data.accessToken) {
          saveAccessToken(parsed.data.accessToken);
        }
      }

      return {
        success: true,
        message: parsed.data.message || "Login berhasil!",
        user: parsed.data.user,
      };
    }
  } catch (err) {
    console.warn(
      "Express backend API tidak dapat dijangkau, beralih ke Supabase fallback:",
      err,
    );
  }

  // 2. Fallback langsung ke Supabase Client
  if (!supabase) {
    return {
      success: false,
      error:
        "Tidak dapat terhubung ke server autentikasi atau database Supabase.",
    };
  }

  try {
    const { data: user, error: fetchErr } = await supabase
      .from("users")
      .select("*")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (fetchErr || !user) {
      return {
        success: false,
        error:
          "Akun belum terdaftar. Anda wajib membuat akun terlebih dahulu sebelum masuk!",
        notRegistered: true,
      };
    }

    const hash = user.password_hash || user.passwordHash;
    if (!hash) {
      return {
        success: false,
        error:
          "Akun ini didaftarkan via Google. Silakan masuk menggunakan tombol Masuk dengan Google.",
      };
    }

    const isMatch = bcrypt.compareSync(password, hash);
    if (!isMatch) {
      return {
        success: false,
        error: "Kata sandi yang Anda masukkan salah. Silakan periksa kembali.",
      };
    }

    const userProfile: UserProfile = {
      name: user.full_name || user.fullName || cleanEmail.split("@")[0],
      email: user.email,
      avatar: user.avatar_url || user.avatarUrl || undefined,
    };

    saveUser(userProfile);

    return {
      success: true,
      message: "Login berhasil!",
      user: userProfile,
    };
  } catch (sbErr: unknown) {
    const errorMsg =
      sbErr instanceof Error
        ? sbErr.message
        : "Gagal memverifikasi login akun.";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Login / Daftar via Akun Google OAuth
 * Prioritas 1: Express Backend API
 * Prioritas 2 (Fallback): Supabase Client SDK langsung
 */
export async function loginWithGoogleOAuth(
  email: string,
  name?: string,
  avatar?: string,
  mode: "login" | "register" = "login",
): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();
  const displayName = name ? name.trim() : cleanEmail.split("@")[0];

  // 1. Coba melalui Express Backend API
  try {
    const res = await fetch(`${API_BASE}/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: cleanEmail,
        name: displayName,
        avatar,
        mode,
      }),
    });

    const parsed = await parseResponseSafe(res);
    if (parsed.isJson && parsed.data) {
      if (res.ok && parsed.data.user) {
        saveUser(parsed.data.user);
        return {
          success: true,
          message: parsed.data.message || "Login Google berhasil!",
          user: parsed.data.user,
        };
      }
      console.warn(
        "Express API /google returned error, proceeding to Supabase fallback:",
        parsed.data,
      );
    }
  } catch (err) {
    console.warn(
      "Express backend API tidak dapat dijangkau, beralih ke Supabase Google fallback:",
      err,
    );
  }

  // 2. Fallback langsung ke Supabase Client
  if (!supabase) {
    return {
      success: false,
      error: "Tidak dapat terhubung ke server autentikasi atau Supabase.",
    };
  }

  try {
    const { data: existingUser, error: fetchErr } = await supabase
      .from("users")
      .select("*")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (fetchErr) {
      console.warn("Supabase check user error:", fetchErr);
    }

    let finalUser = existingUser;

    if (existingUser) {
      if (avatar && !existingUser.avatar_url) {
        const { data: updated } = await supabase
          .from("users")
          .update({ avatar_url: avatar, updated_at: new Date().toISOString() })
          .eq("id", existingUser.id)
          .select()
          .maybeSingle();
        if (updated) finalUser = updated;
      }
    } else {
      // Akun belum ada di database: buatkan akun baru secara otomatis dan langsung masuk!
      const { data: newUser, error: insertErr } = await supabase
        .from("users")
        .insert({
          full_name: displayName,
          email: cleanEmail,
          avatar_url: avatar || null,
        })
        .select()
        .single();

      if (insertErr || !newUser) {
        return {
          success: false,
          error:
            insertErr?.message || "Gagal menyimpan akun Google ke database.",
        };
      }
      finalUser = newUser;
    }

    const userProfile: UserProfile = {
      name: finalUser.full_name || finalUser.fullName || displayName,
      email: finalUser.email,
      avatar:
        finalUser.avatar_url || finalUser.avatarUrl || avatar || undefined,
    };

    saveUser(userProfile);

    return {
      success: true,
      message: "Login Google berhasil!",
      user: userProfile,
    };
  } catch (sbErr: unknown) {
    const errorMsg =
      sbErr instanceof Error ? sbErr.message : "Gagal autentikasi via Google.";
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
  newPassword: string,
): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Coba melalui Express Backend API
  try {
    const res = await fetch(`${API_BASE}/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail, currentPassword, newPassword }),
    });

    const parsed = await parseResponseSafe(res);
    if (parsed.isJson && parsed.data) {
      if (!res.ok) {
        return {
          success: false,
          error: parsed.data.error || "Gagal mengubah kata sandi.",
        };
      }

      return {
        success: true,
        message: parsed.data.message || "Kata sandi berhasil diubah!",
      };
    }
  } catch (err) {
    console.warn(
      "Express API tidak dapat dijangkau, beralih ke Supabase change-password fallback:",
      err,
    );
  }

  // 2. Fallback langsung ke Supabase Client
  if (!supabase) {
    return {
      success: false,
      error: "Tidak dapat terhubung ke server autentikasi atau Supabase.",
    };
  }

  try {
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (!user) {
      return {
        success: false,
        error: "Pengguna tidak ditemukan dalam sistem.",
      };
    }

    const currentHash = user.password_hash || user.passwordHash;
    if (!currentHash) {
      return {
        success: false,
        error:
          "Akun ini didaftarkan via Google OAuth dan tidak memiliki kata sandi lama.",
      };
    }

    const isMatch = bcrypt.compareSync(currentPassword, currentHash);
    if (!isMatch) {
      return {
        success: false,
        error: "Kata sandi saat ini yang Anda masukkan salah.",
      };
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    const { error: updateErr } = await supabase
      .from("users")
      .update({
        password_hash: newHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateErr) {
      return {
        success: false,
        error: updateErr.message || "Gagal mengubah kata sandi di database.",
      };
    }

    return {
      success: true,
      message: "Kata sandi berhasil diubah!",
    };
  } catch (sbErr: unknown) {
    const errorMsg =
      sbErr instanceof Error ? sbErr.message : "Gagal mengubah kata sandi.";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Reset kata sandi akun (Fungsi Lupa Kata Sandi)
 * Memperbarui kata sandi user berdasarkan alamat email
 * Prioritas 1: Express Backend API (via Prisma / PostgreSQL)
 * Prioritas 2 (Fallback): Supabase Client SDK langsung
 */
export async function resetUserPassword(
  email: string,
  newPassword: string,
): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Coba melalui Express Backend API jika server sedang berjalan
  try {
    const res = await fetch(`${API_BASE}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail, newPassword }),
    });

    const parsed = await parseResponseSafe(res);
    if (parsed.isJson && parsed.data) {
      if (!res.ok) {
        return {
          success: false,
          error: parsed.data.error || "Gagal mereset kata sandi.",
          notRegistered: res.status === 404 || parsed.data.notRegistered,
        };
      }

      return {
        success: true,
        message: parsed.data.message || "Kata sandi Anda berhasil diperbarui!",
      };
    }
  } catch (err) {
    console.warn(
      "Express backend API tidak dapat dijangkau, beralih ke Supabase reset fallback:",
      err,
    );
  }

  // 2. Fallback langsung ke Supabase Client jika Express server tidak aktif
  if (!supabase) {
    return {
      success: false,
      error:
        "Tidak dapat terhubung ke server autentikasi atau database Supabase.",
    };
  }

  try {
    const { data: user, error: findErr } = await supabase
      .from("users")
      .select("id, email")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (findErr || !user) {
      return {
        success: false,
        error:
          "Email tidak terdaftar dalam sistem. Silakan periksa kembali atau buat akun baru.",
        notRegistered: true,
      };
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    const { error: updateErr } = await supabase
      .from("users")
      .update({
        password_hash: newHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateErr) {
      return {
        success: false,
        error: updateErr.message || "Gagal memperbarui kata sandi di database.",
      };
    }

    return {
      success: true,
      message:
        "Kata sandi Anda berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.",
    };
  } catch (sbErr: unknown) {
    const errorMsg =
      sbErr instanceof Error
        ? sbErr.message
        : "Gagal mengatur ulang kata sandi.";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Helper untuk mendekode Google OAuth ID Token (JWT Credential)
 * Berguna saat menggunakan official GoogleLogin button
 */
export function decodeGoogleJwt(token: string): {
  email: string;
  name: string;
  picture?: string;
} | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    const data = JSON.parse(jsonPayload);
    return {
      email: data.email || "",
      name: data.name || data.email?.split("@")[0] || "Pengguna Kenangan",
      picture: data.picture,
    };
  } catch (err) {
    console.error("Gagal membaca payload Google JWT:", err);
    return null;
  }
}
