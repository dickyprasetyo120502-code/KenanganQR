import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  HelpCircle,
  CreditCard,
} from "lucide-react";
import "../styles/confirm-subscription.css";

export interface PlanDetail {
  id: "basic" | "premium";
  name: string;
  price: number;
  duration: string;
  description: string;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<"basic" | "premium", PlanDetail> = {
  basic: {
    id: "basic",
    name: "Paket Basic",
    price: 19000,
    duration: "7 hari akses",
    description: "Pilihan hemat untuk acara pernikahan, ulang tahun, atau perayaan keluarga singkat.",
    features: [
      "Akses aktif galeri selama 7 hari penuh",
      "Kapasitas unggah foto & ucapan tamu tak terbatas",
      "Unduh desain kartu QR siap cetak berkualitas tinggi",
      "Tampilan galeri responsif untuk tamu & undangan",
    ],
  },
  premium: {
    id: "premium",
    name: "Paket Premium",
    price: 50000,
    duration: "30 hari akses",
    description: "Pilihan paling populer untuk kenangan berharga dengan durasi panjang dan fitur lengkap.",
    features: [
      "Akses aktif galeri selama 30 hari penuh",
      "Unggah foto resolusi tinggi & video kenangan tanpa batas",
      "Unduh semua foto & kartu QR resolusi asli (HD)",
      "Prioritas pemrosesan server & fitur eksklusif",
    ],
  },
};

export interface ConfirmSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (plan: PlanDetail) => void;
  selectedPlanId?: "basic" | "premium";
}

export const ConfirmSubscriptionModal: React.FC<ConfirmSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedPlanId = "basic",
}) => {
  const [activePlanId, setActivePlanId] = useState<"basic" | "premium">(selectedPlanId);

  useEffect(() => {
    if (selectedPlanId) {
      setActivePlanId(selectedPlanId);
    }
  }, [selectedPlanId, isOpen]);

  if (!isOpen) return null;

  const activePlan = SUBSCRIPTION_PLANS[activePlanId];
  const formattedPrice = `Rp ${activePlan.price.toLocaleString("id-ID")}`;

  return (
    <div className="confirm-sub-backdrop" onClick={onClose}>
      <div className="confirm-sub-modal" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="confirm-sub-header">
          <div className="confirm-sub-header-content">
            <div className="confirm-sub-icon-badge">
              <Sparkles size={22} />
            </div>
            <div className="confirm-sub-title-wrap">
              <h3>
                Konfirmasi Pilihan Paket
                <ShieldCheck size={18} color="#00a2e8" />
              </h3>
              <p>Pilih paket berlangganan yang sesuai dengan kebutuhan Anda</p>
            </div>
          </div>
          <button
            type="button"
            className="confirm-sub-close-btn"
            onClick={onClose}
            aria-label="Tutup konfirmasi"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="confirm-sub-body">
          {/* PILIHAN PAKET: 19 RB ATAU 50 RB */}
          <div className="confirm-sub-plan-tabs">
            {/* OPSI 19 RB (BASIC) */}
            <div
              className={`confirm-sub-plan-tab ${activePlanId === "basic" ? "active" : ""}`}
              onClick={() => setActivePlanId("basic")}
            >
              <div className="confirm-sub-tab-top">
                <span className="confirm-sub-tab-name">Basic</span>
                <span className="confirm-sub-tab-radio">
                  {activePlanId === "basic" && <span className="confirm-sub-tab-radio-inner" />}
                </span>
              </div>
              <div className="confirm-sub-tab-price">Rp 19.000</div>
              <div className="confirm-sub-tab-duration">7 hari akses</div>
            </div>

            {/* OPSI 50 RB (PREMIUM) */}
            <div
              className={`confirm-sub-plan-tab ${activePlanId === "premium" ? "active" : ""}`}
              onClick={() => setActivePlanId("premium")}
            >
              <span className="confirm-sub-tag-popular">Populer</span>
              <div className="confirm-sub-tab-top">
                <span className="confirm-sub-tab-name">Premium</span>
                <span className="confirm-sub-tab-radio">
                  {activePlanId === "premium" && <span className="confirm-sub-tab-radio-inner" />}
                </span>
              </div>
              <div className="confirm-sub-tab-price">Rp 50.000</div>
              <div className="confirm-sub-tab-duration">30 hari akses</div>
            </div>
          </div>

          {/* BENEFIT / DETAIL PAKET TERPILIH */}
          <div className="confirm-sub-selected-card">
            <h4>Keuntungan {activePlan.name}</h4>
            <ul className="confirm-sub-features-list">
              {activePlan.features.map((feature, idx) => (
                <li key={idx}>
                  <CheckCircle2 size={16} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* PERTANYAAN MEYAKINKAN (CONFIRMATION QUESTION) */}
          <div className="confirm-sub-question-box">
            <div className="confirm-sub-question-icon">
              <HelpCircle size={20} />
            </div>
            <div className="confirm-sub-question-text">
              <strong>
                Apakah Anda yakin ingin berlangganan {activePlan.name} ({formattedPrice})?
              </strong>
              <p>
                Setelah menekan tombol di bawah, gerbang pembayaran resmi <strong>Midtrans</strong> akan terbuka untuk menyelesaikan pembayaran secara aman (QRIS, VA, dsb).
              </p>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="confirm-sub-actions">
            <button
              type="button"
              className="confirm-sub-cancel-btn"
              onClick={onClose}
            >
              Batal
            </button>
            <button
              type="button"
              className="confirm-sub-proceed-btn"
              onClick={() => onConfirm(activePlan)}
            >
              <CreditCard size={18} />
              <span>Ya, Saya Yakin & Lanjutkan</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmSubscriptionModal;
