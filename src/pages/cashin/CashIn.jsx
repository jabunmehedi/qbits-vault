import { useCallback, useEffect, useState } from "react";
import DataTable from "../../components/global/dataTable/DataTable";
import { GetOrders } from "../../services/Orders";
import dayjs from "dayjs";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import JsBarcode from "jsbarcode";
import CashDepositConfirmModal from "../../components/cashin/CashDepositConfirmModal";
import { GetCashIn } from "../../services/Cash";
import VerifierAvatars from "../../components/global/verifierAvatars.jsx/VerifierAvatars";
import { selectIsLockedForOperations } from "../../store/checkReconcile";
import { useSelector } from "react-redux";
import { GetCashInLedger } from "../../services/Ledger";

// FIX: Unified denomination initial state (handleBack had extra 5,2,1 keys not in original)
const DENOM_NOTES = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
const INITIAL_DENOMINATIONS = Object.fromEntries(DENOM_NOTES.map((n) => [n, 0]));

const CashIn = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const step = parseInt(searchParams.get("step") || "0");
  const currentPage = parseInt(searchParams.get("page") || "1");
  const searchTerm = searchParams.get("search") || "";
  const perPage = parseInt(searchParams.get("per_page") || "10");

  const [cashIns, setCashIns] = useState([]);
  const [cashInsLoaded, setCashInsLoaded] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [orders, setOrders] = useState([]);
  const [paginationData, setPaginationData] = useState({});
  const [loading, setLoading] = useState(false);
  const [amounts, setAmounts] = useState({});
  const [denominations, setDenominations] = useState(INITIAL_DENOMINATIONS);
  const [transactionId, setTransactionId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isLocked = useSelector(selectIsLockedForOperations);

  // Load persisted wizard data on mount
  useEffect(() => {
    const saved = localStorage.getItem("cashInWizard");
    if (saved) {
      const { selectedRows: sr, amounts: am, denominations: dn } = JSON.parse(saved);
      if (sr) setSelectedRows(sr);
      if (am) setAmounts(am);
      if (dn) setDenominations(dn);
    }
  }, []);

  // Persist wizard data when past step 1
  useEffect(() => {
    if (step > 1) {
      localStorage.setItem("cashInWizard", JSON.stringify({ selectedRows, amounts, denominations }));
    }
  }, [selectedRows, amounts, denominations, step]);

  // Auto-fill amounts from selected rows when entering step 2
  useEffect(() => {
    if (step !== 2) return;
    const newAmounts = {};
    selectedRows.forEach((row) => {
      newAmounts[row.id] = row.total_cash_to_deposit || 0;
    });
    setAmounts(newAmounts);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // FIX: Only fetch cash-ins when on step 0, not on every step change
  const fetchCashInsData = useCallback(() => {
    setLoading(true);
    GetCashIn()
      .then((res) => {
        setCashIns(res?.data?.data || []);
        setCashInsLoaded(true);
        // FIX: was incorrectly assigning data to paginationData
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // FIX: Added proper dependency array so orders re-fetch on page/search/perPage changes.
  // Previously dep array was [] — stale closure meant it never re-fetched.
  const fetchOrders = useCallback(async () => {
    if (step !== 1 || !cashInsLoaded) return;
    setLoading(true);
    try {
      const excludedOrderIds = cashIns
        .flatMap((c) => c.orders || [])
        .map((o) => o.order_id)
        .filter(Boolean);

      const res = await GetOrders({
        page: currentPage,
        search: searchTerm || undefined,
        per_page: perPage,
        exclude_order_ids: excludedOrderIds.length > 0 ? excludedOrderIds : undefined,
      });
      setOrders(res?.data?.orders || []);
      setPaginationData(res?.data?.pagination || {});
    } catch (err) {
      console.error("Error fetching orders:", err);
      setOrders([]);
      setPaginationData({});
    } finally {
      setLoading(false);
    }
  }, [step, cashInsLoaded, cashIns, currentPage, searchTerm, perPage]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

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

  const totalDenominationAmount = Object.entries(denominations).reduce((sum, [value, count]) => sum + parseInt(value) * parseInt(count || 0), 0);

  const generateTransactionId = () =>
    `TXN-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9999)
      .toString()
      .padStart(4, "0")}`;

  const handleNext = () => {
    if (step === 1 && selectedRows.length === 0) {
      alert("Please select at least one order");
      return;
    }
    if (step === 2 && !selectedRows.some((row) => parseFloat(amounts[row.id]) > 0)) {
      alert("Please enter amount for at least one order");
      return;
    }
    setSearchParams({ step: step + 1 });
  };

  const DenomStatusBadge = ({ denomTotal, target }) => {
    const diff = denomTotal - target;
    const matched = Math.abs(diff) < 0.01;

    if (matched) {
      return <span className="inline-flex items-center text-xs px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400">Matched</span>;
    }

    if (diff > 0) {
      return (
        <span className="inline-flex items-center text-sm px-3 py-1 rounded-full bg-red-500/10 border border-red-400/30 text-red-400">
          ৳{diff.toFixed(2)} over
        </span>
      );
    }

    return (
      <span className="inline-flex items-center text-sm px-3 py-1 rounded-full bg-red-500/10 border border-red-400/30 text-red-400">
        ৳{Math.abs(diff).toFixed(2)} left
      </span>
    );
  };

  const handleBack = () => {
    if (step > 0) {
      setSearchParams({ step: step - 1 });
    } else {
      // FIX: use unified constant so reset is consistent with initial state
      localStorage.removeItem("cashInWizard");
      setSelectedRows([]);
      setAmounts({});
      setDenominations(INITIAL_DENOMINATIONS);
      setTransactionId(null);
    }
  };

  const handleFinish = () => {
    if (Math.abs(totalDenominationAmount - totalEnteredAmount) > 0.01) {
      alert(`Denomination total (৳${totalDenominationAmount}) must match entered amount (৳${totalEnteredAmount})`);
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmAndComplete = () => {
    setTransactionId(generateTransactionId());
    setShowConfirmModal(false);
    setSearchParams({ step: 4 });
  };

  const downloadCashInLedger = async (cashIn) => {
    try {
      const response = await GetCashInLedger(cashIn.id);
      if (!response.success) throw new Error(response.message || "Failed to fetch ledger data");

      const { ledger_rows, vault, is_approved, verifiers, approvers } = response.data;

      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <html>
          <head>
            <title>Ledger Statement - ${cashIn.tran_id}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px 20px; color: #1f2937; }
              h1 { text-align: center; color: #1e40af; margin-bottom: 10px; }
              .header-info { text-align: center; color: #4b5563; margin-bottom: 30px; }
              .status-badge { display:inline-block; padding:4px 12px; border-radius:9999px; font-size:12px; font-weight:600; margin-left:10px; }
              .status-approved { background:#dcfce7; color:#166534; }
              .status-pending  { background:#fef3c7; color:#92400e; }
              table { width:100%; border-collapse:collapse; margin-top:20px; }
              th, td { border:1px solid #d1d5db; padding:12px; text-align:right; }
              th { background:#f3f4f6; text-align:center; font-weight:600; }
              .left { text-align:left; }
              .opening { background:#dbeafe; font-weight:600; }
              .closing { background:#dcfce7; font-weight:600; }
              .info-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:20px; margin:20px 0; padding:20px; background:#f9fafb; border-radius:8px; }
              .info-item { display:flex; justify-content:space-between; }
              .info-label { color:#6b7280; font-weight:500; }
              .info-value { font-weight:600; color:#1f2937; }
              .signature-section { margin-top:20px; page-break-inside:avoid; }
              .signature-title { font-size:16px; font-weight:600; color:#1e40af; margin-bottom:20px; padding-bottom:10px; border-bottom:2px solid #e5e7eb; }
              .signature-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:30px; margin-bottom:40px; }
              .signature-box { border:1px solid #d1d5db; border-radius:8px; padding:20px; background:#f9fafb; min-height:140px; }
              .signature-name { font-weight:600; color:#1f2937; margin-bottom:5px; font-size:14px; }
              .signature-email { font-size:12px; color:#6b7280; margin-bottom:15px; }
              .signature-line { border-top:2px solid #000; margin-top:40px; padding-top:8px; text-align:center; font-size:11px; color:#6b7280; }
              .verified-badge { display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600; margin-left:8px; }
              .verified-yes { background:#dcfce7; color:#166534; }
              .verified-no  { background:#fee2e2; color:#991b1b; }
              .verified-date { font-size:11px; color:#059669; margin-top:5px; font-style:italic; }
              @media print { body { margin:20px; } }
            </style>
          </head>
          <body>
            <h1>Cash-In Ledger Statement</h1>
            <div class="header-info">
              Transaction ID: <strong>${cashIn.tran_id}</strong>
              <span class="status-badge ${is_approved ? "status-approved" : "status-pending"}">${is_approved ? "APPROVED" : "PENDING"}</span>
              <br>Date: ${dayjs(cashIn.created_at).format("DD MMM YYYY, hh:mm A")}
            </div>
            <div class="info-grid">
              <div class="info-item"><span class="info-label">Vault ID:</span><span class="info-value">${vault.vault_id || "—"}</span></div>
              <div class="info-item"><span class="info-label">Bag Barcode:</span><span class="info-value">${cashIn.bags?.barcode || "—"}</span></div>
              <div class="info-item"><span class="info-label">Rack Number:</span><span class="info-value">RN${cashIn.bags?.rack_number || "—"}</span></div>
              <div class="info-item"><span class="info-label">Cash-In Amount:</span><span class="info-value">৳${parseFloat(cashIn.cash_in_amount).toFixed(2)}</span></div>
              <div class="info-item"><span class="info-label">Vault Balance:</span><span class="info-value">৳${parseFloat(vault.current_balance).toFixed(2)}</span></div>
              <div class="info-item"><span class="info-label">Orders:</span><span class="info-value">${cashIn.orders?.length || 0}</span></div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width:80px">SL</th><th style="width:120px">Date</th>
                  <th style="width:140px">Debit (৳)</th><th style="width:140px">Credit (৳)</th>
                  <th style="width:140px">Balance (৳)</th><th class="left">Particulars</th>
                </tr>
              </thead>
              <tbody>
                ${ledger_rows
                  .map(
                    (row) => `
                  <tr class="${row.sl === "Opening" ? "opening" : row.sl === "Closing" ? "closing" : ""}">
                    <td style="text-align:center">${row.sl}</td>
                    <td style="text-align:center">${row.date}</td>
                    <td>${row.debit || "—"}</td>
                    <td>${row.credit || "—"}</td>
                    <td><strong>${row.balance}</strong></td>
                    <td class="left">${row.note}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
            ${
              cashIn.orders?.length > 0
                ? `
              <div style="margin-top:30px">
                <h3 style="color:#1e40af;margin-bottom:15px">Order Details</h3>
                <table style="margin-top:10px">
                  <thead><tr><th>Order ID</th><th>Amount (৳)</th></tr></thead>
                  <tbody>
                    ${cashIn.orders
                      .map(
                        (o) => `
                      <tr>
                        <td class="left">${o.order_id || "—"}</td>
                        <td>৳${parseFloat(o.amount || 0).toFixed(2)}</td>
                      </tr>
                    `,
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            `
                : ""
            }
            ${
              verifiers?.length > 0
                ? `
              <div class="signature-section">
                <div class="signature-title">Verifiers (${verifiers.length})</div>
                <div class="signature-grid">
                  ${verifiers
                    .map(
                      (v) => `
                    <div class="signature-box">
                      <div class="signature-name">${v.name}<span class="verified-badge ${v.verified ? "verified-yes" : "verified-no"}">${v.verified ? "✓ Verified" : "Pending"}</span></div>
                      <div class="signature-email">${v.email}</div>
                      ${v.verified && v.verified_at ? `<div class="verified-date">Verified on: ${v.verified_at}</div>` : ""}
                      <div class="signature-line">Signature & Date</div>
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              </div>
            `
                : ""
            }
            ${
              approvers?.length > 0
                ? `
              <div class="signature-section">
                <div class="signature-title">Approvers (${approvers.length})</div>
                <div class="signature-grid">
                  ${approvers
                    .map(
                      (a) => `
                    <div class="signature-box">
                      <div class="signature-name">${a.name}<span class="verified-badge ${a.approved ? "verified-yes" : "verified-no"}">${a.approved ? "✓ Approved" : "Pending"}</span></div>
                      <div class="signature-email">${a.email}</div>
                      ${a.approved && a.approved_at ? `<div class="verified-date">Approved on: ${a.approved_at}</div>` : ""}
                      <div class="signature-line">Signature & Date</div>
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              </div>
            `
                : ""
            }
            <div style="text-align:center;margin-top:40px;color:#9ca3af;font-size:12px">
              Generated on ${dayjs().format("DD MMM YYYY, hh:mm A")}
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

  // FIX: Renamed duplicate title keys to "Verifier status" / "Approver status"
  const columnsStep0 = [
    {
      title: "Vault",
      key: "vault_id",
      className: "w-14",
      render: (row) => <span className="font-mono text-cyan-400">{row.vault?.vault_id}</span>,
    },
    {
      title: "Bag",
      key: "bag",
      className: "w-24",
      render: (row) => (
        <span>
          {row?.bags?.barcode}-RN{row?.bags?.rack_number}
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
      className: "w-[150px]",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {row?.orders?.map((order, i) => (
            <span key={i}>
              {order?.order_id},
            </span>
          ))}
        </div>
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
      className: "w-20",
      render: (row) => <span>{dayjs(row.created_at).format("DD MMM, YYYY hh:mm A")}</span>,
    },
    {
      title: "Verifiers",
      key: "required_verifiers",
      className: "w-20",
      render: (row) => <VerifierAvatars requiredVerifiers={row.required_verifiers || []} />,
    },
    {
      title: "Approvers",
      key: "required_approvers",
      className: "w-20",
      render: (row) => <VerifierAvatars requiredVerifiers={row.required_approvers || []} />,
    },
    // FIX: Renamed from duplicate "Verifiers" → "Verifier status"
    {
      title: "Verifier status",
      key: "verifier_status",
      className: "w-20",
      render: (row) => (
        <span
          className={`capitalize text-xs px-2.5 py-1 rounded-full border ${
            row?.verifier_status === "pending" ? "bg-yellow-50 border-yellow-200 text-yellow-600" : "bg-green-50 border-green-200 text-green-500"
          }`}
        >
          {row?.verifier_status}
        </span>
      ),
    },
    // FIX: Renamed from duplicate "Approvers" → "Approver status"
    {
      title: "Approver status",
      key: "status",
      className: "w-20",
      render: (row) => (
        <span
          className={`capitalize text-xs px-2.5 py-1 rounded-full border ${
            row?.status === "pending" ? "bg-yellow-50 border-yellow-200 text-yellow-600" : "bg-green-50 border-green-200 text-green-500"
          }`}
        >
          {row?.status}
        </span>
      ),
    },
    {
      title: "Action",
      key: "actions",
      className: "w-24",
      render: (row) => {
        const isOneVerified = row?.required_verifiers?.some((v) => v?.verified);

        return (
          <div className="flex items-center gap-3 py-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className={`p-2 rounded-lg ${isOneVerified ? "hidden" : ""} bg-blue-500/10 cursor-pointer hover:bg-blue-500/20 text-blue-600 border border-blue-400/20 transition-all`}
              aria-label="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete?`)) {
                }
              }}
              className={`p-2 rounded-lg ${isOneVerified ? "hidden" : ""} bg-red-500/10 cursor-pointer hover:bg-red-500/20 text-red-600 border border-red-400/20 transition-all`}
              aria-label="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </motion.button>

            <div className="relative group">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  downloadCashInLedger(row);
                }}
                className="p-2 cursor-pointer rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-400/20 transition-all"
                title="Ledger Statement"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </motion.button>
              <div className="absolute bottom-full z-100 left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Ledger Statement
              </div>
            </div>
          </div>
        );
      },
    },
  ];

  const columnsStep1 = [
    { title: "Order ID", key: "order_id", className: "w-32", render: (row) => <span className="font-mono text-cyan-400">{row.order_id}</span> },
    { title: "Customer", key: "customer", className: "w-24", render: (row) => <span>{row?.customer_name}</span> },
    { title: "Phone", key: "customer", className: "w-28", render: (row) => <span>{row?.customer_phone}</span> },
    { title: "Total", key: "payable_amount", className: "w-40", render: (row) => <span>{row?.payable_amount}</span> },
    { title: "Paid", key: "paid_amount", className: "w-40", render: (row) => <span>{row?.paid_amount}</span> },
    { title: "Online Pay", key: "online_pay", className: "w-40", render: (row) => <span>{row?.paid_amount - row?.total_cash_to_deposit}</span> },
    { title: "Received From ST", key: "received_st", className: "w-40", render: (row) => <span>{row?.total_cash_to_deposit}</span> },
    { title: "Received Date", key: "received_date", className: "w-40", render: (row) => <span>{dayjs(row.created_at).format("DD MMM, YYYY")}</span> },
    {
      title: "Select",
      key: "selection",
      className: "w-40",
      render: (row) => {
        const isSelected = selectedRows.some((s) => s.id === row.id);
        return (
          <div className="flex items-center justify-center">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRows((prev) => (prev.some((item) => item.id === row.id) ? prev.filter((item) => item.id !== row.id) : [...prev, row]));
              }}
              className={`relative w-7 h-7 rounded-full flex items-center justify-center border overflow-hidden transition-all duration-300 ${
                isSelected ? "bg-cyan-50 border-cyan-500" : "bg-transparent border-gray-200 hover:border-sky-500"
              }`}
              aria-label={isSelected ? "Deselect" : "Select"}
            >
              <motion.div className="absolute inset-0 bg-cyan-500/20" initial={false} animate={{ scale: isSelected ? 1 : 0 }} transition={{ duration: 0.35 }} />
              <motion.svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 relative z-10 pointer-events-none" initial={false}>
                <motion.path
                  d="M4 12L9 17L20 6"
                  stroke="blue"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: isSelected ? 1 : 0, opacity: isSelected ? 1 : 0 }}
                  transition={{ duration: 0.35, opacity: { duration: 0.15 }, pathLength: { delay: isSelected ? 0.1 : 0 } }}
                />
              </motion.svg>
            </motion.button>
          </div>
        );
      },
    },
  ];

  const columnsStep2 = [
    { title: "Order ID", key: "order_id", className: "w-32", render: (row) => <span className="font-mono text-cyan-400">{row.order_id}</span> },
    { title: "Cash To Deposit", key: "total_cash_to_deposit", className: "w-40", render: (row) => <span>{row?.total_cash_to_deposit}</span> },
    {
      title: "Cash To Vault",
      key: "amount",
      className: "w-40",
      // FIX: was missing onChange — input was effectively read-only
      render: (row) => (
        <input
          readOnly
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          className="px-4 py-2 bg-transparent rounded-lg text-gray-600 focus:outline-none"
          value={amounts[row.id] ?? row.total_cash_to_deposit ?? 0}
          onChange={(e) => setAmounts((prev) => ({ ...prev, [row.id]: e.target.value }))}
        />
      ),
    },
  ];

  const stepTitle = ["Cash In List", "Orders List", "Vault CashIn Amounts", "Enter Denominations", "Transaction Complete"][step] ?? "";
  const stepDes =
    ["Manage Your All Cash In", "Select orders to cash in", "Select orders to cash in", "Select denominations to cash in", "Cash In Complete"][step] ?? "";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-600">{stepTitle}</h1>
          <p className="text-xs text-gray-400">{stepDes}</p>
        </div>
        <div className="flex items-center gap-4">
          {step >= 1 && (
            <div
              onClick={handleBack}
              className="cursor-pointer transition-all px-4 py-1 hover:bg-gray-100 rounded-lg text-zinc-500 hover:text-black border border-zinc-100"
            >
              Back
            </div>
          )}
          {step === 0 && !isLocked && (
            <div onClick={handleNext} className="cursor-pointer transition-all px-4 py-2 hover:bg-black rounded text-white bg-[#424242]">
              Cash In Request
            </div>
          )}
          {step === 1 && selectedRows.length > 0 && (
            <div
              onClick={handleNext}
              className="cursor-pointer transition-all px-4 py-1 hover:bg-white/10 rounded-lg text-cyan-300 hover:text-cyan-600 bg-cyan-50 border border-cyan-300"
            >
              Next
            </div>
          )}
          {step === 2 && (
            <div
              onClick={handleNext}
              className="cursor-pointer transition-all px-4 py-1 rounded-lg bg-cyan-500 text-white border border-cyan-500/50 hover:text-gray-600"
            >
              Next
            </div>
          )}
          {step === 3 && totalDenominationAmount === totalEnteredAmount && (
            <div
              onClick={handleFinish}
              className="cursor-pointer transition-all px-4 py-1 hover:bg-black duration-300 ease-in-out rounded-lg text-white bg-[#424242] border border-cyan-500/50"
            >
              Finish
            </div>
          )}
        </div>
      </div>

      {/* Step 0: Cash In List */}
      {step === 0 && (
        <DataTable
          columns={columnsStep0}
          data={cashIns}
          changePage={handlePageChange}
          onSearch={handleSearch}
          paginationData={paginationData}
          selectedRows={selectedRows}
          loading={loading}
          setSelectedRows={setSelectedRows}
          className="h-[calc(100vh-120px)]"
        />
      )}

      {/* Step 1: Select Orders */}
      {step === 1 && (
        <DataTable
          columns={columnsStep1}
          data={orders}
          changePage={handlePageChange}
          onSearch={handleSearch}
          paginationData={paginationData}
          selectedRows={selectedRows}
          loading={loading}
          setSelectedRows={setSelectedRows}
          className="h-[calc(100vh-100px)]"
        />
      )}

      {/* Step 2: Enter Amounts */}
      {step === 2 && (
        <div>
          <p className="mb-4 text-gray-400 text-sm">
            Total Orders: <span className="text-gray-500 font-bold">{selectedRows.length}</span> | Total Amount: ৳
            <span className="text-gray-500 font-bold">{totalEnteredAmount.toFixed(2)}</span>
          </p>
          <DataTable columns={columnsStep2} data={selectedRows} paginationData={{}} className="h-[calc(100vh-150px)]" />
        </div>
      )}

      {/* Step 3: Denominations */}
      {step === 3 && (
        <div className="p-4 mt-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Summary bar */}
            <div className="flex items-center gap-4 px-4 py-3 rounded-lg border border-gray-200 bg-white">
              <div className="flex-1">
                <p className="text-xs text-gray-400">Target amount</p>
                <p className="text-lg font-medium text-black">৳{totalEnteredAmount.toFixed(2)}</p>
              </div>

              <div className="w-px h-9 bg-gray-300" />

              <div className="flex-1">
                <p className="text-xs text-gray-400">Denomination total</p>
                <p className="text-lg font-medium text-black">৳{totalDenominationAmount.toFixed(2)}</p>
              </div>

              <div className="w-px h-9 bg-gray-300" />

              <div className="flex-none">
                <p className="text-xs text-end text-gray-400">Status</p>
                <DenomStatusBadge denomTotal={totalDenominationAmount} target={totalEnteredAmount} />
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-gray-300 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${totalDenominationAmount > totalEnteredAmount ? "bg-red-500" : "bg-cyan-500"}`}
                style={{
                  width: totalEnteredAmount > 0 ? `${Math.min(100, (totalDenominationAmount / totalEnteredAmount) * 100)}%` : "0%",
                }}
              />
            </div>

            {/* Denomination cards — big to small */}
            <div className="grid grid-cols-5 gap-3">
              {DENOM_NOTES.map((n) => {
                const count = parseInt(denominations[n]) || 0;
                const hasValue = count > 0;
                return (
                  <div
                    key={n}
                    className={`flex flex-col items-center gap-1.5 rounded-lg p-3 border transition-all ${
                      hasValue ? "bg-[#E1F5EE]/50 border-green-500" : "bg-[#F5F4ED] border-zinc-700/40"
                    }`}
                  >
                    <span className={`text-sm font-medium ${hasValue ? "text-green-800" : "text-gray-800"}`}>৳{n}</span>

                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="0"
                      value={count > 0 ? count : ""}
                      className={`w-full text-center py-1 rounded-md text-base font-medium bg-white border outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none ${
                        hasValue ? "text-black border-gray-400" : "text-zinc-300"
                      }`}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        setDenominations((prev) => ({
                          ...prev,
                          [n]: parseInt(raw) || 0,
                        }));
                      }}
                      onFocus={(e) => e.target.select()}
                    />

                    <span className={`text-sm font-semibold min-h-[14px] ${hasValue ? "text-green-800" : "text-transparent"}`}>
                      {hasValue ? `৳${(n * count).toLocaleString()}` : "-"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Per-note summary pills */}
            <div className="grid grid-cols-5 gap-2">
              {DENOM_NOTES.map((n) => {
                const count = parseInt(denominations[n]) || 0;
                return (
                  <div
                    key={n}
                    className={`text-center text-sm py-1.5 flex flex-col rounded border ${
                      count > 0 ? "bg-[#E1F5EE]/50 border-green-500 text-green-800" : "bg-transparent border-zinc-700/30 text-zinc-600"
                    }`}
                  >
                    ৳{n} <span className="font-medium">x{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 4 && transactionId && (
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-800/80 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-10"
          >
            <h2 className="text-4xl font-bold text-green-400 mb-6">Cash In Successful!</h2>
            <p className="text-xl text-zinc-300 mb-4">Transaction ID</p>
            <p className="text-3xl font-mono text-cyan-400 mb-10 tracking-wider">{transactionId}</p>
            <div className="flex justify-center mb-10">
              <canvas
                ref={(canvas) => {
                  if (canvas && transactionId) {
                    JsBarcode(canvas, transactionId, {
                      format: "CODE128",
                      width: 2.5,
                      height: 100,
                      displayValue: true,
                      fontSize: 20,
                      textMargin: 10,
                      font: "monospace",
                      background: "#18181b",
                      lineColor: "#67e8f9",
                      margin: 20,
                    });
                  }
                }}
              />
            </div>
            <div className="text-left bg-zinc-900/80 rounded-xl p-6 mb-8">
              <p className="text-lg">
                Orders: <strong>{selectedRows.length}</strong>
              </p>
              <p className="text-lg">
                Total Amount: <strong className="text-cyan-400">৳{totalEnteredAmount.toFixed(2)}</strong>
              </p>
              <p className="text-sm text-zinc-400 mt-4">Denominations:</p>
              {Object.entries(denominations)
                .filter(([, count]) => count > 0)
                .map(([note, count]) => (
                  <p key={note} className="text-sm">
                    {note} TK × {count} = ৳{(note * count).toLocaleString()}
                  </p>
                ))}
            </div>
            <button onClick={() => window.print()} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-semibold text-lg transition">
              Print Receipt
            </button>
          </motion.div>
        </div>
      )}

      <CashDepositConfirmModal
        showConfirmModal={showConfirmModal}
        setShowConfirmModal={setShowConfirmModal}
        totalEnteredAmount={totalEnteredAmount}
        denominations={denominations}
        selectedRows={selectedRows}
        amounts={amounts}
        onConfirm={confirmAndComplete}
      />
    </div>
  );
};

export default CashIn;
