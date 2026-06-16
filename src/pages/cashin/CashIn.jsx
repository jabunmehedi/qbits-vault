import { useCallback, useEffect, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import DataTable from "../../components/global/dataTable/DataTable";
import dayjs from "dayjs";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ApproveCashIn, DeleteCashIn, GetCashIn, GetCashIns, RejectCashIn, VerifyCashIn } from "../../services/Cash";
import VerifierAvatars from "../../components/global/verifierAvatars.jsx/VerifierAvatars";
import { GetCashInLedger } from "../../services/Ledger";
import { HiDotsHorizontal } from "react-icons/hi";
import CashInRequestDrawer from "../../components/cashin/CashInRequestDrawer";
import { usePermissions } from "../../hooks/usePermissions";
import OrderDetailsDrawer from "../../components/cashin/orderDetailsDrawer/OrderDetailsDrawer";
import { useToast } from "../../hooks/useToast";
import VerifyButton from "../../components/verifyButton/VerifyButton";
import CashInDetails from "../../components/cashin/CashInDetails";
import { useSelector } from "react-redux";
import { selectAuthUser, selectIsSuperAdmin } from "../../store/authSlice";
import ApprovalCell from "../../components/cashin/ApprovalCell";

const DENOM_NOTES = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
const INITIAL_DENOMINATIONS = Object.fromEntries(DENOM_NOTES.map((n) => [n, 0]));

const CashIn = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [editCashInData, setEditCashInData] = useState(null);
  const [cashIns, setCashIns] = useState([]);
  const [cashInsLoaded, setCashInsLoaded] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [paginationData, setPaginationData] = useState({});
  const [loading, setLoading] = useState(false);
  const [amounts, setAmounts] = useState({});
  const [denominations, setDenominations] = useState(INITIAL_DENOMINATIONS);
  const [transactionId, setTransactionId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [openCashInReqDrawer, setOpenCashInReqDrawer] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [openOrderDetailsDrawer, setOpenOrderDetailsDrawer] = useState(false);
  const [editLoading, setEditLoading] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeVerifyId, setActiveVerifyId] = useState(null);
  const [activeApproveId, setActiveApproveId] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);

  const { hasPermission } = usePermissions();
  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const user = useSelector(selectAuthUser);
  const { addToast } = useToast();

const fetchCashInsData = useCallback(() => {
    setLoading(true);
    GetCashIns()
      .then((res) => {
        setCashIns(res?.data?.data || []);
        setCashInsLoaded(true);
        setPaginationData(res?.data?.pagination || {});
      })
      .catch((err) => {
        console.error("Error fetching cash-ins:", err);
        setCashIns([]);
        setCashInsLoaded(true);
        setPaginationData({});
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCashInsData();
  }, []);

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveActionMenuId(null);
      setDeleteConfirmId(null);
    };
    if (activeActionMenuId !== null) {
      window.addEventListener("click", handleOutsideClick);
    }
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [activeActionMenuId]);

  const handlePageChange = (page) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("page", page.toString());
      return p;
    });
  };

  const handleSearch = (term) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (term.trim()) {
        p.set("search", term.trim());
        p.set("page", "1");
      } else {
        p.delete("search");
      }
      return p;
    });
  };

  const totalEnteredAmount = selectedRows.reduce((sum, row) => sum + (parseFloat(amounts[row.id]) || 0), 0);

  const generateTransactionId = () =>
    `TXN-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9999)
      .toString()
      .padStart(4, "0")}`;

  const confirmAndComplete = () => {
    setTransactionId(generateTransactionId());
    setShowConfirmModal(false);
    setSearchParams({ step: 4 });
  };

  const downloadCashInLedger = async (cashIn) => {
    try {
      const response = await GetCashInLedger(cashIn.id);
      if (!response.success) throw new Error(response.message || "Failed to fetch ledger data");

      const { vault, verifiers, approvers } = response.data;
      const cashInAmount = parseFloat(cashIn.cash_in_amount || 0);

      const amountFmt = (n) => parseFloat(n).toLocaleString("en-US", { minimumFractionDigits: 2 });

      const numberToWords = (amount) => {
        const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
          "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
        const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
        const convert = (n) => {
          if (n === 0) return "";
          if (n < 20) return ones[n];
          if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
          if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
          if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
          if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
          return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
        };
        const intPart = Math.floor(amount);
        const decPart = Math.round((amount - intPart) * 100);
        let result = convert(intPart) || "Zero";
        result += " Taka";
        if (decPart > 0) result += " and " + convert(decPart) + " Paisa";
        return result + " Only";
      };

      const DENOM_NOTES = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

      // Build a safe number-keyed map so string/number key mismatch doesn't cause [object Object]
      const denomMap = {};
      if (cashIn.denominations) {
        Object.entries(cashIn.denominations).forEach(([k, v]) => {
          denomMap[parseInt(k)] = parseInt(v) || 0;
        });
      }

      const statusList = ["Pending", "Verified", "Approved", "Rejected"];

      const derivedStatus = (() => {
        if (cashIn.status) return cashIn.status.toLowerCase();
        const vs = cashIn.verifier_status?.toLowerCase();
        const as = cashIn.approver_status?.toLowerCase();
        if (vs === "rejected" || as === "rejected") return "rejected";
        if (as === "approved") return "approved";
        if (vs === "verified") return "verified";
        return "pending";
      })();

      const printWindow = window.open("", "_blank");
      if (!printWindow) { alert("Please allow popups for printing."); return; }

      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
  <title>Cash-In Ledger — ${cashIn.tran_id}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; background: #f8fafc; }
    .page { max-width: 820px; margin: 24px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); min-height: 277mm; display: flex; flex-direction: column; }
    .content { flex: 1; }

    /* ── Header ── */
    .ledger-header { background: #1a73e8; color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 16px 22px; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .header-icon { width: 32px; height: 32px; background: rgba(255,255,255,0.15); border-radius: 8px; display: flex; align-items: center; justify-content: center; }
    .header-title { font-size: 17px; font-weight: 800; letter-spacing: 2.5px; }
    .print-btn { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.35); color: #fff; padding: 7px 16px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .print-btn:hover { background: rgba(255,255,255,0.25); }

    /* ── Content ── */
    .content { padding: 14px 16px; }

    /* ── Info grid ── */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-bottom: 12px; }
    .info-item { padding: 2px 0 5px; }
    .info-label { font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 2px; }
    .info-value { font-size: 13px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; display: flex; align-items: center; gap: 5px; min-height: 18px; }

    /* ── Sections ── */
    .section { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 8px; page-break-inside: avoid; break-inside: avoid; }
    .section-hd { background: #EFF6FF; border-bottom: 1px solid #BFDBFE; padding: 7px 14px; display: flex; align-items: center; justify-content: space-between; }
    .section-hd-left { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #1a73e8; text-transform: uppercase; }
    .section-body { padding: 8px 14px; }

    /* ── Denomination table ── */
    .denom-table { width: 100%; border-collapse: collapse; }
    .denom-table th { background: #1a73e8; color: #fff; padding: 6px 12px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; }
    .denom-table th:first-child { text-align: left; }
    .denom-table th:nth-child(2) { text-align: center; }
    .denom-table th:last-child { text-align: right; }
    .denom-table td { padding: 4px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #1e293b; }
    .denom-table td:first-child { text-align: left; color: #1e293b; }
    .denom-table td:nth-child(2) { text-align: center; color: #1e293b; }
    .denom-table td:last-child { text-align: right; font-weight: 600; color: #1e293b; }
    .denom-table tr:last-child td { border-bottom: none; }
    .grand-total-val { font-size: 14px; font-weight: 800; color: #1a73e8; }

    /* ── Field rows ── */
    .field-row { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; }
    .field-row:last-child { margin-bottom: 0; }
    .field-label { font-size: 12px; font-weight: 600; color: #475569; white-space: nowrap; min-width: 120px; }
    .field-line { flex: 1; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; min-height: 18px; font-size: 12px; color: #1e293b; }
    .field-area { flex: 1; border: 1px solid #e2e8f0; border-radius: 4px; min-height: 36px; padding: 4px 8px; font-size: 12px; color: #1e293b; }

    /* ── Verification ── */
    .verify-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; }

    /* ── Approvals ── */
    .approval-row { display: grid; grid-template-columns: 22px 1fr 1fr; gap: 10px; align-items: center; padding: 6px 0; border-bottom: 1px solid #f1f5f9; page-break-inside: avoid; break-inside: avoid; }
    .approval-row:last-child { border-bottom: none; }
    .approval-num { font-size: 12px; font-weight: 700; color: #64748b; }

    /* ── Status ── */
    .status-bar { display: flex; align-items: center; gap: 18px; padding: 8px 14px; flex-wrap: wrap; }
    .status-label { font-size: 12px; font-weight: 800; color: #1e293b; }
    .status-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; }
    .cb { width: 13px; height: 13px; border: 1.5px solid #94a3b8; border-radius: 2px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .cb.active { background: #1a73e8; border-color: #1a73e8; }
    .cb.active::after { content: ''; display: block; width: 7px; height: 4px; border-left: 1.5px solid #fff; border-bottom: 1.5px solid #fff; transform: rotate(-45deg) translateY(-1px); }

    /* ── Footer ── */
    .footer { text-align: center; padding: 8px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }

    @media print {
      @page { size: A4; margin: 10mm; }
      body { background: #fff; }
      .page { margin: 0; border-radius: 0; box-shadow: none; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
<div class="page">

  <div class="ledger-header">
    <div class="header-left">
      <div class="header-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="18" rx="2"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>
        </svg>
      </div>
      <span class="header-title">CASH IN LEDGER</span>
    </div>
    <button class="print-btn no-print" onclick="window.print()">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
      </svg>
      Print / Save PDF
    </button>
  </div>

  <div class="content">

    <!-- Info Grid -->
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Vault Name:</div>
        <div class="info-value">${cashIn.vault?.name || vault.vault_code || "—"}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Cash In Transaction ID:</div>
        <div class="info-value" style="font-family:monospace">${cashIn.tran_id || "—"}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Vault Code:</div>
        <div class="info-value">${vault.vault_code || "—"}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Date:</div>
        <div class="info-value">
          ${dayjs(cashIn.created_at).format("DD/MM/YYYY")}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
      </div>
      <div class="info-item">
        <div class="info-label">Bag Number:</div>
        <div class="info-value">${cashIn.bags?.barcode || "—"}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Generated Time:</div>
        <div class="info-value">
          ${dayjs().format("HH:mm")}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
      </div>
      <div class="info-item" style="grid-column: span 2">
        <div class="info-label">Prepared By:</div>
        <div class="info-value">${cashIn.user?.name || "—"}</div>
      </div>
    </div>

    <!-- Denomination Breakdown -->
    <div class="section">
      <div class="section-hd">
        <div class="section-hd-left">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><circle cx="12" cy="15" r="2"/></svg>
          Denomination Breakdown
        </div>
        <div style="font-size:11px;font-weight:700;color:#475569;">
          GRAND TOTAL (BDT): <span class="grand-total-val">${amountFmt(cashInAmount)}</span>
        </div>
      </div>
      <table class="denom-table">
        <thead>
          <tr><th>Denomination (BDT)</th><th>Count</th><th>Total (BDT)</th></tr>
        </thead>
        <tbody>
          ${DENOM_NOTES.map((note) => {
            const cnt = denomMap[note] || 0;
            return `<tr>
              <td>${note.toLocaleString("en-US")}</td>
              <td>${cnt}</td>
              <td>${amountFmt(note * cnt)}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>

    <!-- Bag Summary -->
    <div class="section">
      <div class="section-hd">
        <div class="section-hd-left">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          Bag Summary
        </div>
      </div>
      <div class="section-body">
        <div class="field-row">
          <span class="field-label">Bag Amount (BDT) in words:</span>
          <span class="field-line">${numberToWords(cashInAmount)}</span>
        </div>
      </div>
    </div>

    <!-- Verification -->
    <div class="section">
      <div class="section-hd">
        <div class="section-hd-left">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Verifiers
        </div>
      </div>
      <div class="section-body">
        ${verifiers?.length > 0 ? verifiers.map((v, i) => `
          <div class="verify-grid" style="${i < verifiers.length - 1 ? "margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #f1f5f9;" : ""}">
            <div class="field-row"><span class="field-label">Verified By:</span><span class="field-line">${v.name || ""}</span></div>
            <div class="field-row"><span class="field-label">Date:</span><span class="field-line">${v.verified_at || ""}</span></div>
            <!-- <div class="field-row"><span class="field-label">Signature:</span><span class="field-line" style="min-height:36px;"></span></div> -->
            <!-- <div class="field-row"><span class="field-label">Remarks:</span><span class="field-area"></span></div> -->
          </div>`).join("") : `
          <div class="verify-grid">
            <div class="field-row"><span class="field-label">Verified By:</span><span class="field-line"></span></div>
            <div class="field-row"><span class="field-label">Date:</span><span class="field-line"></span></div>
            <!-- <div class="field-row"><span class="field-label">Signature:</span><span class="field-line" style="min-height:36px;"></span></div> -->
            <!-- <div class="field-row"><span class="field-label">Remarks:</span><span class="field-area"></span></div> -->
          </div>`}
      </div>
    </div>

    <!-- Approvals -->
    <div class="section">
      <div class="section-hd">
        <div class="section-hd-left">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          Cashiers
        </div>
      </div>
      <div class="section-body">
        ${approvers?.length > 0
          ? approvers.map((a, i) => `<div class="approval-row">
              <span class="approval-num">${i + 1}:</span>
              <div class="field-row" style="margin-bottom:0"><span class="field-label">Name:</span><span class="field-line">${a?.name || ""}</span></div>
              <div class="field-row" style="margin-bottom:0"><span class="field-label">Date:</span><span class="field-line">${a?.approved_at || ""}</span></div>
            </div>`).join("")
          : `<div class="approval-row">
              <span class="approval-num">1:</span>
              <div class="field-row" style="margin-bottom:0"><span class="field-label">Name:</span><span class="field-line"></span></div>
              <div class="field-row" style="margin-bottom:0"><span class="field-label">Date:</span><span class="field-line"></span></div>
            </div>`
        }
      </div>
    </div>

    <!-- Status -->
    <div class="section">
      <div class="status-bar">
        <span class="status-label">STATUS:</span>
        ${statusList.map((s) => `
          <span class="status-item">
            <span class="cb ${derivedStatus === s.toLowerCase() ? "active" : ""}"></span>${s}
          </span>`).join("")}
      </div>
    </div>

  </div>

  <div class="footer">Generated on ${dayjs().format("DD MMM YYYY, HH:mm")} &middot; QBits Vault Management System</div>
</div>
</body>
</html>`);
      printWindow.document.close();
    } catch (err) {
      console.error("Error generating ledger:", err);
      alert("Failed to generate ledger statement. Please try again.");
    }
  };

  const ExpandableOrderIds = ({ orders, onIdClick }) => {
    if (!orders || orders.length === 0) return <span className="text-gray-400">—</span>;

    return (
      <div className="flex flex-wrap gap-x-1 gap-y-0.5 w-full">
        {orders.map((order, i) => (
          <span
            key={order.order_id || `order-${i}`}
            onClick={() => onIdClick(order)}
            className="whitespace-nowrap hover:text-[#1a73e8] hover:underline cursor-pointer"
          >
            {order?.order_id}
            {i < orders.length - 1 ? "," : ""}
          </span>
        ))}
      </div>
    );
  };
  const handleOpenDetails = (orderData) => {
    setSelectedOrderDetails(orderData);
    setOpenOrderDetailsDrawer(true);
  };

  const handleEditClick = async (id) => {
    setEditLoading(id);
    try {
      const res = await GetCashIn(id);

      setEditCashInData(res);
      setOpenCashInReqDrawer(true);
    } catch (err) {
      console.error("Failed to fetch cash-in:", err);
    } finally {
      setEditLoading(null);
    }
  };

  const handleDeleteCashIn = async (id) => {
    setDeleteLoading(true);
    try {
      const res = await DeleteCashIn(id);

      if (res?.success === true) {
        fetchCashInsData();
        addToast({ message: "Cash-in deleted successfully", type: "success" });
      }
    } catch (err) {
      console.error("Failed to delete cash-in:", err);
    } finally {
      setDeleteLoading(false);
      setDeleteConfirmId(null);
    }
  };

  const handleVerifyClick = async (id) => {
    setVerifyLoading(id);
    try {
      const res = await VerifyCashIn(id);
      if (!res?.success) {
        addToast({ message: res?.message, type: "error" });
        return;
      }
      fetchCashInsData();
      addToast({ message: "Cash-in verified successfully", type: "success" });
    } catch (err) {
      console.error("Failed to verify cash-in:", err);
    } finally {
      setVerifyLoading(null);
      setActiveVerifyId(null);
    }
  };

  const handleRejectVerifyClick = async (id, note) => {
    setVerifyLoading(id);
    try {
      const res = await RejectCashIn(id, note, "verifier");
      if (!res?.success) {
        addToast({ message: res?.message, type: "error" });
        return;
      }
      fetchCashInsData();
      addToast({ message: "Cash-in rejected", type: "success" });
    } catch (err) {
      console.error("Failed to reject cash-in:", err);
    } finally {
      setVerifyLoading(null);
      setActiveVerifyId(null);
    }
  };

  const handleRejectApproveClick = async (id, note) => {
    setVerifyLoading(id);
    try {
      const res = await RejectCashIn(id, note, "approver");
      if (!res?.success) {
        addToast({ message: res?.message, type: "error" });
        return;
      }
      fetchCashInsData();
      addToast({ message: "Cash-in rejected", type: "success" });
    } catch (err) {
      console.error("Failed to reject cash-in:", err);
    } finally {
      setVerifyLoading(null);
      setActiveApproveId(null);
    }
  };

  const handleApprovedClick = async (id) => {
    setVerifyLoading(id);
    try {
      const res = await ApproveCashIn(id);
      if (!res?.success) {
        addToast({ message: res?.message, type: "error" });
        return;
      }
      fetchCashInsData();
      addToast({ message: "Cash-in approved successfully", type: "success" });
    } catch (err) {
      console.error("Failed to verify cash-in:", err);
    } finally {
      setVerifyLoading(null);
    }
  };

  const columns = [
    {
      title: "Vault",
      key: "name",
      className: "w-[8%]",
      render: (row) => <span className="text-[#1a73e8] font-semibold">{row.vault?.name}</span>,
    },
    {
      title: "Bag",
      key: "bag",
      className: "w-[8%]",
      render: (row) => (
        <span>
          {/* {row?.bags?.barcode}-RN{row?.bags?.rack_number} */}
          {row?.bags?.barcode}
        </span>
      ),
    },
    {
      title: "Tran Id",
      key: "tran_id",
      className: "w-[14%]",
      render: (row) => <span className="block truncate font-mono">{row?.tran_id}</span>,
    },
    {
      title: "Order Ids",
      key: "orders",
      className: "w-[31%]",
      render: (row) => (
        <ExpandableOrderIds
          orders={row?.orders}
          onIdClick={(order) => handleOpenDetails(order)}
        />
      ),
    },
    {
      title: "Amount",
      key: "cash_in_amount",
      className: "w-[6%]",
      render: (row) => <span>{row?.cash_in_amount}</span>,
    },
    {
      title: "Req at",
      key: "created_at",
      className: "w-[8%]",
      render: (row) => <span className="whitespace-nowrap">{dayjs(row.created_at).format("DD MMM, YYYY")}</span>,
    },
    {
      title: "Verifiers",
      key: "required_verifiers",
      className: "w-[10%] text-center",
      render: (row) => {
        const isVerifierShowButton = row?.required_verifiers?.some((verifier) => verifier?.user_id === user?.id && !verifier?.verified);
        const isRejected = row.verifier_status === "rejected" || row.approver_status === "rejected";
        return (
          <div className="flex items-center gap-2">
            <VerifierAvatars requiredVerifiers={row.required_verifiers || []} isRejected={isRejected} />
            {isVerifierShowButton && !isRejected && (
              <VerifyButton
                handleSubmit={() => handleVerifyClick(row.id)}
                handleReject={(note) => handleRejectVerifyClick(row.id, note)}
                isOpen={activeVerifyId === row.id}
                isLoading={verifyLoading}
                setOpen={(isOpen) => setActiveVerifyId(isOpen ? row.id : null)}
                className="max-w-xl"
                title="Verify"
                rejectTitle="Reject this cash-in?"
              >
                <CashInDetails cashIn={row} />
              </VerifyButton>
            )}
          </div>
        );
      },
    },
    {
      title: "Cashers",
      key: "required_approvers",
      className: "w-[10%] text-center",
      render: (row) => (
        <ApprovalCell
          row={row}
          user={user}
          activeApproveId={activeApproveId}
          setActiveApproveId={setActiveApproveId}
          verifyLoading={verifyLoading}
          handleApprovedClick={handleApprovedClick}
          handleRejectClick={(note) => handleRejectApproveClick(row.id, note)}
        />
      ),
    },
    {
      title: "Action",
      key: "actions",
      noClip: true,
      className: "w-[6%] relative",
      render: (row) => {
        const isLocked = row?.required_verifiers?.some((v) => v?.verified)
          || row?.verifier_status === "rejected"
          || row?.approver_status === "rejected";
        const isMenuOpen = activeActionMenuId === row.id;
        const isConfirmingDelete = deleteConfirmId === row.id;

        const toggleMenu = (e) => {
          e.stopPropagation();
          setActiveActionMenuId(isMenuOpen ? null : row.id);
          setDeleteConfirmId(null);
        };

        const handleDeleteClick = (e) => {
          e.stopPropagation();
          setDeleteConfirmId(row.id);
        };

        const handleCancelDelete = (e) => {
          e.stopPropagation();
          setDeleteConfirmId(null);
        };

        return (
          <div className="relative inline-block text-left">
            <button
              onClick={toggleMenu}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>

            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.15 }}
                className={`absolute right-0 mt-1 bg-white border border-gray-200 divide-y divide-gray-100 rounded-lg shadow-xl z-50 overflow-hidden ${isConfirmingDelete ? "w-44" : "w-36"}`}
              >
                <AnimatePresence mode="wait">
                  {!isConfirmingDelete ? (
                    <motion.div key="options" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {!isLocked && (isSuperAdmin || hasPermission("cash-in.edit")) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveActionMenuId(null); handleEditClick(row.id); }}
                          className="flex items-center w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors gap-2 font-medium cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                      )}
                      {!isLocked && (isSuperAdmin || hasPermission("cash-in.delete")) && (
                        <button
                          onClick={handleDeleteClick}
                          className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors gap-2 font-medium cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveActionMenuId(null); downloadCashInLedger(row); }}
                        className="flex items-center w-full px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors gap-2 font-medium cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Ledger
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="py-4 text-center"
                    >
                      <p className="text-xs text-gray-500 font-medium mb-2">Are you sure?</p>
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={handleCancelDelete}
                          disabled={deleteLoading}
                          className="px-2 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={deleteLoading}
                          onClick={(e) => { e.stopPropagation(); handleDeleteCashIn(row.id); }}
                          className="px-2 py-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[58px]"
                        >
                          {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 bg-[#1a2b4b] rounded-full" />
          <div>
            <h1 className="xl:text-2xl font-black text-[#1a2b4b] uppercase">Cash In List</h1>
            <p className="text-[8px] xl:text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">Cash In Management</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {hasPermission("cash-in.request") && (
            <button
              onClick={() => {
                setEditCashInData(null);
                setOpenCashInReqDrawer(true);
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1a73e8] text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all"
            >
              <Plus className="w-5 h-5" /> Cash In Request
            </button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={cashIns}
        changePage={handlePageChange}
        onSearch={handleSearch}
        paginationData={paginationData}
        selectedRows={selectedRows}
        loading={loading}
        setSelectedRows={setSelectedRows}
        className="h-[calc(100vh-80px)]"
        compact
      />
      {/* 
      <CashDepositConfirmModal
        showConfirmModal={showConfirmModal}
        setShowConfirmModal={setShowConfirmModal}
        totalEnteredAmount={totalEnteredAmount}
        denominations={denominations}
        selectedRows={selectedRows}
        amounts={amounts}
        onConfirm={confirmAndComplete}
      /> */}

      {openCashInReqDrawer && (
        <CashInRequestDrawer editData={editCashInData} isOpen={openCashInReqDrawer} onClose={() => setOpenCashInReqDrawer(false)} refetch={fetchCashInsData} />
      )}

      {openOrderDetailsDrawer && (
        <OrderDetailsDrawer orderId={selectedOrderDetails?.order_id} isOpen={openOrderDetailsDrawer} onClose={() => setOpenOrderDetailsDrawer(false)} />
      )}

    </div>
  );
};

export default CashIn;
