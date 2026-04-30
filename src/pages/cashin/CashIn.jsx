import { useCallback, useEffect, useState } from "react";
import DataTable from "../../components/global/dataTable/DataTable";
import dayjs from "dayjs";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
// import JsBarcode from "jsbarcode";
import CashDepositConfirmModal from "../../components/cashin/CashDepositConfirmModal";
import { GetCashIn } from "../../services/Cash";
import VerifierAvatars from "../../components/global/verifierAvatars.jsx/VerifierAvatars";
import { GetCashInLedger } from "../../services/Ledger";
import { HiDotsHorizontal } from "react-icons/hi";
import CashInRequestDrawer from "../../components/cashin/CashInRequestDrawer";

const DENOM_NOTES = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
const INITIAL_DENOMINATIONS = Object.fromEntries(DENOM_NOTES.map((n) => [n, 0]));

const CashIn = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [cashIns, setCashIns] = useState([]);
  const [cashInsLoaded, setCashInsLoaded] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [paginationData, setPaginationData] = useState({});
  const [loading, setLoading] = useState(false);
  const [amounts, setAmounts] = useState({});
  const [denominations, setDenominations] = useState(INITIAL_DENOMINATIONS);
  const [transactionId, setTransactionId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [openCashInReqDrawer, setOpenCashInReqDrawer] = useState(false);

  const toggleRow = (rowId, e) => {
    e.stopPropagation();
    setExpandedRows((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  };

  const fetchCashInsData = useCallback(() => {
    setLoading(true);
    GetCashIn()
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

  const DenomStatusBadge = ({ denomTotal, target }) => {
    const diff = denomTotal - target;
    const matched = Math.abs(diff) < 0.01;
    if (matched)
      return <span className="inline-flex items-center text-xs px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400">Matched</span>;
    if (diff > 0)
      return (
        <span className="inline-flex items-center text-sm px-3 py-1 rounded-full bg-red-500/10 border border-red-400/30 text-red-400">
          ৳{diff.toFixed(2)} over
        </span>
      );
    return (
      <span className="inline-flex items-center text-sm px-3 py-1 rounded-full bg-red-500/10 border border-red-400/30 text-red-400">
        ৳{Math.abs(diff).toFixed(2)} left
      </span>
    );
  };

  const confirmAndComplete = () => {
    setTransactionId(generateTransactionId());
    setShowConfirmModal(false);
    setSearchParams({ step: 4 });
  };

  //old design dont delete
  // const downloadCashInLedger = async (cashIn) => {
  //   try {
  //     const response = await GetCashInLedger(cashIn.id);
  //     if (!response.success) throw new Error(response.message || "Failed to fetch ledger data");

  //     const { vault, is_approved, verifiers, approvers } = response.data;

  //     const cashInAmount = parseFloat(cashIn.cash_in_amount || 0);
  //     const vaultBalance = parseFloat(vault.current_balance || 0);

  //     // Opening = balance before this cash-in
  //     // If already approved the vault balance already includes cashInAmount, so subtract it back.
  //     // If still pending the vault hasn't changed, so opening = current vault balance.
  //     const openingBalance = is_approved ? vaultBalance - cashInAmount : vaultBalance;

  //     const closingBalance = is_approved ? openingBalance + cashInAmount : openingBalance;

  //     const fmt = (n) => `৳${parseFloat(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  //     // Build ledger rows
  //     const rows = [];

  //     // Opening row
  //     rows.push({
  //       sl: "Opening",
  //       date: dayjs(cashIn.created_at).format("DD MMM YYYY"),
  //       debit: "",
  //       credit: "",
  //       balance: fmt(openingBalance),
  //       note: "Opening Balance",
  //       cls: "opening",
  //     });

  //     // Transaction row — only if approved
  //     if (is_approved) {
  //       rows.push({
  //         sl: 1,
  //         date: dayjs(cashIn.updated_at || cashIn.created_at).format("DD MMM YYYY"),
  //         debit: "",
  //         credit: fmt(cashInAmount),
  //         balance: fmt(openingBalance + cashInAmount),
  //         note: `Cash-In credited · Tran ID: ${cashIn.tran_id}`,
  //         cls: "",
  //       });
  //     } else {
  //       // Pending row — show the requested amount but mark as pending, no balance change
  //       rows.push({
  //         sl: 1,
  //         date: dayjs(cashIn.created_at).format("DD MMM YYYY"),
  //         debit: "",
  //         credit: `${fmt(cashInAmount)} (Pending)`,
  //         balance: fmt(openingBalance),
  //         note: `Cash-In Requested · Tran ID: ${cashIn.tran_id} · Awaiting Approval`,
  //         cls: "pending",
  //       });
  //     }

  //     // Closing row
  //     rows.push({
  //       sl: "Closing",
  //       date: dayjs().format("DD MMM YYYY"),
  //       debit: "",
  //       credit: "",
  //       balance: fmt(closingBalance),
  //       note: is_approved ? "Closing Balance" : "Closing Balance (Pending — no change)",
  //       cls: "closing",
  //     });

  //     const rowsHtml = rows
  //       .map(
  //         (row) => `
  //         <tr class="${row.cls || ""}">
  //           <td style="text-align:center">${row.sl}</td>
  //           <td style="text-align:center">${row.date}</td>
  //           <td class="debit">${row.debit || "—"}</td>
  //           <td class="credit">${row.credit || "—"}</td>
  //           <td><strong>${row.balance}</strong></td>
  //           <td class="left">${row.note}</td>
  //         </tr>
  //       `,
  //       )
  //       .join("");

  //     const ordersHtml =
  //       cashIn.orders?.length > 0
  //         ? `<div style="margin-top:30px">
  //             <h3 style="color:#1e40af;margin-bottom:15px">Order Details</h3>
  //             <table style="margin-top:10px">
  //               <thead><tr><th>Order ID</th><th>Amount (৳)</th></tr></thead>
  //               <tbody>
  //                 ${cashIn.orders
  //                   .map(
  //                     (o) => `<tr>
  //                     <td class="left">${o.order_id || "—"}</td>
  //                     <td>৳${parseFloat(o.amount || 0).toFixed(2)}</td>
  //                   </tr>`,
  //                   )
  //                   .join("")}
  //               </tbody>
  //             </table>
  //           </div>`
  //         : "";

  //     const signatureBlock = (people, title, approvedKey, approvedAtKey) =>
  //       people?.length > 0
  //         ? `<div class="signature-section">
  //             <div class="signature-title">${title} (${people.length})</div>
  //             <div class="signature-grid">
  //               ${people
  //                 .map(
  //                   (p) => `<div class="signature-box">
  //                   <div class="signature-name">${p.name}
  //                     <span class="verified-badge ${p[approvedKey] ? "verified-yes" : "verified-no"}">
  //                       ${p[approvedKey] ? "✓ " + title.slice(0, -1) + "d" : "Pending"}
  //                     </span>
  //                   </div>
  //                   <div class="signature-email">${p.email}</div>
  //                   ${p[approvedKey] && p[approvedAtKey] ? `<div class="verified-date">${title.slice(0, -1)}d on: ${p[approvedAtKey]}</div>` : ""}
  //                   <div class="signature-line">Signature &amp; Date</div>
  //                 </div>`,
  //                 )
  //                 .join("")}
  //             </div>
  //           </div>`
  //         : "";

  //     const printWindow = window.open("", "_blank");
  //     if (!printWindow) {
  //       alert("Please allow popups for printing.");
  //       return;
  //     }

  //     printWindow.document.write(`
  //       <!DOCTYPE html>
  //       <html>
  //       <head>
  //         <meta charset="utf-8">
  //         <title>Ledger Statement — ${cashIn.tran_id}</title>
  //         <style>
  //           *, *::before, *::after { box-sizing: border-box; }
  //           body { font-family: Arial, sans-serif; margin: 40px 20px; color: #1f2937; }
  //           h1   { text-align: center; color: #1e40af; margin-bottom: 10px; }
  //           .header-info { text-align: center; color: #4b5563; margin-bottom: 30px; }
  //           .status-badge { display:inline-block; padding:4px 12px; border-radius:9999px; font-size:12px; font-weight:600; margin-left:10px; }
  //           .status-approved { background:#dcfce7; color:#166534; }
  //           .status-pending  { background:#fef3c7; color:#92400e; }
  //           table { width:100%; border-collapse:collapse; margin-top:20px; }
  //           th, td { border:1px solid #d1d5db; padding:12px; text-align:right; }
  //           th { background:#f3f4f6; text-align:center; font-weight:600; }
  //           .left   { text-align:left; }
  //           .debit  { color:#dc2626; }
  //           .credit { color:#16a34a; font-weight:600; }
  //           .opening { background:#dbeafe; font-weight:600; }
  //           .closing { background:#dcfce7; font-weight:600; }
  //           .pending { background:#fef9c3; color:#92400e; }
  //           .info-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:20px; margin:20px 0; padding:20px; background:#f9fafb; border-radius:8px; }
  //           .info-item { display:flex; justify-content:space-between; }
  //           .info-label { color:#6b7280; font-weight:500; }
  //           .info-value { font-weight:600; color:#1f2937; }
  //           .ledger-note { background:#fffbeb; border:1px solid #fcd34d; border-radius:6px; padding:10px 14px; margin-bottom:16px; font-size:13px; color:#92400e; }
  //           .signature-section { margin-top:20px; page-break-inside:avoid; }
  //           .signature-title   { font-size:16px; font-weight:600; color:#1e40af; margin-bottom:20px; padding-bottom:10px; border-bottom:2px solid #e5e7eb; }
  //           .signature-grid    { display:grid; grid-template-columns:repeat(2,1fr); gap:30px; margin-bottom:40px; }
  //           .signature-box     { border:1px solid #d1d5db; border-radius:8px; padding:20px; background:#f9fafb; min-height:140px; }
  //           .signature-name    { font-weight:600; color:#1f2937; margin-bottom:5px; font-size:14px; }
  //           .signature-email   { font-size:12px; color:#6b7280; margin-bottom:15px; }
  //           .signature-line    { border-top:2px solid #000; margin-top:40px; padding-top:8px; text-align:center; font-size:11px; color:#6b7280; }
  //           .verified-badge    { display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600; margin-left:8px; }
  //           .verified-yes      { background:#dcfce7; color:#166534; }
  //           .verified-no       { background:#fee2e2; color:#991b1b; }
  //           .verified-date     { font-size:11px; color:#059669; margin-top:5px; font-style:italic; }
  //           @media print { @page { size:A4; margin:15mm; } body { margin:0; } }
  //         </style>
  //       </head>
  //       <body>
  //         <h1>Cash-In Ledger Statement</h1>
  //         <div class="header-info">
  //           Transaction ID: <strong>${cashIn.tran_id}</strong>
  //           <span class="status-badge ${is_approved ? "status-approved" : "status-pending"}">
  //             ${is_approved ? "APPROVED" : "PENDING"}
  //           </span>
  //           <br>Requested: ${dayjs(cashIn.created_at).format("DD MMM YYYY, hh:mm A")}
  //         </div>

  //         ${
  //           !is_approved
  //             ? `<div class="ledger-note">
  //                 ⚠️ This cash-in is <strong>pending approval</strong>. The vault balance has not changed yet.
  //                 The cash-in amount will be credited once all approvers have approved.
  //               </div>`
  //             : ""
  //         }

  //         <div class="info-grid">
  //           <div class="info-item"><span class="info-label">Vault ID:</span>       <span class="info-value">${vault.vault_id || "—"}</span></div>
  //           <div class="info-item"><span class="info-label">Bag Barcode:</span>    <span class="info-value">${cashIn.bags?.barcode || "—"}</span></div>
  //           <div class="info-item"><span class="info-label">Rack Number:</span>    <span class="info-value">RN${cashIn.bags?.rack_number || "—"}</span></div>
  //           <div class="info-item"><span class="info-label">Cash-In Amount:</span> <span class="info-value">${fmt(cashInAmount)}</span></div>
  //           <div class="info-item"><span class="info-label">Opening Balance:</span><span class="info-value">${fmt(openingBalance)}</span></div>
  //           <div class="info-item"><span class="info-label">Closing Balance:</span><span class="info-value">${fmt(closingBalance)}</span></div>
  //           <div class="info-item"><span class="info-label">Orders:</span>         <span class="info-value">${cashIn.orders?.length || 0}</span></div>
  //           <div class="info-item"><span class="info-label">Status:</span>         <span class="info-value">${is_approved ? "Approved" : "Pending"}</span></div>
  //         </div>

  //         <table>
  //           <thead>
  //             <tr>
  //               <th style="width:70px">SL</th>
  //               <th style="width:110px">Date</th>
  //               <th style="width:140px">Debit (৳)</th>
  //               <th style="width:140px">Credit (৳)</th>
  //               <th style="width:140px">Balance (৳)</th>
  //               <th class="left">Particulars</th>
  //             </tr>
  //           </thead>
  //           <tbody>${rowsHtml}</tbody>
  //         </table>

  //         ${ordersHtml}
  //         ${signatureBlock(verifiers, "Verifiers", "verified", "verified_at")}
  //         ${signatureBlock(approvers, "Approvers", "approved", "approved_at")}

  //         <div style="text-align:center;margin-top:40px;color:#9ca3af;font-size:12px">
  //           Generated on ${dayjs().format("DD MMM YYYY, hh:mm A")}
  //         </div>
  //         <script>window.onload = () => setTimeout(() => window.print(), 500);<\/script>
  //       </body>
  //       </html>
  //     `);
  //     printWindow.document.close();
  //   } catch (err) {
  //     console.error("Error generating ledger:", err);
  //     alert("Failed to generate ledger statement. Please try again.");
  //   }
  // };

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


    ${signatureBlock(verifiers, "Verification", "verified", "verified_at")}
    ${signatureBlock(approvers, "Approvals", "approved", "approved_at")}

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

  const ExpandableOrderIds = ({ orders, isExpanded, onToggle }) => {
    if (!orders || orders.length === 0) return <span className="text-gray-400">—</span>;

    const previewOrders = orders.slice(0, 2);
    const extraOrders = orders.slice(2);
    const hasMore = extraOrders.length > 0;

    return (
      <div className="flex flex-col w-full max-w-[200px]">
        <div className="flex flex-wrap gap-x-1 items-center">
          {previewOrders.map((order, i) => (
            <span key={order.id || i} className="whitespace-nowrap">
              {order?.order_id}
              {i === previewOrders.length - 1 && !hasMore ? "" : ","}
            </span>
          ))}
          {hasMore && !isExpanded && (
            <button
              type="button"
              onClick={onToggle}
              className="text-blue-500 bg-slate-200 py-1 cursor-pointer rounded-sm hover:text-blue-700 text-[11px] font-bold px-1 transition-all active:scale-95"
            >
              <HiDotsHorizontal className="text-slate-500" />
            </button>
          )}
        </div>

        <motion.div
          initial={false}
          animate={{
            height: isExpanded ? "auto" : 0,
            opacity: isExpanded ? 1 : 0,
          }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="overflow-hidden"
        >
          <div className="flex flex-wrap gap-x-1 pt-1">
            {extraOrders.map((order, i) => (
              <span key={order.id || i} className="whitespace-nowrap">
                {order?.order_id}
                {i === extraOrders.length - 1 ? "" : ","}
              </span>
            ))}
            <button
              type="button"
              onClick={onToggle}
              className="text-[10px] text-blue-400 underline hover:text-red-600 font-medium flex items-center gap-1 w-full mt-1 transition-colors"
            >
              less
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const columns = [
    {
      title: "Vault",
      key: "vault_code",
      className: "w-14",
      render: (row) => <span className="font-mono text-cyan-400">{row.vault?.vault_code}</span>,
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
      className: "w-[150px]",
      render: (row) => <ExpandableOrderIds orders={row?.orders} isExpanded={!!expandedRows[row.id]} onToggle={(e) => toggleRow(row.id, e)} />,
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
      title: "Verification",
      key: "required_verifiers",
      className: "w-20 text-center",
      render: (row) => (
        <div className="flex flex-col items-center gap-2">
          <VerifierAvatars requiredVerifiers={row.required_verifiers || []} />
          <span
            className={`capitalize text-xs px-2.5 py-1 rounded-full border ${
              row?.verifier_status === "pending" ? "bg-yellow-50 border-yellow-200 text-yellow-600" : "bg-green-50 border-green-200 text-green-500"
            }`}
          >
            {row?.verifier_status}
          </span>
        </div>
      ),
    },
    {
      title: "Approvals",
      key: "required_approvers",
      className: "w-20 text-center",
      render: (row) => (
        <div className="flex flex-col items-center gap-2">
          <VerifierAvatars requiredVerifiers={row.required_approvers || []} />
          <span
            className={`capitalize text-xs px-2.5 py-1 rounded-full border ${
              row?.approver_status === "pending" ? "bg-yellow-50 border-yellow-200 text-yellow-600" : "bg-green-50 border-green-200 text-green-500"
            }`}
          >
            {row?.approver_status}
          </span>
        </div>
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
                if (window.confirm("Delete?")) {
                }
              }}
              className={`p-2 rounded-lg ${isOneVerified ? "hidden" : ""} bg-red-500/10 cursor-pointer hover:bg-red-500/20 text-red-600 border border-red-400/20 transition-all`}
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-600 uppercase">Cash In List</h1>
          <p className="text-xs text-gray-400">Manage Your All Cash In</p>
        </div>
        <div className="flex items-center gap-4">
          <div onClick={() => setOpenCashInReqDrawer(true)} className="cursor-pointer transition-all px-4 py-2 hover:bg-black rounded text-white bg-[#424242]">
            Cash In Request
          </div>
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

      {/* {step === 4 && transactionId && (
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
      )} */}

      <CashDepositConfirmModal
        showConfirmModal={showConfirmModal}
        setShowConfirmModal={setShowConfirmModal}
        totalEnteredAmount={totalEnteredAmount}
        denominations={denominations}
        selectedRows={selectedRows}
        amounts={amounts}
        onConfirm={confirmAndComplete}
      />

      <CashInRequestDrawer isOpen={openCashInReqDrawer} onClose={() => setOpenCashInReqDrawer(false)} refetch={fetchCashInsData} />
    </div>
  );
};

export default CashIn;
