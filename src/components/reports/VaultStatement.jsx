import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, Landmark, Loader2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { GetVaultStatement } from "../../services/Reports";
import DataTable from "../global/dataTable/DataTable";
import AppButton from "../global/AppButton";

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

const vaultBalance = (vault) => (vault?.bags || []).reduce((s, b) => s + parseFloat(b.current_amount || 0), 0);

const VaultStatement = ({ vault, timeline, onBack }) => {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["vaultStatement", vault.id, timeline],
    queryFn: async ({ pageParam }) => {
      const res = await GetVaultStatement(vault.id, { timeline, cursor: pageParam, per_page: 20 });
      return res?.data;
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage?.next_cursor ?? undefined,
  });

  // Summary (opening/closing/totals) is computed once and returned on the first page only.
  const summary = data?.pages?.[0]?.summary || {};
  const rows = data?.pages?.flatMap((p) => p?.transactions || []) || [];

  const opening = summary.opening_balance ?? 0;
  const totalCredit = summary.total_credit ?? 0;
  const totalDebit = summary.total_debit ?? 0;
  const closing = summary.closing_balance ?? vaultBalance(vault);

  const columns = [
    {
      title: "Date & Time",
      key: "completed_at",
      className: "w-36 text-start font-normal text-slate-400",
      render: (row) => <span>{row.completed_at || "—"}</span>,
    },
    {
      title: "Reference",
      key: "tran_id",
      className: "w-44 text-start",
      render: (row) => <span className="block truncate font-mono text-[#1a73e8] font-semibold">{row.tran_id}</span>,
    },
    {
      title: "Description",
      key: "transaction_type",
      className: "w-32 text-start",
      render: (row) =>
        Number(row.credit || 0) > 0 ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
            <ArrowDownCircle size={13} /> Cash In
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
            <ArrowUpCircle size={13} /> Cash Out
          </span>
        ),
    },
    {
      title: "Debit",
      key: "debit",
      className: "w-28 text-end font-bold",
      render: (row) => <span className="text-rose-500">{Number(row.debit || 0) > 0 ? `৳${fmt(row.debit)}` : "—"}</span>,
    },
    {
      title: "Credit",
      key: "credit",
      className: "w-28 text-end font-bold",
      render: (row) => <span className="text-emerald-600">{Number(row.credit || 0) > 0 ? `৳${fmt(row.credit)}` : "—"}</span>,
    },
    {
      title: "Balance",
      key: "balance",
      className: "w-32 text-end font-bold text-slate-900",
      render: (row) => <span>৳{fmt(row.balance)}</span>,
    },
  ];

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
      {/* Account header */}
      <div className="bg-slate-50/60 border-b border-slate-100 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AppButton variant="primary" onClick={onBack} className="px-4 py-2 text-xs">
              <ArrowLeft size={15} /> Back
            </AppButton>
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
          </div>

          <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
            <Wallet size={16} className="text-[#1a73e8]" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Balance</p>
              <p className="text-lg font-black text-[#1a2b4b] leading-tight">৳{fmt(closing)}</p>
            </div>
          </div>
        </div>

        {/* Statement totals */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
              <Wallet size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opening Balance</p>
              <p className="text-sm font-black text-slate-700 mt-0.5 truncate">৳{fmt(opening)}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
              <TrendingUp size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Credit</p>
              <p className="text-sm font-black text-emerald-600 mt-0.5 truncate">৳{fmt(totalCredit)}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <TrendingDown size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Debit</p>
              <p className="text-sm font-black text-rose-600 mt-0.5 truncate">৳{fmt(totalDebit)}</p>
            </div>
          </div>
          <div className="bg-[#1a73e8] rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg shadow-blue-200">
            <div className="w-9 h-9 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0">
              <Landmark size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Closing Balance</p>
              <p className="text-sm font-black text-white mt-0.5 truncate">৳{fmt(closing)}</p>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex items-center justify-center gap-2 text-slate-400 text-sm">
          <Loader2 className="animate-spin" size={16} />
          Building account statement...
        </div>
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          hideFooter
          onScrollEnd={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          className="h-[calc(100vh-320px)]"
        />
      )}

      {/* Infinite-scroll loader / end marker */}
      {!isLoading && (
        <div className="border-t border-slate-100 px-6 py-2.5 text-center text-[11px] font-semibold text-slate-400">
          {isFetchingNextPage ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="animate-spin" size={12} /> Loading older transactions...
            </span>
          ) : hasNextPage ? (
            "Scroll to load more"
          ) : (
            "End of statement"
          )}
        </div>
      )}
    </div>
  );
};

export default VaultStatement;
