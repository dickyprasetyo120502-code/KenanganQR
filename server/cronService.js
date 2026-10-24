import nodemailer from "nodemailer";
import { prisma } from "./prisma.js";

/**
 * Konfigurasi Email Transporter (Gmail SMTP)
 * Menggunakan GMAIL_USER dan GMAIL_APP_PASSWORD dari .env
 */
function createEmailTransporter() {
  const user = (process.env.GMAIL_USER || process.env.SMTP_USER || "").trim();
  const pass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || "").trim();

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Cek apakah seorang user memiliki paket langganan aktif (status PAID dan belum kedaluwarsa)
 */
export async function checkUserSubscription(userEmail) {
  if (!userEmail || !prisma) {
    return { isSubscribed: false, plan: "free" };
  }

  const cleanEmail = userEmail.trim().toLowerCase();

  try {
    const activePayment = await prisma.payment.findFirst({
      where: {
        user: {
          email: { equals: cleanEmail, mode: "insensitive" },
        },
        status: "PAID",
      },
      orderBy: { paidAt: "desc" },
    });

    if (!activePayment || !activePayment.paidAt) {
      return { isSubscribed: false, plan: "free" };
    }

    const paidAtMs = new Date(activePayment.paidAt).getTime();
    const durationDays = activePayment.durationDays || 7;
    const expiresAtMs = paidAtMs + durationDays * 24 * 60 * 60 * 1000;
    const isStillActive = expiresAtMs > Date.now();

    if (isStillActive) {
      return {
        isSubscribed: true,
        plan: activePayment.planId,
        planName: activePayment.planName,
        paidAt: activePayment.paidAt,
        expiresAt: new Date(expiresAtMs).toISOString(),
        durationDays,
      };
    }

    return {
      isSubscribed: false,
      plan: "free",
      expiredPlan: activePayment.planName,
      expiredAt: new Date(expiresAtMs).toISOString(),
    };
  } catch (err) {
    console.error("Gagal memeriksa status langganan:", err.message);
    return { isSubscribed: false, plan: "free" };
  }
}

/**
 * Kirim Email Peringatan Hari Ke-5 ke Gmail Pemilik Album
 */
export async function sendTrialReminderEmail(userEmail, galleryTitle, daysRemaining = 2) {
  const transporter = createEmailTransporter();
  const appUrl = (process.env.VITE_APP_URL || "https://kenangan-qr.vercel.app").replace(/\/$/, "");

  const subject = `⚠️ Peringatan: Masa Gratis Album "${galleryTitle}" Tersisa ${daysRemaining} Hari Lagi!`;
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
        .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #002b49 0%, #00192b 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .header h1 span { color: #d4af37; }
        .badge { display: inline-block; background: rgba(212, 175, 55, 0.2); border: 1px solid #d4af37; color: #d4af37; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 10px; }
        .body { padding: 30px 28px; line-height: 1.65; }
        .alert-box { background: #fff7ed; border-left: 4px solid #f97316; padding: 14px 18px; border-radius: 8px; margin: 20px 0; font-size: 14px; color: #9a3412; }
        .plans { display: flex; gap: 12px; margin: 24px 0; }
        .plan-item { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; background: #f8fafc; text-align: center; }
        .plan-item.highlight { border-color: #002b49; background: #f0f9ff; }
        .plan-price { font-size: 18px; font-weight: 700; color: #002b49; margin: 6px 0; }
        .btn { display: block; text-align: center; background: #d4af37; color: #002b49; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: 700; font-size: 15px; margin-top: 26px; box-shadow: 0 4px 12px rgba(212,175,55,0.3); }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #64748b; background: #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>Kenangan<span>QR</span></h1>
          <div class="badge">Pemberitahuan Akun & Galeri</div>
        </div>
        <div class="body">
          <h2 style="margin-top:0; color:#0f172a; font-size:20px;">Masa Gratis Album Anda Segera Berakhir</h2>
          <p>Halo Pengguna KenanganQR,</p>
          <p>Album digital Anda <strong>"${galleryTitle}"</strong> saat ini telah aktif selama <strong>5 hari</strong>. Masa uji coba gratis 7 hari Anda akan berakhir dalam <strong>${daysRemaining} hari ke depan</strong>.</p>
          
          <div class="alert-box">
            <strong>⚠️ Peraturan Layanan KenanganQR:</strong><br>
            Jika album tidak diperpanjang atau berlangganan dalam 7 hari sejak dibuat, seluruh <strong>foto kenangan dan ucapan di dalamnya akan dihapus otomatis oleh sistem</strong> agar kapasitas server terjaga. Fitur unduh foto dan kartu QR juga saat ini terkunci.
          </div>

          <h3 style="margin-bottom:8px; font-size:16px;">Pilihan Paket Berlangganan:</h3>
          <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
            <tr>
              <td style="padding:10px; border:1px solid #cbd5e1; border-radius:6px; background:#f8fafc;">
                <strong>Paket Basic</strong>: Rp 19.000 / 7 hari akses penuh & unduh foto HD.
              </td>
            </tr>
            <tr>
              <td style="padding:10px; border:1px solid #cbd5e1; border-radius:6px; background:#f0f9ff; margin-top:6px;">
                <strong>Paket Premium (Populer)</strong>: Rp 50.000 / 30 hari akses penuh, foto HD tanpa batas & prioritas server.
              </td>
            </tr>
          </table>

          <p>Segera aktifkan langganan Anda melalui gerbang pembayaran Midtrans resmi yang aman (QRIS GoPay/OVO/ShopeePay, VA Bank, & Kartu Debit):</p>

          <a href="${appUrl}/dashboard" class="btn">Berlangganan & Amankan Foto Sekarang</a>
        </div>
        <div class="footer">
          Email otomatis dari sistem KenanganQR. Anda menerima pesan ini karena terdaftar sebagai pemilik album ${galleryTitle}.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log("==================================================");
    console.log(`[EMAIL SIMULASI - HARI KE-5] Tujuan: ${userEmail}`);
    console.log(`Subjek: ${subject}`);
    console.log(`Pesan: Masa gratis album "${galleryTitle}" sisa ${daysRemaining} hari. Foto akan dihapus setelah 7 hari jika tidak berlangganan.`);
    console.log("Catatan: Tambahkan GMAIL_USER dan GMAIL_APP_PASSWORD di .env untuk mengirim email nyata ke Gmail.");
    console.log("==================================================");
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"KenanganQR Notification" <${process.env.GMAIL_USER}>`,
      to: userEmail,
      subject,
      html: htmlContent,
    });

    console.log(`[Nodemailer] Email peringatan hari ke-5 terkirim ke ${userEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Nodemailer] Gagal mengirim email ke ${userEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Kirim Email Pemberitahuan Foto Dihapus Otomatis (Hari ke-7)
 */
export async function sendPhotosPurgedEmail(userEmail, galleryTitle) {
  const transporter = createEmailTransporter();
  const appUrl = (process.env.VITE_APP_URL || "https://kenangan-qr.vercel.app").replace(/\/$/, "");

  const subject = `🚨 Foto Album "${galleryTitle}" Telah Dihapus Otomatis (Masa Gratis 7 Hari Habis)`;
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; margin:0; padding:20px; }
        .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #fee2e2; }
        .header { background: #991b1b; padding: 26px; text-align: center; color: #ffffff; }
        .body { padding: 28px; line-height: 1.6; }
        .btn { display: inline-block; background: #002b49; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 6px; font-weight: 600; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2 style="margin:0;">Pemberitahuan Penghapusan Foto</h2>
        </div>
        <div class="body">
          <p>Halo Pengguna KenanganQR,</p>
          <p>Masa uji coba gratis 7 hari untuk album <strong>"${galleryTitle}"</strong> telah berakhir dan sistem tidak mendeteksi paket berlangganan aktif.</p>
          <p>Sesuai dengan ketentuan layanan gratis KenanganQR, seluruh <strong>foto pada album tersebut telah dihapus secara otomatis</strong>.</p>
          <p>Jika Anda ingin mengaktifkan kembali album dan mengunggah momen baru dengan kapasitas tak terbatas serta fitur unduh bebas, silakan berlangganan sekarang:</p>
          <a href="${appUrl}/dashboard" class="btn">Berlangganan di KenanganQR</a>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log(`[EMAIL SIMULASI - HARI KE-7] Foto album "${galleryTitle}" dihapus otomatis untuk akun: ${userEmail}`);
    return { success: true, simulated: true };
  }

  try {
    await transporter.sendMail({
      from: `"KenanganQR Notification" <${process.env.GMAIL_USER}>`,
      to: userEmail,
      subject,
      html: htmlContent,
    });
    return { success: true };
  } catch (err) {
    console.error("Gagal kirim email penghapusan foto:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Fungsi Utama: Scan Seluruh Galeri untuk:
 * 1. Kirim email peringatan jika umur galeri >= 5 hari dan belum berlangganan.
 * 2. Hapus foto secara otomatis jika umur galeri >= 7 hari dan belum berlangganan.
 */
export async function checkAndProcessGalleries() {
  if (!prisma) {
    console.log("[Subscription Cron] Prisma belum terhubung, melewati pengecekan.");
    return { processed: 0 };
  }

  try {
    const now = new Date();
    const galleries = await prisma.gallery.findMany({
      where: {
        isActive: true,
      },
      include: {
        photos: true,
      },
    });

    console.log(`[Subscription Cron] Memeriksa ${galleries.length} galeri...`);

    let remindedCount = 0;
    let purgedCount = 0;

    for (const gallery of galleries) {
      const userEmail = gallery.userEmail;
      if (!userEmail) continue;

      // Cek apakah pemilik album memiliki status berlangganan aktif
      const sub = await checkUserSubscription(userEmail);
      if (sub.isSubscribed) {
        // Pemilik berlangganan, foto aman tidak akan dihapus
        continue;
      }

      // Hitung selisih hari dari saat galeri dibuat
      const createdDate = new Date(gallery.createdAt);
      const diffMs = now.getTime() - createdDate.getTime();
      const daysPassed = diffMs / (1000 * 60 * 60 * 24);

      // 1. HARI KE-5 HINGGA KE-7: Kirim peringatan email Gmail (hanya dikirim 1 kali)
      if (daysPassed >= 5 && daysPassed < 7 && !gallery.reminderSentAt) {
        const daysRemaining = Math.max(1, Math.ceil(7 - daysPassed));
        console.log(`[Subscription Cron] Mengirim peringatan hari ke-5 untuk "${gallery.title}" (${userEmail})...`);
        
        await sendTrialReminderEmail(userEmail, gallery.title, daysRemaining);

        await prisma.gallery.update({
          where: { id: gallery.id },
          data: { reminderSentAt: now },
        });

        remindedCount++;
      }

      // 2. HARI KE-7 KE ATAS: Hapus foto otomatis jika belum berlangganan
      if (daysPassed >= 7 && !gallery.photosPurgedAt) {
        const photoCount = gallery.photos ? gallery.photos.length : 0;
        console.log(`[Subscription Cron] Album "${gallery.title}" telah melewati 7 hari (${daysPassed.toFixed(1)} hari). Menghapus ${photoCount} foto otomatis...`);

        // Hapus record foto dari database
        if (photoCount > 0) {
          await prisma.galleryPhoto.deleteMany({
            where: { galleryId: gallery.id },
          });
        }

        // Tandai bahwa foto telah dibersihkan
        await prisma.gallery.update({
          where: { id: gallery.id },
          data: { photosPurgedAt: now },
        });

        // Kirim email konfirmasi bahwa foto telah dibersihkan
        await sendPhotosPurgedEmail(userEmail, gallery.title);

        purgedCount++;
      }
    }

    console.log(`[Subscription Cron] Selesai: ${remindedCount} peringatan terkirim, ${purgedCount} album dibersihkan.`);
    return { processed: galleries.length, remindedCount, purgedCount };
  } catch (err) {
    console.error("[Subscription Cron] Error saat memproses galeri:", err.message);
    return { error: err.message };
  }
}

/**
 * Jalankan cron scheduler di background Express server
 */
export function startCronScheduler() {
  console.log("⏰ [Cron Service] Scheduler Masa Gratis 7 Hari & Peringatan Hari ke-5 diaktifkan.");

  // Jalankan pengecekan pertama 5 detik setelah server menyala
  setTimeout(() => {
    checkAndProcessGalleries().catch((err) =>
      console.warn("Initial cron check warning:", err.message)
    );
  }, 5000);

  // Jalankan pengecekan berkala setiap 1 jam sekali
  const ONE_HOUR = 60 * 60 * 1000;
  setInterval(() => {
    checkAndProcessGalleries().catch((err) =>
      console.warn("Hourly cron check warning:", err.message)
    );
  }, ONE_HOUR);
}
