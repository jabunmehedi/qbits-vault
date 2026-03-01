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
import toast from "react-hot-toast";
import { GetCashInLedger } from "../../services/Ledger";

/*******  1a95057d-95d6-49d7-bca0-0934b457d050  *******/
const CashIn = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const step = parseInt(searchParams.get("step") || "0");
  const [isCashIn, setIsCashIn] = useState(step >= 1);
  const [cashIns, setCashIns] = useState([]);
  const [cashInsLoaded, setCashInsLoaded] = useState(false);

  const [selectedRows, setSelectedRows] = useState([]);
  const [orders, setOrders] = useState([]);
  const [paginationData, setPaginationData] = useState({});
  const currentPage = parseInt(searchParams.get("page") || "1");
  const searchTerm = searchParams.get("search") || "";
  const perPage = parseInt(searchParams.get("per_page") || "10");
  const [loading, setLoading] = useState(false);

  // Step 2: Amounts entered per order
  const [amounts, setAmounts] = useState({}); // { orderId: amount }
  const isLocked = useSelector(selectIsLockedForOperations);

  // Step 3: Denominations
  const [denominations, setDenominations] = useState({
    1000: 0,
    500: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
  });

  // Final transaction
  const [transactionId, setTransactionId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Load persisted data on mount
  useEffect(() => {
    const saved = localStorage.getItem("cashInWizard");
    if (saved) {
      const data = JSON.parse(saved);
      setSelectedRows(data.selectedRows || []);
      setAmounts(data.amounts || {});
      setDenominations(data.denominations || denominations);
    }
  }, []);

  // Save data on change
  useEffect(() => {
    if (step > 1) {
      localStorage.setItem(
        "cashInWizard",
        JSON.stringify({
          selectedRows,
          amounts,
          denominations,
        }),
      );
    }
  }, [selectedRows, amounts, denominations, step]);

  // Sync URL step
  useEffect(() => {
    setSearchParams({ step: step.toString() });
    setIsCashIn(step >= 1);
  }, [step]);

  useEffect(() => {
    if (step === 2) {
      const newAmounts = {};
      selectedRows.forEach((row) => {
        // Use total_cash_to_deposit as the vault amount (auto-filled)
        newAmounts[row.id] = row.total_cash_to_deposit || 0;
      });
      setAmounts(newAmounts);
    }
  }, [step, selectedRows]);

  const fetchCashInsData = () => {
    setLoading(true);
    GetCashIn()
      .then((res) => {
        setCashIns(res?.data?.data || []);
        setCashInsLoaded(true);
        setPaginationData(res?.data?.data || {});
      })
      .catch((error) => {
        console.error("Error fetching cash-ins:", error);
        setCashIns([]);
        setCashInsLoaded(true);
        setPaginationData({});
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const fetchOrders = useCallback(async () => {
    if (step !== 1 || !cashInsLoaded) return;

    setLoading(true);
    try {
      // Get all order_ids already in any cash-in
      const excludedOrderIds = cashIns
        .flatMap((cashIn) => cashIn.orders || [])
        .map((order) => order.order_id)
        .filter(Boolean);

      const res = await GetOrders({
        page: currentPage,
        search: searchTerm || undefined,
        per_page: perPage,
        exclude_order_ids: excludedOrderIds.length > 0 ? excludedOrderIds : undefined,
      });

      const orders = res?.data?.orders || [];
      const pagination = res?.data?.pagination || {};

      setOrders(orders);
      setPaginationData(pagination);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
      setPaginationData({});
    } finally {
      setLoading(false);
    }
  }, [step, cashInsLoaded, cashIns, currentPage, searchTerm, perPage]);

  useEffect(() => {
    fetchCashInsData();
  }, [step]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handlePageChange = (page) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set("page", page.toString());
      return newParams;
    });
  };

  const handleSearch = (term) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (term.trim()) {
        newParams.set("search", term.trim());
        newParams.set("page", "1"); // reset to page 1
      } else {
        newParams.delete("search");
      }
      return newParams;
    });
  };

  const totalEnteredAmount = selectedRows.reduce((sum, row) => {
    return sum + (parseFloat(amounts[row.id]) || 0);
  }, 0);

  const totalDenominationAmount = Object.entries(denominations).reduce((sum, [value, count]) => {
    return sum + parseInt(value) * parseInt(count || 0);
  }, 0);

  const generateTransactionId = () => {
    return `TXN-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9999)
      .toString()
      .padStart(4, "0")}`;
  };

  const handleNext = () => {
    if (step === 1 && selectedRows.length === 0) {
      alert("Please select at least one order");
      return;
    }
    if (step === 2) {
      const hasAmount = selectedRows.some((row) => parseFloat(amounts[row.id]) > 0);
      if (!hasAmount) {
        alert("Please enter amount for at least one order");
        return;
      }
    }
    setSearchParams({ step: step + 1 });
  };

  const handleBack = () => {
    if (step > 1) {
      setSearchParams({ step: step - 1 });
    } else if (step === 1) {
      setSearchParams({ step: step - 1 });
    } else {
      localStorage.removeItem("cashInWizard");
      setSelectedRows([]);
      setAmounts({});
      setDenominations({
        1000: 0,
        500: 0,
        100: 0,
        50: 0,
        20: 0,
        10: 0,
        5: 0,
        2: 0,
        1: 0,
      });
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

  const handlePrint = () => {
    window.print();
  };

  const downloadCashInLedger = async (cashIn) => {
    try {
      // Show loading state (if you have toast library)
      // const loadingToast = toast.loading?.('Generating ledger...');

      // Fetch ledger data from API
      const response = await GetCashInLedger(cashIn.id);

      if (!response.success) {
        throw new Error(response.message || "Failed to fetch ledger data");
      }

      const { data } = response;
      const { ledger_rows, opening_balance, closing_balance, vault, is_approved, verifiers, approvers } = data;

      // Dismiss loading toast
      // if (loadingToast) toast.dismiss?.(loadingToast);

      // Generate and open print window
      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
      <html>
        <head>
          <title>Ledger Statement - ${cashIn.tran_id}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 40px 20px; 
              color: #1f2937;
            }
            h1 { 
              text-align: center; 
              color: #1e40af; 
              margin-bottom: 10px;
            }
            .header-info {
              text-align: center; 
              color: #4b5563;
              margin-bottom: 30px;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 600;
              margin-left: 10px;
            }
            .status-approved {
              background-color: #dcfce7;
              color: #166534;
            }
            .status-pending {
              background-color: #fef3c7;
              color: #92400e;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px; 
            }
            th, td { 
              border: 1px solid #d1d5db; 
              padding: 12px; 
              text-align: right; 
            }
            th { 
              background: #f3f4f6; 
              text-align: center; 
              font-weight: 600;
            }
            .left { text-align: left; }
            
            /* Updated signature section */
            .signature-section { 
              margin-top: 20px;
              page-break-inside: avoid;
            }
            .signature-title {
              font-size: 16px;
              font-weight: 600;
              color: #1e40af;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 2px solid #e5e7eb;
            }
            .signature-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 30px;
              margin-bottom: 40px;
            }
            .signature-box { 
              border: 1px solid #d1d5db;
              border-radius: 8px;
              padding: 20px;
              background: #f9fafb;
              min-height: 140px;
            }
            .signature-name {
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 5px;
              font-size: 14px;
            }
            .signature-email {
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 15px;
            }
            .signature-line {
              border-top: 2px solid #000;
              margin-top: 40px;
              padding-top: 8px;
              text-align: center;
              font-size: 11px;
              color: #6b7280;
            }
            .verified-badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
              margin-left: 8px;
            }
            .verified-yes {
              background-color: #dcfce7;
              color: #166534;
            }
            .verified-no {
              background-color: #fee2e2;
              color: #991b1b;
            }
            .verified-date {
              font-size: 11px;
              color: #059669;
              margin-top: 5px;
              font-style: italic;
            }
            
            .opening { 
              background: #dbeafe; 
              font-weight: 600; 
            }
            .closing { 
              background: #dcfce7; 
              font-weight: 600; 
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              margin: 20px 0;
              padding: 20px;
              background: #f9fafb;
              border-radius: 8px;
            }
            .info-item {
              display: flex;
              justify-content: space-between;
            }
            .info-label {
              color: #6b7280;
              font-weight: 500;
            }
            .info-value {
              font-weight: 600;
              color: #1f2937;
            }
            @media print {
              body { margin: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Cash-In Ledger Statement</h1>
          
          <div class="header-info">
            Transaction ID: <strong>${cashIn.tran_id}</strong>
            <span class="status-badge ${is_approved ? "status-approved" : "status-pending"}">
              ${is_approved ? "APPROVED" : "PENDING"}
            </span>
            <br>
            Date: ${dayjs(cashIn.created_at).format("DD MMM YYYY, hh:mm A")}
          </div>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Vault ID:</span>
              <span class="info-value">${vault.vault_id || "—"}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Bag Barcode:</span>
              <span class="info-value">${cashIn.bags?.barcode || "—"}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Rack Number:</span>
              <span class="info-value">RN${cashIn.bags?.rack_number || "—"}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Cash-In Amount:</span>
              <span class="info-value">৳${parseFloat(cashIn.cash_in_amount).toFixed(2)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Current Vault Balance:</span>
              <span class="info-value">৳${parseFloat(vault.current_balance).toFixed(2)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Number of Orders:</span>
              <span class="info-value">${cashIn.orders?.length || 0}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 80px;">SL</th>
                <th style="width: 120px;">Date</th>
                <th style="width: 140px;">Debit (৳)</th>
                <th style="width: 140px;">Credit (৳)</th>
                <th style="width: 140px;">Balance (৳)</th>
                <th class="left">Particulars</th>
              </tr>
            </thead>
            <tbody>
              ${ledger_rows
                .map(
                  (row) => `
                <tr class="${row.sl === "Opening" ? "opening" : row.sl === "Closing" ? "closing" : ""}">
                  <td style="text-align: center;">${row.sl}</td>
                  <td style="text-align: center;">${row.date}</td>
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
            cashIn.orders && cashIn.orders.length > 0
              ? `
            <div style="margin-top: 30px;">
              <h3 style="color: #1e40af; margin-bottom: 15px;">Order Details</h3>
              <table style="margin-top: 10px;">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Amount (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  ${cashIn.orders
                    .map(
                      (order) => `
                    <tr>
                      <td class="left">${order.order_id || "—"}</td>
                      <td>৳${parseFloat(order.amount || 0).toFixed(2)}</td>
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

          <!-- Verifiers Section -->
          ${
            verifiers && verifiers.length > 0
              ? `
            <div class="signature-section">
              <div class="signature-title">Verifiers (${verifiers.length})</div>
              <div class="signature-grid">
                ${verifiers
                  .map(
                    (verifier) => `
                  <div class="signature-box">
                    <div class="signature-name">
                      ${verifier.name}
                      <span class="verified-badge ${verifier.verified ? "verified-yes" : "verified-no"}">
                        ${verifier.verified ? "✓ Verified" : "Pending"}
                      </span>
                    </div>
                    <div class="signature-email">${verifier.email}</div>
                    ${verifier.verified && verifier.verified_at ? `<div class="verified-date">Verified on: ${verifier.verified_at}</div>` : ""}
                    <div class="signature-line">
                      Signature & Date
                    </div>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            </div>
          `
              : ""
          }

          <!-- Approvers Section -->
          ${
            approvers && approvers.length > 0
              ? `
            <div class="signature-section">
              <div class="signature-title">Approvers (${approvers.length})</div>
              <div class="signature-grid">
                ${approvers
                  .map(
                    (approver) => `
                  <div class="signature-box">
                    <div class="signature-name">
                      ${approver.name}
                      <span class="verified-badge ${approver.approved ? "verified-yes" : "verified-no"}">
                        ${approver.approved ? "✓ Approved" : "Pending"}
                      </span>
                    </div>
                    <div class="signature-email">${approver.email}</div>
                    ${approver.approved && approver.approved_at ? `<div class="verified-date">Approved on: ${approver.approved_at}</div>` : ""}
                    <div class="signature-line">
                      Signature & Date
                    </div>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            </div>
          `
              : ""
          }

          <div style="text-align: center; margin-top: 40px; color: #9ca3af; font-size: 12px;">
            Generated on ${dayjs().format("DD MMM YYYY, hh:mm A")}
          </div>

          <script>
            window.onload = () => {
              setTimeout(() => window.print(), 500);
            };
          </script>
        </body>
      </html>
    `);

      printWindow.document.close();
    } catch (error) {
      console.error("Error generating ledger:", error);
      alert("Failed to generate ledger statement. Please try again.");
    }
  };

  const columnsStep0 = [
    {
      title: "Vault",
      key: "vault_id",
      className: "w-14",
      render: (row) => <span className="font-mono text-cyan-400">{row.vault?.vault_id}</span>,
    },
    {
      title: "Bag",
      key: "customer.name",
      className: "w-32",
      render: (row) => (
        <span className="">
          {row?.bags?.barcode}-RN{row?.bags?.rack_number}
        </span>
      ),
    },
    {
      title: "Tran Id",
      key: "tran_id",
      className: "w-32",
      render: (row) => <span className="">{row?.tran_id}</span>,
    },
    {
      title: "Order Ids",
      key: "orders.order_id",
      className: "w-[200px]",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {row?.orders?.map((order, index) => (
            <span key={index} className="text-sm">
              {order?.order_id},
            </span>
          ))}
        </div>
      ),
    },
    {
      title: "Amount",
      key: "cash_in_amount",
      className: "w-20",
      render: (row) => <span className="">{row?.cash_in_amount}</span>,
    },

    {
      title: "Req at",
      key: "created_at",
      className: "w-28",
      render: (row) => <span className="">{dayjs(row.created_at).format("DD MMM, YYYY")}</span>,
    },
    {
      title: "Verifiers",
      key: "required_verifiers",
      className: "w-24 ",
      render: (row) => {
        const requiredVerifiers = row.required_verifiers || [];

        return <VerifierAvatars requiredVerifiers={requiredVerifiers} />;
      },
    },
    {
      title: "Approvers",
      key: "required_verifiers",
      className: "w-24 ",
      render: (row) => {
        const requiredApprovers = row.required_approvers || [];

        return <VerifierAvatars requiredVerifiers={requiredApprovers} />;
      },
    },
    {
      title: "Verifiers",
      key: "created_at",
      className: "w-20",
      render: (row) => (
        <span
          className={`capitalize text-xs ${
            row?.verifier_status === "pending" ? "bg-yellow-50 border border-yellow-200 text-yellow-600" : "bg-green-50 border border-green-200 text-green-500"
          } px-2.5 py-1  rounded-full`}
        >
          {row?.verifier_status}
        </span>
      ),
    },
    {
      title: "Approvers",
      key: "status",
      className: "w-24",
      render: (row) => (
        <span
          className={`capitalize text-xs ${
            row?.status === "pending" ? "bg-yellow-50 border border-yellow-200 text-yellow-600" : "bg-green-50 border border-green-200 text-green-500"
          } px-2.5 py-1  rounded-full`}
        >
          {row?.status}
        </span>
      ),
    },
    {
      title: "Action",
      key: "actions",
      className: "w-24 ",
      render: (row) => {
        const isOneVerified = row?.required_verifiers?.some((verifier) => verifier?.verified);

        const handleEdit = (e) => {
          e.stopPropagation();
          // Your edit logic her
          // e.g., open edit modal with row data
          // setEditData(row);
          // setIsEditModalOpen(true);
        };

        const handleDelete = (e) => {
          e.stopPropagation();
          // Your delete logic here
          // e.g., show confirm dialog then call API
          if (window.confirm(`Delete vault "${row.name}"?`)) {
            // DeleteVault(row.id).then(() => fetchVaultData());
          }
        };

        const downloadLedger = (e) => {
          e.stopPropagation();
          // We'll implement the real download logic below
          downloadCashInLedger(row);
        };

        return (
          <div className="flex items-center  gap-3 py-2">
            {/* Edit Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleEdit}
              className={`p-2 rounded-lg ${isOneVerified ? "hidden" : ""} bg-blue-500/10 cursor-pointer hover:bg-blue-500/20 text-blue-600 border border-blue-400/20 transition-all`}
              aria-label="Edit vault"
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

            {/* Delete Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDelete}
              className={`p-2 rounded-lg ${isOneVerified ? "hidden" : ""} bg-red-500/10 cursor-pointer hover:bg-red-500/20 text-red-600 border border-red-400/20 transition-all`}
              aria-label="Delete vault"
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
                onClick={downloadLedger}
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

              {/* Tooltip */}
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
    {
      title: "Order ID",
      key: "order_id",
      className: "w-32",
      render: (row) => <span className="font-mono text-cyan-400">{row.order_id}</span>,
    },
    {
      title: "Customer",
      key: "customer.name",
      className: "w-40",
      render: (row) => <span className="">{row?.customer?.name}</span>,
    },
    {
      title: "Total",
      key: "payable_amount",
      className: "w-40",
      render: (row) => <span className="">{row?.payable_amount}</span>,
    },
    {
      title: "Paid",
      key: "paid_amount",
      className: "w-40",
      render: (row) => <span className="">{row?.paid_amount}</span>,
    },
    {
      title: "Online Pay",
      key: "paid_amount",
      className: "w-40",
      render: (row) => <span className="">{row?.paid_amount - row?.total_cash_to_deposit}</span>,
    },
    {
      title: "Received ST",
      key: "paid_amount",
      className: "w-40",
      render: (row) => <span className="">{row?.total_cash_to_deposit}</span>,
    },

    {
      title: "Received Date",
      key: "created_at",
      className: "w-40",
      render: (row) => <span className="">{dayjs(row.created_at).format("DD MMM, YYYY")}</span>,
    },
    {
      title: "Select",
      key: "selection",
      className: "w-40 ",
      render: (row) => {
        const isSelected = selectedRows.some((selected) => selected.id === row.id);

        const toggleSelection = (e) => {
          e.stopPropagation();
          setSelectedRows((prev) => {
            const exists = prev.some((item) => item.id === row.id);
            if (exists) {
              return prev.filter((item) => item.id !== row.id);
            } else {
              return [...prev, row];
            }
          });
        };

        return (
          <div className="flex items-center justify-center ">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={toggleSelection}
              className={`
                relative w-7 h-7 rounded-full flex items-center justify-center border  overflow-hidden
                transition-all duration-300 ease-out
                ${isSelected ? "bg-cyan-50 border-cyan-500" : "bg-transparent border border-gray-200 hover:border-sky-500 hover:shadow-md"}
              `}
              aria-label={isSelected ? "Deselect row" : "Select row"}
            >
              <motion.div
                className="absolute inset-0 bg-cyan-500/20"
                initial={false}
                animate={{ scale: isSelected ? 1 : 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              />
              <motion.svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 relative z-10 pointer-events-none" initial={false}>
                <motion.path
                  d="M4 12L9 17L20 6"
                  stroke="blue"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{
                    pathLength: isSelected ? 1 : 0,
                    opacity: isSelected ? 1 : 0,
                  }}
                  transition={{
                    duration: 0.35,
                    ease: "easeOut",
                    opacity: { duration: 0.15 },
                    pathLength: { delay: isSelected ? 0.1 : 0 },
                  }}
                />
              </motion.svg>
              <motion.div
                className="absolute inset-0 rounded-xl"
                whileTap={{
                  background: "radial-gradient(circle, rgba(255,255,255,0.3) 10%, transparent 70%)",
                }}
              />
            </motion.button>
          </div>
        );
      },
    },
  ];

  const columnsStep2 = [
    {
      title: "Order ID",
      key: "order_id",
      className: "w-32",
      render: (row) => <span className="font-mono text-cyan-400">{row.order_id}</span>,
    },
    {
      title: "Cash To Deposit",
      key: "payable_amount",
      className: "w-40",
      render: (row) => <span className="">{row?.total_cash_to_deposit}</span>,
    },
    {
      title: "Cash To Vault",
      key: "amount",
      className: "w-40",
      render: (row) => (
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          className=" px-4 py-2 bg-transparent rounded-lg text-gray-600 focus:outline-none "
          value={amounts[row.id] ?? row.total_cash_to_deposit ?? 0}
          // onChange={(e) => setAmounts({ ...amounts, [row.id]: e.target.value })}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center  justify-between p-2">
        <h1 className="text-lg font-semibold text-gray-600">
          {step === 0 && "Cash In List"}
          {step === 1 && "Orders List"}
          {step === 2 && "Enter Deposit Amounts"}
          {step === 3 && "Enter Denominations"}
          {step === 4 && "Transaction Complete"}
        </h1>
        <div className="flex items-center gap-4">
          {step === 1 && (
            <div
              onClick={handleBack}
              className="cursor-pointer transition-all duration-300 ease-in-out px-4 py-1 hover:bg-gray-50 backdrop-blur-xl rounded-lg overflow-hidden hover:text-black bg-transparent text-zinc-500 border border-zinc-100"
            >
              <p>Back</p>
            </div>
          )}

          {step === 0 && (
            <div
              onClick={handleNext}
              className={`cursor-pointer ${isLocked ? "hidden" : "flex"} transition-all duration-300 ease-in-out px-4 py-1 hover:bg-cyan-100 backdrop-blur-xl rounded-lg overflow-hidden hover:text-cyan-600 bg-cyan-50 text-cyan-500 border border-cyan-300`}
            >
              <p>Cash In</p>
            </div>
          )}
          {step > 1 && (
            <div
              onClick={handleBack}
              className="cursor-pointer transition-all duration-300 ease-in-out px-4 py-1 hover:bg-gray-100 backdrop-blur-xl rounded-lg overflow-hidden  bg-transparent text-zinc-300 border hover:text-zinc-500 border-zinc-200"
            >
              <p>Back</p>
            </div>
          )}

          {step === 1 && selectedRows.length > 0 && (
            <div
              onClick={handleNext}
              className="cursor-pointer transition-all duration-300 ease-in-out px-4 py-1 hover:bg-white/10 backdrop-blur-xl rounded-lg overflow-hidden hover:text-cyan-600 bg-cyan-50 text-cyan-300 border border-cyan-300"
            >
              <p>Next</p>
            </div>
          )}

          {step === 2 && (
            <div
              onClick={handleNext}
              className="cursor-pointer transition-all duration-300 ease-in-out px-4 py-1 hover:bg-white/10 backdrop-blur-xl rounded-lg overflow-hidden hover:text-gray-600 bg-cyan-500 text-white border border-cyan-500/50"
            >
              <p>Next</p>
            </div>
          )}

          {step === 3 && totalDenominationAmount === totalEnteredAmount && (
            <div
              onClick={handleFinish}
              className="cursor-pointer transition-all duration-300 ease-in-out px-4 py-1 hover:bg-cyan-500 backdrop-blur-xl rounded-lg overflow-hidden text-cyan-300 bg-cyan-50 border border-cyan-500/50 font-semibold"
            >
              <p>Finish</p>
            </div>
          )}
        </div>
      </div>

      {/* Step 0: All Cash In*/}
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
          <div className="mb-4 text-cyan-400 font-medium">
            Total Selected: {selectedRows.length} orders | Total Amount: ৳{totalEnteredAmount.toFixed(2)}
          </div>
          <DataTable columns={columnsStep2} data={selectedRows} paginationData={{}} className="h-[calc(100vh-150px)]" />
        </div>
      )}

      {/* Step 3: Denominations */}
      {step === 3 && (
        <div className="bg-white p-4">
          <div className="max-w-4xl  mx-auto">
            <div className="grid grid-cols-3 gap-6 mb-8">
              {[1000, 500, 100, 50, 20, 10].map((note) => (
                <div key={note} className="bg-cyan-50/20 border border-cyan-100 backdrop-blur-xl rounded-lg p-6 text-center">
                  <div className="text-2xl font-bold text-gray-600 mb-3">৳{note}</div>

                  {/* Clean number input – no spinner, no default 0 */}
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full text-gray-600 px-4 py-3 text-xl text-center bg-transparent border border-cyan-500/40 rounded-lg focus:border-cyan-400 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={denominations[note] > 0 ? denominations[note] : ""}
                    placeholder="0"
                    onChange={(e) => {
                      const val = e.target.value;
                      const num = val === "" ? 0 : parseInt(val) || 0;
                      setDenominations({ ...denominations, [note]: num });
                    }}
                    onFocus={(e) => e.target.select()}
                  />

                  <div className="mt-2 text-zinc-400">= ৳{(note * (denominations[note] || 0)).toLocaleString()}</div>
                </div>
              ))}
            </div>

            <div className="text-center text-lg">
              <span className="text-zinc-400">Total Denomination: </span>
              <span className={totalDenominationAmount === totalEnteredAmount ? "text-cyan-600 font-medium" : "text-red-400"}>
                ৳{totalDenominationAmount.toFixed(2)}
              </span>
              {totalDenominationAmount !== totalEnteredAmount && <p className="text-red-400 text-sm mt-2">Must match ৳{totalEnteredAmount.toFixed(2)}</p>}
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

            {/* Code 128 Barcode */}
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
                .filter(([_, count]) => count > 0)
                .map(([note, count]) => (
                  <p key={note} className="text-sm">
                    {note} TK × {count} = ৳{(note * count).toLocaleString()}
                  </p>
                ))}
            </div>

            <button onClick={handlePrint} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-semibold text-lg transition">
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
      />
    </div>
  );
};

export default CashIn;
