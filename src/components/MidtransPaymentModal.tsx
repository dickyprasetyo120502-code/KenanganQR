import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  CreditCard,
  QrCode,
  Building2,
  Store,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import "../styles/midtrans.css";

export interface MidtransPaymentProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  planPrice: number | string;
  planDuration?: string;
  userEmail?: string;
  userName?: string;
  onPaymentSuccess?: (info: { orderId: string; planName: string; amount: number }) => void;
}

interface PaymentMethod {
  id: string;
  name: string;
  category: "qris" | "va" | "card" | "cstore";
  iconText: string;
  description: string;
  accountNumber?: string;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "qris",
    name: "GoPay / QRIS",
    category: "qris",
    iconText: "QRIS",
    description: "Scan instan dengan GoPay, OVO, DANA, BCA, ShopeePay & m-Banking",
  },
  {
    id: "bca_va",
    name: "BCA Virtual Account",
    category: "va",
    iconText: "BCA",
    description: "Verifikasi instan otomatis 24 jam",
    accountNumber: "8277081234567890",
  },
  {
    id: "mandiri_va",
    name: "Mandiri Bill Payment",
    category: "va",
    iconText: "MANDIRI",
    description: "Transfer via Livin by Mandiri & ATM Mandiri",
    accountNumber: "7001208123456789",
  },
  {
    id: "bni_va",
    name: "BNI Virtual Account",
    category: "va",
    iconText: "BNI",
    description: "Transfer via BNI Mobile Banking & ATM BNI",
    accountNumber: "8808081234567890",
  },
  {
    id: "bri_va",
    name: "BRI Virtual Account (BRIVA)",
    category: "va",
    iconText: "BRI",
    description: "Transfer via BRImo & ATM BRI",
    accountNumber: "1234081234567890",
  },
  {
    id: "permata_va",
    name: "Permata Virtual Account",
    category: "va",
    iconText: "PERMATA",
    description: "Transfer via PermataMobile X & ATM",
    accountNumber: "8455081234567890",
  },
  {
    id: "credit_card",
    name: "Kartu Kredit / Debit",
    category: "card",
    iconText: "CARD",
    description: "Visa, Mastercard, JCB berlogo 3D Secure",
  },
  {
    id: "cstore",
    name: "Indomaret / Alfamart",
    category: "cstore",
    iconText: "RETAIL",
    description: "Bayar tunai di kasir gerai terdekat",
    accountNumber: "KQR992817293",
  },
];

export const MidtransPaymentModal: React.FC<MidtransPaymentProps> = ({
  isOpen,
  onClose,
  planName,
  planPrice,
  planDuration = "30 hari akses",
  userEmail = "user@kenanganqr.com",
  userName = "Pengguna KenanganQR",
  onPaymentSuccess,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(PAYMENT_METHODS[0]);
  const [currentStep, setCurrentStep] = useState<"select" | "pay" | "success">("select");
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(24 * 3600 - 15); // ~24 jam
  const [accordionOpen, setAccordionOpen] = useState<string>("mbanking");
  const [orderId] = useState(() => `KQR-${Date.now().toString().slice(-8)}`);

  // Parse price number
  const numericPrice = typeof planPrice === "number"
    ? planPrice
    : parseInt(planPrice.replace(/[^0-9]/g, ""), 10) || 50000;

  const formattedPrice = `Rp ${numericPrice.toLocaleString("id-ID")}`;

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleSimulateSuccess = () => {
    setCurrentStep("success");
    // Simpan status langganan ke localStorage
    try {
      const activeSubscription = {
        plan: planName,
        price: numericPrice,
        status: "ACTIVE",
        paidAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        orderId,
      };
      localStorage.setItem("kenanganqr-subscription", JSON.stringify(activeSubscription));
    } catch (e) {
      console.warn("Could not save subscription:", e);
    }

    if (onPaymentSuccess) {
      onPaymentSuccess({
        orderId,
        planName,
        amount: numericPrice,
      });
    }
  };

  return (
    <div className="midtrans-backdrop" onClick={onClose}>
      <div className="midtrans-modal" onClick={(e) => e.stopPropagation()}>
        {/* HEADER MIDTRANS */}
        <div className="midtrans-header">
          <div className="midtrans-header-left">
            <div className="midtrans-logo-pill">
              <span className="midtrans-logo-text">
                mid<span>trans</span>
              </span>
            </div>
            <div className="midtrans-title-wrap">
              <h3>
                Pembayaran Midtrans
                <ShieldCheck size={16} color="#00a2e8" />
              </h3>
              <p>Gerbang Pembayaran Resmi & Terenkripsi 256-bit</p>
            </div>
          </div>
          <button
            type="button"
            className="midtrans-close-btn"
            onClick={onClose}
            aria-label="Tutup pembayaran"
          >
            <X size={18} />
          </button>
        </div>

        {/* TIMER BAR */}
        <div className="midtrans-timer-bar">
          <div>
            Order ID: <span className="midtrans-order-id">{orderId}</span>
          </div>
          <div className="midtrans-countdown">
            <Clock size={14} />
            <span>Sisa Waktu: {timeFormatted}</span>
          </div>
        </div>

        {/* BODY */}
        <div className="midtrans-body">
          {currentStep === "select" && (
            <>
              {/* TABEL RINGKASAN PEMBAYARAN */}
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
                        <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                          Koleksi foto/video HD, QR Standee tak terbatas & fitur lengkap
                        </div>
                      </td>
                      <td>
                        <span className="midtrans-badge-plan">{planDuration}</span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>{formattedPrice}</td>
                    </tr>
                    <tr>
                      <td>
                        Biaya Pemrosesan Midtrans
                        <span className="midtrans-free-tag">GRATIS</span>
                      </td>
                      <td>-</td>
                      <td style={{ textAlign: "right", color: "#16a34a", fontWeight: 600 }}>Rp 0</td>
                    </tr>
                    <tr>
                      <td>PPN / Administrasi</td>
                      <td>-</td>
                      <td style={{ textAlign: "right", color: "#16a34a", fontWeight: 600 }}>Rp 0</td>
                    </tr>
                    <tr className="total-row">
                      <td colSpan={2}>Total Tagihan Pembayaran</td>
                      <td style={{ textAlign: "right", color: "#002b49", fontSize: "16px" }}>
                        {formattedPrice}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* TABEL PILIHAN METODE PEMBAYARAN */}
              <h4 className="midtrans-section-title">
                <span>✦</span> Pilih Metode Pembayaran
              </h4>
              <div className="midtrans-methods-list">
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = selectedMethod.id === method.id;
                  return (
                    <div
                      key={method.id}
                      className={`midtrans-method-card ${isSelected ? "active" : ""}`}
                      onClick={() => setSelectedMethod(method)}
                    >
                      <div className="midtrans-method-left">
                        <div className="midtrans-method-icon-box">
                          {method.category === "qris" ? (
                            <QrCode size={20} color="#dc2626" />
                          ) : method.category === "card" ? (
                            <CreditCard size={20} color="#00a2e8" />
                          ) : method.category === "cstore" ? (
                            <Store size={20} color="#d97706" />
                          ) : (
                            <Building2 size={20} color="#002b49" />
                          )}
                        </div>
                        <div className="midtrans-method-info">
                          <h4>{method.name}</h4>
                          <p>{method.description}</p>
                        </div>
                      </div>
                      <div className="midtrans-check-circle">
                        {isSelected && <Check size={14} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {currentStep === "pay" && (
            <div className="midtrans-detail-box">
              <h3 style={{ margin: "0 0 6px", fontSize: "18px", color: "#002b49" }}>
                Pembayaran via {selectedMethod.name}
              </h3>
              <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748b" }}>
                Total Pembayaran: <strong style={{ color: "#002b49", fontSize: "16px" }}>{formattedPrice}</strong>
              </p>

              {/* TAMPILAN QRIS */}
              {selectedMethod.category === "qris" && (
                <div className="midtrans-qris-container">
                  <div className="midtrans-qris-brand">QRIS</div>
                  <div className="midtrans-qris-card">
                    <QRCodeCanvas
                      value={`00020101021226580016ID.CO.MIDTRANS01189360091100${orderId}520458125303360540${numericPrice}5802ID5910KENANGANQR6007JAKARTA6304`}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <p style={{ fontSize: "12px", color: "#64748b", marginTop: "12px", maxWidth: "340px" }}>
                    Scan QRIS ini menggunakan aplikasi <strong>GoPay, OVO, DANA, BCA Mobile, ShopeePay, LinkAja</strong> atau m-Banking Anda.
                  </p>
                </div>
              )}

              {/* TAMPILAN VIRTUAL ACCOUNT / RETAIL */}
              {(selectedMethod.category === "va" || selectedMethod.category === "cstore") && (
                <div className="midtrans-va-card">
                  <div className="midtrans-va-label">
                    {selectedMethod.category === "cstore" ? "Kode Pembayaran Gerai" : "Nomor Virtual Account"}
                  </div>
                  <span className="midtrans-va-number">
                    {selectedMethod.accountNumber || "8277081234567890"}
                  </span>
                  <button
                    type="button"
                    className={`midtrans-copy-btn ${copied ? "copied" : ""}`}
                    onClick={() => handleCopy(selectedMethod.accountNumber || "8277081234567890")}
                  >
                    {copied ? (
                      <>
                        <Check size={14} /> Berhasil Disalin!
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> Salin Nomor
                      </>
                    )}
                  </button>
                  <div style={{ marginTop: "12px", fontSize: "12px", color: "#475569" }}>
                    Atas Nama: <strong>KENANGAN QR / {userName}</strong>
                  </div>
                </div>
              )}

              {/* TAMPILAN KARTU KREDIT */}
              {selectedMethod.category === "card" && (
                <div style={{ maxWidth: "360px", margin: "16px auto", textAlign: "left" }}>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>Nomor Kartu</label>
                    <input
                      type="text"
                      placeholder="4111 2222 3333 4444"
                      defaultValue="4111 2222 3333 4444"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>Masa Berlaku</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        defaultValue="12/28"
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>CVV</label>
                      <input
                        type="text"
                        placeholder="123"
                        defaultValue="888"
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ACCORDION PANDUAN PEMBAYARAN */}
              <div className="midtrans-accordion">
                <div className="midtrans-accordion-item">
                  <button
                    type="button"
                    className="midtrans-accordion-header"
                    onClick={() => setAccordionOpen(accordionOpen === "mbanking" ? "" : "mbanking")}
                  >
                    <span>Cara Bayar via Mobile Banking</span>
                    {accordionOpen === "mbanking" ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {accordionOpen === "mbanking" && (
                    <div className="midtrans-accordion-content">
                      <ol>
                        <li>Buka aplikasi Mobile Banking di HP Anda.</li>
                        <li>Pilih menu <strong>Transfer</strong> &gt; <strong>Virtual Account</strong>.</li>
                        <li>Masukkan nomor Virtual Account: <strong>{selectedMethod.accountNumber || "8277081234567890"}</strong>.</li>
                        <li>Pastikan nama merchant adalah <strong>KENANGAN QR</strong> dan nominal sesuai ({formattedPrice}).</li>
                        <li>Masukkan PIN m-Banking Anda untuk menyelesaikan pembayaran.</li>
                      </ol>
                    </div>
                  )}
                </div>

                <div className="midtrans-accordion-item">
                  <button
                    type="button"
                    className="midtrans-accordion-header"
                    onClick={() => setAccordionOpen(accordionOpen === "atm" ? "" : "atm")}
                  >
                    <span>Cara Bayar via ATM</span>
                    {accordionOpen === "atm" ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {accordionOpen === "atm" && (
                    <div className="midtrans-accordion-content">
                      <ol>
                        <li>Masukkan kartu ATM dan PIN Anda di mesin ATM.</li>
                        <li>Pilih <strong>Transaksi Lainnya</strong> &gt; <strong>Transfer</strong> &gt; <strong>Ke Rekening Virtual Account</strong>.</li>
                        <li>Masukkan nomor Virtual Account di atas.</li>
                        <li>Konfirmasi nominal pembayaran dan simpan struk bukti transaksi.</li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === "success" && (
            <div className="midtrans-success-card">
              <div className="midtrans-success-icon">
                <CheckCircle2 size={44} />
              </div>
              <h2>Pembayaran Berhasil!</h2>
              <p>
                Terima kasih! Langganan <strong>Paket {planName}</strong> Anda telah aktif untuk akun <strong>{userEmail}</strong>.
              </p>

              <div className="midtrans-table-wrap" style={{ textAlign: "left", maxWidth: "450px", margin: "0 auto 20px" }}>
                <table className="midtrans-table">
                  <tbody>
                    <tr>
                      <td style={{ color: "#64748b" }}>Order ID</td>
                      <td style={{ fontWeight: 600 }}>{orderId}</td>
                    </tr>
                    <tr>
                      <td style={{ color: "#64748b" }}>Metode Bayar</td>
                      <td style={{ fontWeight: 600 }}>{selectedMethod.name}</td>
                    </tr>
                    <tr>
                      <td style={{ color: "#64748b" }}>Status</td>
                      <td>
                        <span style={{ background: "#dcfce7", color: "#15803d", padding: "3px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 700 }}>
                          LUNAS (SETTLED)
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: "#64748b" }}>Masa Aktif</td>
                      <td style={{ fontWeight: 600 }}>{planDuration}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                className="midtrans-btn-pay"
                onClick={onClose}
                style={{ maxWidth: "260px", margin: "0 auto" }}
              >
                Mulai Gunakan Fitur
              </button>
            </div>
          )}

          <div className="midtrans-security-note">
            <ShieldCheck size={14} color="#00a2e8" />
            <span>Dilindungi enkripsi TLS 1.3 Bank-grade & sertifikasi PCI-DSS Level 1</span>
          </div>
        </div>

        {/* FOOTER CONTROLS */}
        {currentStep !== "success" && (
          <div className="midtrans-footer">
            {currentStep === "select" ? (
              <>
                <button type="button" className="midtrans-btn-back" onClick={onClose}>
                  Batal
                </button>
                <button
                  type="button"
                  className="midtrans-btn-pay"
                  onClick={() => setCurrentStep("pay")}
                >
                  <span>Bayar Sekarang ({formattedPrice})</span>
                  <ChevronRight size={17} />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="midtrans-btn-back"
                  onClick={() => setCurrentStep("select")}
                >
                  <ArrowLeft size={16} /> Ubah Metode
                </button>
                <button
                  type="button"
                  className="midtrans-btn-simulate"
                  onClick={handleSimulateSuccess}
                  title="Klik untuk mensimulasikan pembayaran Midtrans selesai"
                >
                  <Sparkles size={16} /> Simulasi Bayar Berhasil
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default MidtransPaymentModal;
