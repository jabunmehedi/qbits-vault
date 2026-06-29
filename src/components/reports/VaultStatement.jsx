import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowDownCircle, ArrowUpCircle, FileText, Landmark, Loader2, Receipt, RefreshCw, Scale, Search, SlidersHorizontal, TrendingDown, TrendingUp, Wallet, X } from "lucide-react";
import DateRangePicker from "../global/dateRangePicker/DateRangePicker";
import { GetVaultStatement } from "../../services/Reports";
import DataTable from "../global/dataTable/DataTable";
import ReconcileReportDrawer from "./ReconcileReportDrawer";
import Can from "../global/can/Can";

const RECONCILE_TYPES = ["reconcile_variance", "reconcile_settlement"];

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

const vaultBalance = (vault) => (vault?.bags || []).reduce((s, b) => s + parseFloat(b.current_amount || 0), 0);

const getStatementPayload = (page) => {
  if (Array.isArray(page?.data)) return page;
  return page?.data || page || {};
};

const getStatementRows = (page) => {
  const payload = getStatementPayload(page);
  if (Array.isArray(payload)) return payload;
  return payload?.transactions || payload?.data || [];
};

const getStatementNextCursor = (page) => {
  const payload = getStatementPayload(page);
  if (payload?.has_more === false || payload?.pagination?.has_more === false) return undefined;
  return payload?.next_cursor ?? payload?.pagination?.next_cursor ?? undefined;
};

const VaultStatement = ({ vault, fromDate, toDate, preset, txnType, minCredit, maxCredit, minDebit, maxDebit, minBalance, maxBalance, advancedFilterCount = 0, onDateRangeChange, onOpenFilters, hasActiveFilters, onClearFilters }) => {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["vaultStatement", vault.id, fromDate, toDate, txnType, minCredit, maxCredit, minDebit, maxDebit, minBalance, maxBalance, search],
    queryFn: async ({ pageParam }) => {
      const res = await GetVaultStatement(vault.id, {
        from_date:   fromDate   || undefined,
        to_date:     toDate     || undefined,
        txn_type:    txnType    || undefined,
        min_credit:  minCredit  || undefined,
        max_credit:  maxCredit  || undefined,
        min_debit:   minDebit   || undefined,
        max_debit:   maxDebit   || undefined,
        min_balance: minBalance || undefined,
        max_balance: maxBalance || undefined,
        tran_id:     search     || undefined,
        cursor: pageParam,
        per_page: 20,
      });
      return getStatementPayload(res);
    },
    enabled: !!vault?.id,
    initialPageParam: null,
    getNextPageParam: getStatementNextCursor,
  });

  // Summary (opening/closing/totals) is computed once and returned on the first page only.
  const summary = getStatementPayload(data?.pages?.[0])?.summary || {};
  const rows = data?.pages?.flatMap(getStatementRows) || [];

  // const opening = summary.opening_balance ?? 0; // Opening Balance card hidden for now
  const totalCredit = summary.total_credit ?? 0;
  const totalDebit = summary.total_debit ?? 0;
  const closing = summary.closing_balance ?? vaultBalance(vault);

  const navigate = useNavigate();
  const [reportId, setReportId] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);

  const openReport = (id) => {
    if (!id) return;
    setReportId(id);
    setReportOpen(true);
  };

  // Settle is performed on the reconciliation screen — route there with the reconcile
  // drawer auto-opened rather than settling inline from the statement.
  const goSettle = (row) => {
    if (!row?.reconciliation_id) return;
    navigate(`/reconcile?vault=${vault.id}&open=${row.reconciliation_id}&tran=${encodeURIComponent(row.tran_id || "")}`);
  };

  // Reconcile rows (variance / settlement) get a coloured background so the audit
  // events stand out from ordinary cash movements.
  const rowClassName = (row) => {
    if (row.transaction_type === "reconcile_variance") return "bg-amber-50/60 hover:bg-amber-50";
    if (row.transaction_type === "reconcile_settlement") return "bg-emerald-50/70 hover:bg-emerald-50";
    return "";
  };

  const columns = [
    {
      title: "Date & Time",
      key: "completed_at",
      className: "w-36 text-start",
      render: (row) => <span className="whitespace-nowrap">{row.completed_at || "—"}</span>,
    },
    {
      title: "Reference",
      key: "tran_id",
      className: "w-40 text-start",
      render: (row) => <span className="block truncate font-mono text-[#1a73e8] font-semibold">{row.tran_id}</span>,
    },
    {
      title: "Description",
      key: "transaction_type",
      className: "w-56 text-start",
      noClip: true,
      render: (row) => {
        if (RECONCILE_TYPES.includes(row.transaction_type)) {
          const isVariance = row.transaction_type === "reconcile_variance";
          const shortage = Number(row.debit || 0) > 0;
          const label = isVariance ? `Reconciliation · ${shortage ? "shortage" : "surplus"}` : "Variance settlement";
          const Icon = isVariance ? Scale : Receipt;
          const tone = isVariance ? "text-amber-700" : "text-emerald-700";
          return (
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 font-bold ${tone}`}>
                <Icon size={13} /> {label}
              </span>
              <button
                type="button"
                onClick={() => openReport(row.reconciliation_id)}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1a73e8] border border-slate-200 bg-white rounded-md px-2 py-0.5 hover:border-[#1a73e8] transition cursor-pointer"
              >
                <FileText size={11} /> View report
              </button>
              {isVariance && !row.settled && !row.settle_locked && (
                <Can perform="reconciliation.settle">
                  <button
                    type="button"
                    onClick={() => goSettle(row)}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 border border-amber-200 bg-amber-50 rounded-md px-2 py-0.5 hover:border-amber-500 transition cursor-pointer"
                  >
                    <Wallet size={11} /> Settle
                  </button>
                </Can>
              )}
            </div>
          );
        }
        return Number(row.credit || 0) > 0 ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
            <ArrowDownCircle size={13} /> Cash In
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
            <ArrowUpCircle size={13} /> Cash Out
          </span>
        );
      },
    },
    {
      title: "Debit",
      key: "debit",
      className: "w-32 text-end font-bold",
      noClip: true,
      render: (row) => <span className="text-rose-500 whitespace-nowrap">{Number(row.debit || 0) > 0 ? `৳${fmt(row.debit)}` : "—"}</span>,
    },
    {
      title: "Credit",
      key: "credit",
      className: "w-32 text-end font-bold",
      noClip: true,
      render: (row) => <span className="text-emerald-600 whitespace-nowrap">{Number(row.credit || 0) > 0 ? `৳${fmt(row.credit)}` : "—"}</span>,
    },
    {
      title: "Balance",
      key: "balance",
      className: "w-36 text-end font-bold text-slate-900",
      noClip: true,
      render: (row) => <span className="whitespace-nowrap">৳{fmt(row.balance)}</span>,
    },
  ];

  return (
    <>
    <div className="flex-1 min-h-0 flex flex-col rounded-2xl overflow-hidden">
      {/* Account header */}
      <div className="bg-slate-50/60 border-x border-t border-slate-200 rounded-t-2xl px-6 py-4 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#1a73e8] flex items-center justify-center">
              <Landmark size={20} />
            </div>
            <div>
              <span className="inline-block font-mono text-[10px] font-bold text-[#1a73e8] bg-blue-50 px-1.5 py-0.5 rounded">
                #{vault.vault_code || vault.id}
              </span>
              <h3 className="text-base font-black text-[#1a2b4b] mt-0.5">{vault.name}</h3>
            </div>
          </div>

          {/* Statement totals inline with vault name */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 flex items-center gap-3 min-w-[180px]">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                <TrendingUp size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Credit</p>
                <p className="text-base font-black text-emerald-600 mt-0.5 truncate">৳{fmt(totalCredit)}</p>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 flex items-center gap-3 min-w-[180px]">
              <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                <TrendingDown size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Debit</p>
                <p className="text-base font-black text-rose-600 mt-0.5 truncate">৳{fmt(totalDebit)}</p>
              </div>
            </div>
            <div className="bg-[#1a73e8] rounded-xl px-5 py-3 flex items-center gap-3 shadow-lg shadow-blue-200 min-w-[200px]">
              <div className="w-9 h-9 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0">
                <Landmark size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Closing Balance</p>
                <p className="text-base font-black text-white mt-0.5 truncate">৳{fmt(closing)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter row: search + date range + filters + clear */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by transaction reference..."
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm uppercase text-gray-700 placeholder:text-gray-400 placeholder:normal-case focus:outline-none focus:border-indigo-400 bg-white"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(""); setSearch(""); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <DateRangePicker
            value={{ from_date: fromDate, to_date: toDate }}
            preset={preset}
            onChange={onDateRangeChange}
          />

          <button
            type="button"
            onClick={onOpenFilters}
            className={`relative flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              advancedFilterCount > 0
                ? "border-[#1a73e8] text-[#1a73e8] bg-blue-50"
                : "border-gray-200 text-gray-600 hover:border-[#1a73e8] hover:text-[#1a73e8]"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {advancedFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#1a73e8] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {advancedFilterCount}
              </span>
            )}
          </button>

          {(hasActiveFilters || searchInput) && (
            <button
              type="button"
              onClick={() => { setSearchInput(""); setSearch(""); onClearFilters?.(); }}
              className="flex items-center gap-1 px-3 py-2 bg-red-50 border border-red-200 text-red-500 text-sm rounded-lg hover:bg-red-100 transition cursor-pointer"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 min-h-0 py-20 flex items-center justify-center gap-2 text-slate-400 text-sm bg-white border-x border-b border-slate-200 rounded-b-2xl">
          <Loader2 className="animate-spin" size={16} />
          Building account statement...
        </div>
      ) : isError ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 text-center text-sm text-slate-400 bg-white border-x border-b border-slate-200 rounded-b-2xl">
          <p className="font-semibold text-slate-500">Could not load this statement.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-[#1a73e8] transition hover:border-[#1a73e8]"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          hideFooter
          rowClassName={rowClassName}
          onScrollEnd={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          className={`flex-1 min-h-0 !rounded-t-none !border-t-0 ${isFetchingNextPage || hasNextPage ? "!rounded-b-none" : ""}`}
        />
      )}

      {/* Infinite-scroll loader */}
      {!isLoading && (isFetchingNextPage || hasNextPage) && (
        <div className="border-x border-t border-b border-slate-200 rounded-b-2xl bg-white px-6 py-2.5 text-center text-[11px] font-semibold text-slate-400 shrink-0">
          {isFetchingNextPage ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="animate-spin" size={12} /> Loading older transactions...
            </span>
          ) : (
            "Scroll to load more"
          )}
        </div>
      )}
    </div>

    <ReconcileReportDrawer reconciliationId={reportId} isOpen={reportOpen} onClose={() => setReportOpen(false)} onSettled={() => refetch()} />
    </>
  );
};

export default VaultStatement;
