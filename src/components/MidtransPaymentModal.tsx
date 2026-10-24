import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  ChevronRight,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

import { getAccessToken, getUser } from "../utils/storage";
import { loadMidtransSnap } from "../utils/midtrans";
import "../styles/midtrans.css";

interface CreatePaymentResponse {
  orderId: string;
  planId: string;
  planName: string;
  amount: number;
  durationDays: number;
  token: string;
  redirectUrl: string;
}

interface ApiErrorResponse {
  error?: string;
  orderId?: string;
}

export interface MidtransPaymentProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  planPrice: number | string;
  planDuration?: string;
  userEmail?: string;
  userName?: string;
  onPaymentSuccess?: (info: {
    orderId: string;
    planName: string;
    amount: number;
  }) => void;
}

export const MidtransPaymentModal: React.FC<MidtransPaymentProps> = ({
  isOpen,
  onClose,
  planName,
  planPrice,
  planDuration = "7 hari akses",
  userEmail: propUserEmail,
  onPaymentSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [orderId, setOrderId] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");

  // Muat script Snap.js lebih awal begitu modal dibuka
  useEffect(() => {
    if (isOpen) {
      loadMidtransSnap();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const numericPrice =
    typeof planPrice === "number"
      ? planPrice
      : Number(planPrice.replace(/[^0-9]/g, ""));

  const formattedPrice = `Rp ${numericPrice.toLocaleString("id-ID")}`;

  const handleStartPayment = async () => {
    setErrorMessage("");
    setPaymentMessage("");
    setOrderId("");
    setRedirectUrl("");

    const currentUser = getUser();
    const accessToken = getAccessToken();
    const activeEmail = (propUserEmail || currentUser?.email || "").trim().toLowerCase();

    if (!currentUser && !accessToken) {
      setErrorMessage(
        "Sesi login tidak ditemukan. Silakan login ke akun Anda terlebih dahulu sebelum membayar.",
      );
      return;
    }

    setIsLoading(true);

    try {
      // Pastikan Snap SDK siap digunakan
      const isSnapLoaded = window.snap ? true : await loadMidtransSnap();

      const planId = planName.toLowerCase().includes("premium")
        ? "premium"
        : "basic";

      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...(activeEmail ? { "x-user-email": activeEmail } : {}),
        },
        body: JSON.stringify({
          planId,
          userEmail: activeEmail,
        }),
      });

      const data = (await response.json()) as
        | CreatePaymentResponse
        | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          ("error" in data && data.error) ||
            "Transaksi belum dapat dibuat. Silakan coba lagi.",
        );
      }

      const transaction = data as CreatePaymentResponse;

      if (!transaction.token || !transaction.orderId) {
        throw new Error(
          "Backend tidak mengembalikan token pembayaran yang valid.",
        );
      }

      setOrderId(transaction.orderId);
      if (transaction.redirectUrl) {
        setRedirectUrl(transaction.redirectUrl);
      }

      // 1. Jika Snap.js siap, buka popup interaktif resmi Midtrans Snap
      if (window.snap && isSnapLoaded) {
        window.snap.pay(transaction.token, {
          onSuccess: async (result) => {
            console.log("[Midtrans Snap] Sukses:", result);
            setPaymentMessage(
              "Pembayaran berhasil terkonfirmasi! Paket langganan Anda telah aktif.",
            );

            // Sinkronisasi status transaksi ke database backend
            try {
              await fetch(`/api/payments/sync/${transaction.orderId}`, {
                method: "POST",
              });
            } catch (syncErr) {
              console.warn("Gagal sync status pembayaran:", syncErr);
            }

            if (onPaymentSuccess) {
              onPaymentSuccess({
                orderId: transaction.orderId,
                planName: transaction.planName,
                amount: transaction.amount,
              });
            }

            setTimeout(() => {
              onClose();
            }, 1800);
          },

          onPending: async (result) => {
            console.log("[Midtrans Snap] Pending:", result);
            setPaymentMessage(
              "Transaksi dibuat! Silakan selesaikan pembayaran sesuai panduan yang tertera di layar.",
            );
            try {
              await fetch(`/api/payments/sync/${transaction.orderId}`, {
                method: "POST",
              });
            } catch {}
          },

          onError: (result) => {
            console.error("[Midtrans Snap] Error:", result);
            setErrorMessage(
              "Pembayaran ditolak atau terjadi kendala. Silakan coba bayar kembali.",
            );
          },

          onClose: () => {
            setPaymentMessage(
              "Jendela pembayaran ditutup sebelum transaksi diselesaikan. Anda dapat melanjutkannya kapan saja.",
            );
          },
        });
      } else if (transaction.redirectUrl) {
        // 2. Fallback: Langsung arahkan ke halaman Midtrans jika popup diblokir / Snap.js gagal
        window.location.href = transaction.redirectUrl;
      } else {
        throw new Error(
          "Gerbang pembayaran Midtrans belum dapat dimuat. Silakan periksa koneksi internet atau muat ulang halaman.",
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat memulai pembayaran Midtrans.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="midtrans-backdrop"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        className="midtrans-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="midtrans-header">
          <div className="midtrans-header-left">
            <div className="midtrans-logo-pill">
              <span className="midtrans-logo-text">
                mid<span>trans</span>
              </span>
            </div>

            <div className="midtrans-title-wrap">
              <h3>
                Pembayaran KenanganQR
                <ShieldCheck size={16} color="#00a2e8" />
              </h3>
              <p>Pembayaran resmi aman via Midtrans Payment Gateway</p>
            </div>
          </div>

          <button
            type="button"
            className="midtrans-close-btn"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Tutup pembayaran"
          >
            <X size={18} />
          </button>
        </div>

        <div className="midtrans-body">
          <h4 className="midtrans-section-title">
            <span>✦</span> Ringkasan Pesanan
          </h4>

          <div className="midtrans-table-wrap">
            <table className="midtrans-table">
              <thead>
                <tr>
                  <th>Deskripsi Layanan</th>
                  <th>Durasi</th>
                  <th style={{ textAlign: "right" }}>Jumlah</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>
                    <strong>Paket {planName} KenanganQR</strong>
                    <div
                      style={{
                        fontSize: "11.5px",
                        color: "#64748b",
                        marginTop: "4px",
                      }}
                    >
                      Akses fitur lengkap sesuai paket yang dipilih.
                    </div>
                  </td>

                  <td>
                    <span className="midtrans-badge-plan">
                      {planDuration}
                    </span>
                  </td>

                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: 600,
                    }}
                  >
                    {formattedPrice}
                  </td>
                </tr>

                <tr className="total-row">
                  <td colSpan={2}>Total Tagihan</td>
                  <td
                    style={{
                      textAlign: "right",
                      color: "#002b49",
                      fontSize: "16px",
                    }}
                  >
                    {formattedPrice}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            style={{
              padding: "16px",
              marginTop: "20px",
              borderRadius: "10px",
              background: "#f0f9ff",
              color: "#334155",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
              }}
            >
              <ShieldCheck
                size={22}
                color="#0284c7"
                style={{ flexShrink: 0 }}
              />

              <div>
                <strong>Pembayaran aman & instan melalui Midtrans</strong>

                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: "13px",
                    lineHeight: 1.6,
                  }}
                >
                  Klik tombol <strong>Lanjutkan Pembayaran</strong> di bawah untuk langsung membuka formulir pembayaran Midtrans (QRIS GoPay/ShopeePay/OVO, BCA/BRI/Mandiri/BNI Virtual Account, & Kartu Debit/Kredit).
                </p>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              style={{
                marginTop: "16px",
                padding: "12px",
                borderRadius: "8px",
                background: "#fef2f2",
                color: "#b91c1c",
                fontSize: "13px",
              }}
            >
              <AlertCircle
                size={16}
                style={{
                  display: "inline",
                  verticalAlign: "middle",
                  marginRight: "6px",
                }}
              />
              {errorMessage}

              {errorMessage.includes("login") && (
                <div style={{ marginTop: "10px" }}>
                  <a
                    href="/login?redirect=/dashboard"
                    style={{
                      display: "inline-block",
                      padding: "6px 14px",
                      background: "#b91c1c",
                      color: "#fff",
                      borderRadius: "6px",
                      textDecoration: "none",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    Masuk / Login Sekarang
                  </a>
                </div>
              )}
            </div>
          )}

          {paymentMessage && (
            <div
              role="status"
              style={{
                marginTop: "16px",
                padding: "12px",
                borderRadius: "8px",
                background: "#f0fdf4",
                color: "#166534",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              <CheckCircle2
                size={16}
                style={{
                  display: "inline",
                  verticalAlign: "middle",
                  marginRight: "6px",
                }}
              />

              {paymentMessage}

              {orderId && (
                <div style={{ marginTop: "8px", overflowWrap: "anywhere" }}>
                  Order ID: <strong>{orderId}</strong>
                </div>
              )}

              {redirectUrl && (
                <div style={{ marginTop: "10px" }}>
                  <a
                    href={redirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      background: "#166534",
                      color: "#fff",
                      borderRadius: "6px",
                      textDecoration: "none",
                      fontSize: "12px",
                      fontWeight: 500,
                    }}
                  >
                    <span>Buka Halaman Pembayaran Midtrans</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="midtrans-footer">
          <button
            type="button"
            className="midtrans-btn-back"
            onClick={onClose}
            disabled={isLoading}
          >
            Tutup
          </button>

          <button
            type="button"
            className="midtrans-btn-pay"
            onClick={handleStartPayment}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <LoaderCircle
                  size={17}
                  className="midtrans-loading-icon"
                />
                Membuka Pembayaran Midtrans...
              </>
            ) : (
              <>
                <span>Lanjutkan Pembayaran ({formattedPrice})</span>
                <ChevronRight size={17} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MidtransPaymentModal;