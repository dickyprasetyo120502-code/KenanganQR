import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  ChevronRight,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import { getAccessToken } from "../utils/storage";
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
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [orderId, setOrderId] = useState("");

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

    const accessToken = getAccessToken();

    if (!accessToken) {
      setErrorMessage(
        "Sesi login tidak ditemukan. Silakan login kembali sebelum membayar.",
      );
      return;
    }

    if (!window.snap) {
      setErrorMessage(
        "Halaman pembayaran Midtrans belum siap. Periksa koneksi internet, konfigurasi Snap.js, lalu muat ulang halaman.",
      );
      return;
    }

    const planId = planName.toLowerCase().includes("premium")
      ? "premium"
      : "basic";

    setIsLoading(true);

    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ planId }),
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

      // Buka popup pembayaran resmi Midtrans Snap.
      window.snap.pay(transaction.token, {
        onSuccess: () => {
          setPaymentMessage(
            "Midtrans melaporkan bahwa proses pembayaran berhasil. Status langganan tetap menunggu verifikasi backend.",
          );
        },

        onPending: () => {
          setPaymentMessage(
            "Transaksi dibuat, tetapi pembayaran masih menunggu penyelesaian. Selesaikan instruksi pembayaran dari Midtrans.",
          );
        },

        onError: () => {
          setErrorMessage(
            "Midtrans melaporkan kendala pada pembayaran. Periksa status transaksi sebelum mencoba membayar kembali.",
          );
        },

        onClose: () => {
          setPaymentMessage(
            "Popup pembayaran ditutup. Status transaksi belum dipastikan; jangan membuat pembayaran baru sebelum memeriksa transaksi ini.",
          );
        },
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat membuat transaksi.",
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
              <p>Pembayaran melalui Midtrans Snap Sandbox</p>
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
                      Akses fitur sesuai paket yang dipilih.
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
                <strong>Pembayaran aman melalui Midtrans</strong>

                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: "13px",
                    lineHeight: 1.6,
                  }}
                >
                  Pilih metode pembayaran yang tersedia pada halaman
                  Midtrans. Nomor Virtual Account dan kode pembayaran
                  akan diberikan oleh Midtrans, bukan dibuat oleh
                  KenanganQR.
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
                Membuat Transaksi...
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