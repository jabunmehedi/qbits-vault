import { useCallback, useEffect, useState } from "react";
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

      const { vault, is_approved, verifiers, approvers } = response.data;

      const cashInAmount = parseFloat(cashIn.cash_in_amount || 0);
      const vaultBalance = parseFloat(vault.current_balance || 0);

      // Opening = balance before this cash-in
      // If already approved the vault balance already includes cashInAmount, so subtract it back.
      // If still pending the vault hasn't changed, so opening = current vault balance.
      const openingBalance = is_approved ? vaultBalance - cashInAmount : vaultBalance;

      const closingBalance = is_approved ? openingBalance + cashInAmount : openingBalance;

      const fmt = (n) => `৳${parseFloat(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

      // Build ledger rows
      const rows = [];

      // Opening row
      rows.push({
        sl: "Opening",
        date: dayjs(cashIn.created_at).format("DD MMM YYYY"),
        debit: "",
        credit: "",
        balance: fmt(openingBalance),
        note: "Opening Balance",
        cls: "opening",
      });

      // Transaction row — only if approved
      if (is_approved) {
        rows.push({
          sl: 1,
          date: dayjs(cashIn.updated_at || cashIn.created_at).format("DD MMM YYYY"),
          debit: "",
          credit: fmt(cashInAmount),
          balance: fmt(openingBalance + cashInAmount),
          note: `Cash-In credited · Tran ID: ${cashIn.tran_id}`,
          cls: "",
        });
      } else {
        // Pending row — show the requested amount but mark as pending, no balance change
        rows.push({
          sl: 1,
          date: dayjs(cashIn.created_at).format("DD MMM YYYY"),
          debit: "",
          credit: `${fmt(cashInAmount)} (Pending)`,
          balance: fmt(openingBalance),
          note: `Cash-In Requested · Tran ID: ${cashIn.tran_id} · Awaiting Approval`,
          cls: "pending",
        });
      }

      // Closing row
      rows.push({
        sl: "Closing",
        date: dayjs().format("DD MMM YYYY"),
        debit: "",
        credit: "",
        balance: fmt(closingBalance),
        note: is_approved ? "Closing Balance" : "Closing Balance (Pending — no change)",
        cls: "closing",
      });

      const signatureBlock = (people, title, approvedKey, approvedAtKey) =>
        people?.length > 0
          ? `
    <div class="section-title">${title}</div>
    <div class="sig-grid">
      ${people
        .map(
          (p) => `
        <div class="sig-box">
          <div class="sig-name">${p.name}
            <span class="${p[approvedKey] ? "verified-yes" : "verified-no"}">
              ${p[approvedKey] ? "&#10003; Done" : "Pending"}
            </span>
          </div>
          <div class="sig-email">${p.email}</div>
          ${p[approvedKey] && p[approvedAtKey] ? `<div class="verified-date">Confirmed: ${p[approvedAtKey]}</div>` : ""}
          <div class="sig-line">Signature &amp; Date</div>
        </div>
      `,
        )
        .join("")}
    </div>
  `
          : "";

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Please allow popups for printing.");
        return;
      }

      printWindow.document.write(`
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Cash-In Ledger — ${cashIn.tran_id}</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 13px; color: #1f2937; background: #fff; padding: 32px 28px; }

      .ledger-header { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 16px; margin-bottom: 20px; }
      .ledger-header h1 { font-size: 22px; font-weight: 700; letter-spacing: 3px; color: #1e3a8a; margin-bottom: 4px; }
      .ledger-header p { font-size: 11px; color: #6b7280; margin-bottom: 8px; }
      .badge { display: inline-block; padding: 3px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: .5px; }
      .badge-approved { background: #dcfce7; color: #166534; }
      .badge-pending  { background: #fef3c7; color: #92400e; }

      .warn-bar { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 12px; color: #92400e; }

      .meta-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; margin-bottom: 20px; }
      .meta-cell { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; }
      .meta-cell:nth-child(even) { border-right: none; }
      .meta-cell.full { grid-column: span 2; border-right: none; }
      .meta-label { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 2px; }
      .meta-value { font-weight: 700; color: #111827; font-size: 13px; }

      .section-title { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #1e3a8a; text-transform: uppercase; margin: 22px 0 10px; }
      .section-title::before { content: ''; width: 4px; height: 14px; background: #1e3a8a; border-radius: 2px; display: inline-block; }

      table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 4px; }
      th { background: #1e3a8a; color: #fff; padding: 8px 10px; text-align: center; font-size: 11px; font-weight: 600; letter-spacing: .5px; }
      th.left { text-align: left; }
      td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: right; }
      td.left { text-align: left; }
      td.center { text-align: center; }
      tr.opening td { background: #dbeafe; font-weight: 700; }
      tr.closing td { background: #dcfce7; font-weight: 700; }
      tr.pending  td { background: #fef9c3; }

      .grand-total-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f3f4f6; border-radius: 6px; margin-top: 8px; border: 1px solid #e5e7eb; }
      .section-header { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
       .section-bar { width: 14px; height: 14px; background: #1e3a8a; border-radius: 2px; flex-shrink: 0; }
       .section-label { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #1e3a8a; }

      .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px; }
      .sig-box { border: 1px solid #d1d5db; border-radius: 6px; padding: 14px; background: #fafafa; min-height: 120px; }
      .sig-name { font-weight: 700; font-size: 13px; color: #111827; margin-bottom: 2px; }
      .sig-email { font-size: 11px; color: #6b7280; margin-bottom: 10px; }
      .sig-line { border-top: 1.5px solid #374151; margin-top: 40px; padding-top: 6px; text-align: center; font-size: 10px; color: #9ca3af; }
      .verified-yes { display: inline-block; background: #dcfce7; color: #166534; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 3px; margin-left: 6px; }
      .verified-no  { display: inline-block; background: #fee2e2; color: #991b1b; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 3px; margin-left: 6px; }
      .verified-date { font-size: 10px; color: #059669; font-style: italic; margin-top: 3px; }

      .status-bar { display: flex; gap: 20px; align-items: center; padding: 12px 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; margin-top: 20px; flex-wrap: wrap; }
      .status-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b7280; }
      .status-dot { width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid #9ca3af; background: #fff; display: inline-block; }
      .status-dot.active { background: #1e3a8a; border-color: #1e3a8a; }

      .footer { text-align: center; margin-top: 24px; padding-top: 14px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; }

      @media print {
        @page { size: A4; margin: 15mm; }
        body { padding: 0; }
        .no-print { display: none; }
      }
    </style>
  </head>
  <body>

    <div class="ledger-header">
      <h1>CASH IN LEDGER</h1>
      <p>Official Vault Transaction Record</p>
      <div>
        <span class="badge ${is_approved ? "badge-approved" : "badge-pending"}">
          ${is_approved ? "APPROVED" : "PENDING"}
        </span>
      </div>
    </div>


    <div class="meta-grid">
      <div class="meta-cell"><div class="meta-label">Vault Name</div><div class="meta-value">${vault.name || "—"}</div></div>
      <div class="meta-cell"><div class="meta-label">Vault Code</div><div class="meta-value">${vault.vault_code || "—"}</div></div>
      <div class="meta-cell"><div class="meta-label">Bag Barcode</div><div class="meta-value">${cashIn.bags?.barcode || "—"}</div></div>
      <div class="meta-cell"><div class="meta-label">Rack Number</div><div class="meta-value">RN-${cashIn.bags?.rack_number || "—"}</div></div>
      <div class="meta-cell"><div class="meta-label">Transaction ID</div><div class="meta-value" style="font-family:monospace">${cashIn.tran_id}</div></div>
      <div class="meta-cell"><div class="meta-label">Date</div><div class="meta-value">${dayjs(cashIn.created_at).format("DD MMM YYYY")}</div></div>
      <div class="meta-cell"><div class="meta-label">Opening Balance</div><div class="meta-value">${fmt(openingBalance)}</div></div>
      <div class="meta-cell"><div class="meta-label">Generated Time</div><div class="meta-value">${dayjs().format("hh:mm A")}</div></div>
      <div class="meta-cell full"><div class="meta-label">Prepared By</div><div class="meta-value">${cashIn.user?.name || "—"}</div></div>
    </div>

    ${
      cashIn.denominations && Object.values(cashIn.denominations).some((v) => v > 0)
        ? `
    <div class="section-title">Denomination Breakdown</div>
    <table>
      <thead><tr><th class="left">Denomination</th><th>Count</th><th>Total (৳)</th></tr></thead>
      <tbody>
        ${Object.entries(cashIn.denominations)
          .filter(([, cnt]) => cnt > 0)
          .sort(([a], [b]) => b - a)
          .map(
            ([note, cnt]) => `
            <tr>
              <td class="left">৳${parseInt(note).toLocaleString()}</td>
              <td class="center">${cnt}</td>
              <td>${(note * cnt).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
            </tr>
          `,
          )
          .join("")}
      </tbody>
    </table>
    <div class="grand-total-row">
      <span style="font-weight:700">Grand Total</span>
      <span style="font-weight:700;font-size:15px;color:#1e3a8a">${fmt(cashInAmount)}</span>
    </div>`
        : ""
    }

    <p></p>
    <p></p>
    <hr>

   <div class="section-header section-title">
      <div class="section-bar"></div>
      <span class="section-label">Bag Summary</span>
    </div>
    <div class="field-row">
      <span class="label">Bag Amount:</span>
      <span class="field-line">${fmt(cashInAmount)}</span>
    </div>

    <hr>


    ${signatureBlock(verifiers, "Verifiers", "verified", "verified_at")}
    ${signatureBlock(approvers, "Cashers", "approved", "approved_at")}

    <div class="status-bar">
      <span style="font-size:12px;font-weight:700;color:#374151;margin-right:4px">Status:</span>
      ${["Pending", "Verified", "Approved", "Completed", "Rejected"]
        .map(
          (s) => `
        <span class="status-item">
          <span class="status-dot ${cashIn.status?.toLowerCase() === s.toLowerCase() ? "active" : ""}"></span>${s}
        </span>
      `,
        )
        .join("")}
    </div>

    <div class="footer">
      Generated on ${dayjs().format("DD MMM YYYY, hh:mm A")} &middot; QBits Vault Management System
    </div>

    <script>window.onload = () => setTimeout(() => window.print(), 500);<\/script>
  </body>
  </html>
`);
      printWindow.document.close();
    } catch (err) {
      console.error("Error generating ledger:", err);
      alert("Failed to generate ledger statement. Please try again.");
    }
  };

  const ExpandableOrderIds = ({ orders, onIdClick }) => {
    if (!orders || orders.length === 0) return <span className="text-gray-400">—</span>;

    return (
      <div className="flex flex-wrap gap-x-1 gap-y-0.5 w-full max-w-[200px]">
        {orders.map((order, i) => (
          <span
            key={order.order_id || `order-${i}`}
            onClick={() => onIdClick(order)}
            className="whitespace-nowrap hover:text-indigo-600 hover:underline cursor-pointer"
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
    try {
      const res = await DeleteCashIn(id);

      if (res?.success === true) {
        fetchCashInsData();
        addToast({ message: "Cash-in deleted successfully", type: "success" });
      }
    } catch (err) {
      console.error("Failed to delete cash-in:", err);
    } finally {
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
      className: "w-14",
      render: (row) => <span className="font-mono text-indigo-500 uppercase">{row.vault?.name}</span>,
    },
    {
      title: "Bag",
      key: "bag",
      className: "w-24",
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
      className: "w-24",
      render: (row) => <span>{row?.tran_id}</span>,
    },
    {
      title: "Order Ids",
      key: "orders",
      className: "w-[200px]",
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
      className: "w-10",
      render: (row) => <span>{row?.cash_in_amount}</span>,
    },
    {
      title: "Req at",
      key: "created_at",
      className: "w-24",
      render: (row) => <span>{dayjs(row.created_at).format("DD MMM, YYYY")}</span>,
    },
    {
      title: "Verifiers",
      key: "required_verifiers",
      className: "w-20 text-center",
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
      className: "w-20 text-center",
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
      className: "w-14 relative",
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
                          className="px-2 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteCashIn(row.id); }}
                          className="px-2 py-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded transition-colors cursor-pointer"
                        >
                          Confirm
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
        <div>
          <h1 className="text-lg font-semibold text-gray-600 uppercase">Cash In List</h1>
          <p className="text-xs text-gray-400">Manage Your All Cash In</p>
        </div>
        <div className="flex items-center gap-4">
          {hasPermission("cash-in.request") && (
            <div
              onClick={() => {
                setEditCashInData(null);
                setOpenCashInReqDrawer(true);
              }}
              className="cursor-pointer transition-all px-4 py-2 hover:bg-black rounded text-white bg-[#424242]"
            >
              Cash In Request
            </div>
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
