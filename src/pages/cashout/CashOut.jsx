import { useCallback, useEffect, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import DataTable from "../../components/global/dataTable/DataTable";
import CashFilters from "../../components/global/cashFilters/CashFilters";
import { usePersistedFilters } from "../../hooks/usePersistedFilters";
import { AnimatePresence, motion } from "framer-motion";
import { CashOutVerifierCell, CashOutCustodianCell, CashOutCashierCell } from "../../components/cashout/CashOutActionCells";
import dayjs from "dayjs";
import { GetVaults } from "../../services/Vault";
import CashOutConfirmationModal from "../../components/cashout/CashOutConfirmationModal";
import { ApproveCashOut, CustodianRejectCashReceived, CustodianVerifyCashReceived, DeleteCashOut, GetCashOut, GetCashOuts, RejectCashOut, VerifyCashOut } from "../../services/Cash";
import { useSelector } from "react-redux";
import { usePermissions } from "../../hooks/usePermissions";
import { selectAuthUser, selectIsSuperAdmin } from "../../store/authSlice";
import CashOutRequestDrawer from "../../components/cashout/CashOutRequestDrawer";
import { useToast } from "../../hooks/useToast";
import { GetCashOutLedger } from "../../services/Ledger";
import { HiDotsHorizontal } from "react-icons/hi";

const BagIds = ({ bags }) => {
  if (!bags?.cash_out_bags?.length) return <span className="text-gray-400">—</span>;
  return (
    <div className="flex flex-wrap gap-x-1 gap-y-0.5 w-full">
      {bags.cash_out_bags.map((bag, i) => (
        <span key={bag.id || `bag-${i}`} className="whitespace-nowrap text-gray-700">
          {bag?.bag?.barcode} - RN#{bag?.bag?.rack_number}{i < bags.cash_out_bags.length - 1 ? "," : ""}
        </span>
      ))}
    </div>
  );
};

const DEFAULT_FILTERS = { search: "", from_date: "", to_date: "", preset: "all", per_page: 500, page: 1 };

const CashOut = () => {
  const [vaults, setVaults] = useState([]);
  const [selectedVaultId, setSelectedVaultId] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [cashOuts, setCashOuts] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [editCashOutData, setEditCashOutData] = useState(null);
  const [openCashOutReqDrawer, setOpenCashOutReqDrawer] = useState(false);
  const [selectedBagsTotalAmount, setSelectedBagsTotalAmount] = useState(0);
  const [verifyLoading, setVerifyLoading] = useState(null);
  const [activeCustodianId, setActiveCustodianId] = useState(null);
  const [activeVerifyId, setActiveVerifyId] = useState(null);
  const [activeApproveId, setActiveApproveId] = useState(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { hasPermission } = usePermissions();
  const user = useSelector(selectAuthUser);
  const isSuperAdmin = useSelector(selectIsSuperAdmin);

  const { addToast } = useToast();
  const { filters, updateFilters, resetFilters } = usePersistedFilters("cashout_filters", DEFAULT_FILTERS);
  const [paginationData, setPaginationData] = useState({});
  const [loading, setLoading] = useState(false);

  const toggleRow = (rowId, e) => {
    e.stopPropagation();
  };

  useEffect(() => {
    // Fetch vaults
    GetVaults().then((res) => setVaults(res.data?.data || []));
  }, []);

  const fetchCashOutLits = useCallback(() => {
    setLoading(true);
    GetCashOuts({
      search: filters.search || undefined,
      from_date: filters.from_date || undefined,
      to_date: filters.to_date || undefined,
      per_page: filters.per_page,
      page: filters.page,
    })
      .then((res) => {
        setCashOuts(res?.data?.data || []);
        setPaginationData(res?.data?.pagination || {});
      })
      .catch((err) => {
        console.error("Error fetching cash-outs:", err);
        setCashOuts([]);
        setPaginationData({});
      })
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    fetchCashOutLits();
  }, [fetchCashOutLits]);

  const refetch = () => {
    fetchCashOutLits();
  };

  const handlePageChange = (page) => {
    updateFilters({ page }, { resetPage: false });
  };

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveActionMenuId(null);
      setDeleteConfirmId(null);
    };
    if (activeActionMenuId !== null) {
      window.addEventListener("click", handleOutsideClick);
    }
    return () => {
      window.removeEventListener("click", handleOutsideClick);
    };
  }, [activeActionMenuId]);

  const downloadCashOutLedger = async (cashOut) => {
    try {
      const response = await GetCashOutLedger(cashOut.id);
      if (!response.success) throw new Error(response.message || "Failed to fetch ledger data");

      const { vault, verifiers, approvers, custodians, bag_numbers, bags } = response.data;
      const cashOutAmount = parseFloat(cashOut.cash_out_amount || cashOut.request_amount || 0);

      const amountFmt = (n) => parseFloat(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 });

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

      const bagList = Array.isArray(bag_numbers) ? bag_numbers : [];
      const bagSummary = Array.isArray(bags) ? bags : [];
      const bagCount = bagList.length;
      const bagNumber = bagCount ? bagList.join(", ") : "—";
      // Header badge: a single bag shows its number; multiple bags show a count so
      // the header never overflows. The full list is printed in the Bag Summary.
      const bagBadgeLabel = bagCount > 1 ? "BAGS" : "BAG NO";
      const bagBadgeValue = bagCount > 1 ? `${bagCount} BAGS` : bagNumber;

      const printWindow = window.open("", "_blank");
      if (!printWindow) { alert("Please allow popups for printing."); return; }

      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
  <title>Cash-Out Ledger — ${cashOut.tran_id}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1f2937; background: #9ca3af; }
    .page { max-width: 820px; margin: 24px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.18); min-height: 277mm; display: flex; flex-direction: column; }
    .content { flex: 1; }

    /* ── Header ── */
    .ledger-header { background: #1f2937; color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 16px; }
    .header-title { font-size: 17px; font-weight: 800; letter-spacing: 2.5px; }
    .bag-badge { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.05; }
    .bag-badge-label { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; color: rgba(255,255,255,0.6); }
    .bag-badge-value { font-size: 26px; font-weight: 800; letter-spacing: 1px; font-family: monospace; text-align: right; }

    /* ── Content ── */
    .content { padding: 14px 16px; }

    /* ── Info grid ── */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px 24px; margin-bottom: 12px; }
    .info-item { padding: 2px 0 5px; }
    .info-label { font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 2px; }
    .info-value { font-size: 13px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; display: flex; align-items: center; gap: 5px; min-height: 18px; }

    /* ── Sections ── */
    .section { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 8px; page-break-inside: avoid; break-inside: avoid; }
    .section-hd { background: #f3f4f6; border-bottom: 1px solid #d1d5db; padding: 7px 14px; display: flex; align-items: center; justify-content: space-between; }
    .section-hd-left { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #1f2937; text-transform: uppercase; }
    .section-body { padding: 8px 14px; }

    /* ── Denomination table ── */
    .denom-table { width: 100%; border-collapse: collapse; }
    .denom-table th { background: #374151; color: #fff; padding: 8px 12px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; }
    .denom-table th:first-child { text-align: left; }
    .denom-table th:nth-child(2) { text-align: center; }
    .denom-table th:last-child { text-align: right; }
    .denom-table td { padding: 7px 12px; border-bottom: 1px solid #f1f5f9; font-size: 15px; color: #1e293b; }
    .denom-table td:first-child { text-align: left; color: #1e293b; }
    .denom-table td:nth-child(2) { text-align: center; color: #1e293b; }
    .denom-table td:last-child { text-align: right; font-weight: 600; color: #1e293b; }
    .denom-table tr:last-child td { border-bottom: none; }
    .grand-total-val { font-size: 14px; font-weight: 800; color: #111827; }

    /* ── Field rows ── */
    .field-row { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; }
    .field-row:last-child { margin-bottom: 0; }
    .field-label { font-size: 12px; font-weight: 600; color: #475569; white-space: nowrap; min-width: 120px; }
    .field-line { flex: 1; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; min-height: 18px; font-size: 12px; color: #1e293b; }
    .field-area { flex: 1; border: 1px solid #e2e8f0; border-radius: 4px; min-height: 36px; padding: 4px 8px; font-size: 12px; color: #1e293b; }
    /* Uniform label width so every value underline starts at the same x */
    .bag-summary .field-label { min-width: 180px; }

    /* ── Sign-off (verifiers / custodians / approvers): compact, boxed, header-less ── */
    .signoff { border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 14px; margin-bottom: 8px; page-break-inside: avoid; break-inside: avoid; }
    .signoff-row { display: flex; flex-wrap: wrap; gap: 3px 24px; padding: 3px 0; align-items: baseline; page-break-inside: avoid; break-inside: avoid; }
    .signoff-row .field-row { flex: 1; min-width: 170px; margin-bottom: 0; }
    .signoff-row .field-label { min-width: auto; }

    /* ── Footer ── */
    .footer { text-align: center; padding: 8px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }

    @media print {
      @page { size: A4; margin: 10mm; }
      body { background: #fff; }
      .page { margin: 0; border-radius: 0; box-shadow: none; max-width: 100%; }
    }
  </style>
</head>
<body>
<div class="page">

  <div class="ledger-header">
    <span class="header-title">CASH OUT LEDGER</span>
    <div class="bag-badge">
      <span class="bag-badge-label">${bagBadgeLabel}</span>
      <span class="bag-badge-value">${bagBadgeValue}</span>
    </div>
  </div>

  <div class="content">

    <!-- Info Grid -->
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Vault Name:</div>
        <div class="info-value">${cashOut.vault?.name || vault.name || "—"}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Vault Code:</div>
        <div class="info-value">${vault.vault_code || "—"}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Date &amp; Time:</div>
        <div class="info-value">
          ${dayjs(cashOut.created_at).format("DD/MM/YYYY hh:mm A")}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
      </div>
      <div class="info-item">
        <div class="info-label">Cash Out Transaction ID:</div>
        <div class="info-value" style="font-family:monospace">${cashOut.tran_id || "—"}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Prepared By:</div>
        <div class="info-value">${cashOut.user?.name || "—"}</div>
      </div>
    </div>

    <!-- Per-bag Summary -->
    <div class="section">
      <div class="section-hd">
        <div class="section-hd-left">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          Bag Summary (${bagSummary.length})
        </div>
        <div style="font-size:11px;font-weight:700;color:#475569;">
          GRAND TOTAL (BDT): <span class="grand-total-val">${amountFmt(cashOutAmount)}</span>
        </div>
      </div>
      <table class="denom-table">
        <thead>
          <tr><th>Bag No</th><th>Transaction ID</th><th>Amount (BDT)</th></tr>
        </thead>
        <tbody>
          ${bagSummary.length > 0
            ? bagSummary.map((b) => `<tr>
              <td>${b.bag_no || "—"}${b.rack_number ? ` <span style="color:#94a3b8;font-size:12px;">· Rack ${b.rack_number}</span>` : ""}</td>
              <td style="text-align:left;font-family:monospace;font-size:13px;">${b.cash_in_tran_id || "—"}</td>
              <td>${amountFmt(b.amount)}</td>
            </tr>`).join("")
            : `<tr><td colspan="3" style="text-align:center;color:#94a3b8;">No bags recorded.</td></tr>`}
        </tbody>
      </table>
    </div>

    <!-- Summary (totals) -->
    <div class="section">
      <div class="section-hd">
        <div class="section-hd-left">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
          Summary
        </div>
      </div>
      <div class="section-body bag-summary">
        <div class="field-row">
          <span class="field-label">Bag Amount (BDT) in words:</span>
          <span class="field-line">${numberToWords(cashOutAmount)}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Requested Amount:</span>
          <span class="field-line">${amountFmt(cashOut.request_amount)}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Note:</span>
          <span class="field-line">${cashOut.note || ""}</span>
        </div>
      </div>
    </div>

    <!-- Verifiers (compact, header-less, boxed) -->
    <div class="signoff">
      ${verifiers?.length > 0 ? verifiers.map((v) => `
        <div class="signoff-row">
          <div class="field-row"><span class="field-label">Verified By:</span><span class="field-line">${v.name || ""}</span></div>
          <div class="field-row"><span class="field-label">Date:</span><span class="field-line">${v.verified_at || ""}</span></div>
        </div>`).join("") : `
        <div class="signoff-row">
          <div class="field-row"><span class="field-label">Verified By:</span><span class="field-line"></span></div>
          <div class="field-row"><span class="field-label">Date:</span><span class="field-line"></span></div>
        </div>`}
    </div>

    ${custodians?.length > 0 ? `
    <!-- Custodians (compact, header-less, boxed) -->
    <div class="signoff">
      ${custodians.map((c) => `
        <div class="signoff-row">
          <div class="field-row"><span class="field-label">Custodian:</span><span class="field-line">${c?.name || ""}</span></div>
          <div class="field-row"><span class="field-label">Holding (BDT):</span><span class="field-line">${amountFmt(c?.amount)}</span></div>
<!--          <div class="field-row"><span class="field-label">Received On:</span><span class="field-line">${c?.verified_at || "Pending"}</span></div>-->
          <div class="field-row"><span class="field-label">Signature:</span><span class="field-line"></span></div>
        </div>`).join("")}
    </div>` : ""}

    <!-- Approvers (compact, header-less, boxed; signature line per approver) -->
    <div class="signoff">
      ${approvers?.length > 0
        ? approvers.map((a) => `
          <div class="signoff-row">
            <div class="field-row"><span class="field-label">Approver:</span><span class="field-line">${a?.name || ""}</span></div>
            <div class="field-row"><span class="field-label">Date:</span><span class="field-line">${a?.approved_at || ""}</span></div>
            <div class="field-row"><span class="field-label">Signature:</span><span class="field-line"></span></div>
          </div>`).join("")
        : `
          <div class="signoff-row">
            <div class="field-row"><span class="field-label">Approver:</span><span class="field-line"></span></div>
            <div class="field-row"><span class="field-label">Date:</span><span class="field-line"></span></div>
            <div class="field-row"><span class="field-label">Signature:</span><span class="field-line"></span></div>
          </div>`
      }
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

  const handleVerify = async (id) => {
    setVerifyLoading(id);
    try {
      const res = await VerifyCashOut(id);

       if (!res?.success) {
        addToast({ message: res?.message, type: "error" });
        return;
      }
      

      fetchCashOutLits();
      addToast({ message: "Cashout verified successfully", type: "success" });
    } catch (err) {
      console.error("Failed to verify cash-in:", err);
    } finally {
      setVerifyLoading(null);
    }
  };
  const handleApprove = async (id) => {
    setVerifyLoading(id);
    try {
      const res = await ApproveCashOut(id);

      if (res?.success === true || res?.verifier_status == "verified") {
        fetchCashOutLits();
        addToast({ message: "Cashout approved successfully", type: "success" });
      } else {
        addToast({ message: res?.message, type: "error" });
      }
    } catch (err) {
      console.error("Failed to verify cash-in:", err);
    } finally {
      setVerifyLoading(null);
    }
  };
  const handleRejectVerify = async (id, note) => {
    setVerifyLoading(id);
    try {
      const res = await RejectCashOut(id, note, "verifier");
      if (!res?.success) {
        addToast({ message: res?.message, type: "error" });
        return;
      }
      fetchCashOutLits();
      addToast({ message: "Cashout rejected", type: "success" });
    } catch (err) {
      console.error("Failed to reject cash-out:", err);
    } finally {
      setVerifyLoading(null);
      setActiveVerifyId(null);
    }
  };

  const handleRejectApprove = async (id, note) => {
    setVerifyLoading(id);
    try {
      const res = await RejectCashOut(id, note, "approver");
      if (!res?.success) {
        addToast({ message: res?.message, type: "error" });
        return;
      }
      fetchCashOutLits();
      addToast({ message: "Cashout rejected", type: "success" });
    } catch (err) {
      console.error("Failed to reject cash-out:", err);
    } finally {
      setVerifyLoading(null);
      setActiveApproveId(null);
    }
  };

  const handleCustodianVerify = async (id) => {
    setVerifyLoading(id);
    try {
      const res = await CustodianVerifyCashReceived(id);

      if (res?.success === true) {
        fetchCashOutLits();
        addToast({ message: "Custodian verified successfully", type: "success" });
      }
    } catch (err) {
      console.error("Failed to verify cash-in:", err);
      addToast({ message: "Failed to verify", type: "error" });
    } finally {
      setVerifyLoading(null);
    }
  };

  const handleCustodianReject = async (id, note) => {
    setVerifyLoading(id);
    try {
      const res = await CustodianRejectCashReceived(id, note);
      if (!res?.success) {
        addToast({ message: res?.message, type: "error" });
        return;
      }
      fetchCashOutLits();
      addToast({ message: "Custodian rejected the change amount", type: "success" });
    } catch (err) {
      console.error("Failed to reject custodian cash:", err);
    } finally {
      setVerifyLoading(null);
      setActiveCustodianId(null);
    }
  };

  const handleDeleteSubmit = async (id) => {
    setDeleteLoading(true);
    try {
      const res = await DeleteCashOut(id);

      if (res?.success === false) {
        addToast({ message: res?.message, type: "error" });
        return;
      }

      fetchCashOutLits();
      addToast({ message: "Cashout data deleted successfully", type: "success" });
    } catch (err) {
      console.error("Failed to delete cashout item:", err);
      addToast({ message: "Failed to delete item", type: "error" });
    } finally {
      setDeleteLoading(false);
      setDeleteConfirmId(null);
      setActiveActionMenuId(null);
    }
  };

  const columnsCashOutLists = [
    {
      title: "Vault name",
      key: "name",
      className: "w-[7%]",
      render: (row) => <span className="text-[#1a73e8] font-semibold">{row?.vault?.name}</span>,
    },
    {
      title: "Tran ID",
      key: "tran_id",
      className: "w-[10%]",
      render: (row) => <span className="block truncate font-mono text-gray-400">{row?.tran_id}</span>,
    },
    {
      title: "Bags ID",
      key: "customer.name",
      className: "w-[28%]",
      render: (row) => (
        <BagIds bags={row} />
      ),
    },
    {
      title: "req Amount",
      key: "current_amount",
      className: "w-[7%]",
      render: (row) => <span className="">{row?.request_amount}</span>,
    },
    {
      title: "bag Amount",
      key: "current_amount",
      className: "w-[7%]",
      render: (row) => <span className="">{row?.cash_out_amount}</span>,
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
      noClip: true,
      className: "w-[11%] text-center",
      render: (row) => (
        <CashOutVerifierCell
          row={row}
          user={user}
          activeVerifyId={activeVerifyId}
          setActiveVerifyId={setActiveVerifyId}
          verifyLoading={verifyLoading}
          handleVerify={handleVerify}
          handleRejectVerify={handleRejectVerify}
        />
      ),
    },
    {
      title: "Custodian",
      key: "current_amount",
      noClip: true,
      className: "w-[8%] text-center",
      render: (row) => (
        <CashOutCustodianCell
          row={row}
          user={user}
          activeCustodianId={activeCustodianId}
          setActiveCustodianId={setActiveCustodianId}
          verifyLoading={verifyLoading}
          handleCustodianVerify={handleCustodianVerify}
          handleCustodianReject={handleCustodianReject}
        />
      ),
    },
    {
      title: "Cashiers",
      key: "required_verifiers",
      noClip: true,
      className: "w-[11%] text-center",
      render: (row) => (
        <CashOutCashierCell
          row={row}
          user={user}
          activeApproveId={activeApproveId}
          setActiveApproveId={setActiveApproveId}
          verifyLoading={verifyLoading}
          handleApprove={handleApprove}
          handleRejectApprove={handleRejectApprove}
        />
      ),
    },
    {
      title: "Ledger",
      key: "ledger",
      className: "w-[5%] text-center",
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); downloadCashOutLedger(row); }}
          className="inline-flex items-center justify-center p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
          title="Download Ledger"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
      ),
    },
    {
      title: "Action",
      key: "actions",
      noClip: true,
      className: "w-[4%] relative",
      render: (row) => {
        const isMenuOpen = activeActionMenuId === row.id;
        const isConfirmingDelete = deleteConfirmId === row.id;
        // Editable only while fully pending — once any verifier has acted, or it's
        // been rejected/approved, the cash-out is locked (mirrors cash-in + backend guard).
        const isLocked =
          row?.required_verifiers?.some((v) => v?.verified) ||
          row?.verifier_status !== "pending" ||
          row?.approver_status !== "pending";

        const toggleMenu = (e) => {
          e.stopPropagation();
          setActiveActionMenuId(isMenuOpen ? null : row.id);
          setDeleteConfirmId(null);
        };

        const handleEdit = async (e) => {
          e.stopPropagation();
          setActiveActionMenuId(null);

          try {
            // 1. Call the API to get up-to-date details for this specific cashout
            const res = await GetCashOut(row.id);

            // if (res?.success || res?.data) {
            // 2. Extract the data object based on your API structure (e.g., res.data or res.data.data)
            const freshCashOutData = res.data?.data || res.data || res;

            // 3. Set the specific data into your edit state
            setEditCashOutData(freshCashOutData);

            // 4. Open the Cash Out Request Drawer
            setOpenCashOutReqDrawer(true);
            // } else {
            //   addToast({ message: res?.message || "Failed to fetch cashout details.", type: "error" });
            // }
          } catch (err) {
            console.error("Error fetching specific cashout item details:", err);
            addToast({ message: "An error occurred while fetching details.", type: "error" });
          }
        };

        const handleDeleteClick = (e) => {
          e.stopPropagation(); // Stop parent triggers
          setDeleteConfirmId(row.id); // Shift dropdown view into inline verification mode
        };

        const handleCancelDelete = (e) => {
          e.stopPropagation();
          setDeleteConfirmId(null);
        };

        const canEdit = !isLocked && (isSuperAdmin || hasPermission("cash-out.edit"));
        const canDelete = row?.verifier_status !== "verified" && (isSuperAdmin || hasPermission("cash-out.delete"));
        if (!canEdit && !canDelete) return null;

        return (
          <div className="relative inline-block text-left">
            <button
              onClick={toggleMenu}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors duration-200 cursor-pointer"
              aria-label="Actions"
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
                className={`absolute right-0 mt-1 bg-white border border-gray-200 divide-y divide-gray-100 rounded-lg shadow-xl z-50 overflow-hidden transition-all ${
                  isConfirmingDelete ? "w-44" : "w-28"
                }`}
              >
                <AnimatePresence mode="wait">
                  {!isConfirmingDelete ? (
                    <motion.div key="options" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {/* Edit Option */}
                      {canEdit && (
                        <button
                          onClick={handleEdit}
                          className="flex items-center w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors gap-2 font-medium cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Edit
                        </button>
                      )}

                      {/* Delete Option Trigger */}
                      {canDelete && (
                        <button
                          onClick={handleDeleteClick}
                          className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors gap-2 font-medium cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Delete
                        </button>
                      )}

                    </motion.div>
                  ) : (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="py-4 text-center"
                    >
                      <p className="text-xs text-gray-500 font-medium mb-2">Are you sure you want to delete?</p>
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSubmit(row.id);
                          }}
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
    <div className="">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 bg-[#1a2b4b] rounded-full" />
          <div>
            <h1 className="xl:text-2xl font-black text-[#1a2b4b] uppercase">Cash Out List</h1>
            <p className="text-[8px] xl:text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">Cash Out Management</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {(isSuperAdmin || hasPermission("cash-out.create")) && (
            <button
              onClick={() => {
                setEditCashOutData(null);
                setOpenCashOutReqDrawer(true);
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1a73e8] text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all"
            >
              <Plus className="w-5 h-5" /> Cash Out Request
            </button>
          )}
        </div>
      </div>

      <CashFilters
        filters={filters}
        onChange={updateFilters}
        onReset={resetFilters}
        searchPlaceholder="Search vault, bag, tran ID, amount…"
      />

      <DataTable
        columns={columnsCashOutLists}
        data={cashOuts}
        paginationData={paginationData}
        changePage={handlePageChange}
        isLoading={loading}
        className="h-[calc(100vh-200px)]"
      />

      {openCashOutReqDrawer && (
        <CashOutRequestDrawer isOpen={openCashOutReqDrawer} onClose={() => setOpenCashOutReqDrawer(false)} refetch={refetch} editData={editCashOutData} />
      )}

      <CashOutConfirmationModal
        showConfirmModal={showConfirmModal}
        setShowConfirmModal={setShowConfirmModal}
        // totalEnteredAmount={totalEnteredAmount}
        // denominations={denominations}
        selectedRows={selectedRows}
        selectedVaultId={selectedVaultId}
        amounts={selectedBagsTotalAmount}
        refetch={refetch}
      />
    </div>
  );
};

export default CashOut;
