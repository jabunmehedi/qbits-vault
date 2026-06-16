import { ChevronRight, Landmark, Layers, Wallet } from "lucide-react";

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

const vaultBalance = (vault) => (vault?.bags || []).reduce((s, b) => s + parseFloat(b.current_amount || 0), 0);

const VaultStatementList = ({ vaults = [], onSelect }) => {
  const totalBalance = vaults.reduce((s, v) => s + vaultBalance(v), 0);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
      {/* Aggregate summary strip */}
      <div className="bg-slate-50/60 border-b border-slate-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="bg-[#1a73e8] text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide">Accounts</span>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Vault Accounts Overview</h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-sm">
            <Layers size={15} className="text-[#1a73e8]" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Vaults</span>
            <span className="text-sm font-black text-[#1a2b4b]">{vaults.length}</span>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-sm">
            <Wallet size={15} className="text-emerald-500" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Balance</span>
            <span className="text-sm font-black text-[#1a2b4b]">৳{fmt(totalBalance)}</span>
          </div>
        </div>
      </div>

      {/* Vault account cards */}
      <div className="p-6">
        {vaults.length === 0 ? (
          <div className="py-20 flex items-center justify-center">
            <span className="text-sm font-semibold text-slate-400">No vault accounts available.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {vaults.map((vault) => {
              const balance = vaultBalance(vault);
              const bagCount = vault?.bags?.length || 0;
              return (
                <button
                  key={vault.id}
                  onClick={() => onSelect(vault)}
                  className="group text-left cursor-pointer bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#1a73e8] hover:shadow-lg hover:shadow-blue-50 transition-all duration-200"
                >
                  {/* Header: icon + identity + bag count */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 shrink-0 rounded-xl bg-blue-50 text-[#1a73e8] flex items-center justify-center group-hover:bg-[#1a73e8] group-hover:text-white transition-colors">
                        <Landmark size={20} />
                      </div>
                      <div className="min-w-0">
                        <span className="inline-block font-mono text-[10px] font-bold text-[#1a73e8] bg-blue-50 px-1.5 py-0.5 rounded">
                          #{vault.vault_code || vault.id}
                        </span>
                        <h4 className="text-base font-black text-[#1a2b4b] mt-1 truncate">{vault.name}</h4>
                      </div>
                    </div>
                    <span className="shrink-0 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[11px] font-bold px-2.5 py-1 rounded-full">
                      {bagCount} Bag{bagCount !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 font-semibold mt-2.5 ml-0.5 truncate">{vault.address || "—"}</p>

                  {/* Balance + CTA */}
                  <div className="mt-4 pt-4 border-t border-dashed border-slate-200 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available Balance</p>
                      <p className={`text-2xl font-black mt-0.5 ${balance > 0 ? "text-[#1a2b4b]" : "text-slate-300"}`}>৳{fmt(balance)}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-300 group-hover:text-[#1a73e8] transition-colors">
                      Statement
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VaultStatementList;
