import { ChevronRight, Layers, Wallet } from "lucide-react";

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

const vaultBalance = (vault) => (vault?.bags || []).reduce((s, b) => s + parseFloat(b.current_amount || 0), 0);

const VaultStatementList = ({ vaults = [], onSelect }) => {
  const totalBalance = vaults.reduce((s, v) => s + vaultBalance(v), 0);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
      {/* Aggregate summary strip */}
      <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="bg-[#1a2b4b] text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase">Accounts</span>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Vault Accounts Overview</h3>
        </div>

        <div className="flex items-center gap-6 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-slate-400" />
            <span className="text-slate-500">Total Vaults:</span>
            <span className="text-slate-900 font-bold">{vaults.length}</span>
          </div>
          <div className="border-l border-slate-200 h-4" />
          <div className="flex items-center gap-2">
            <Wallet size={14} className="text-slate-400" />
            <span className="text-slate-500">Total Balance:</span>
            <span className="text-[#1a2b4b] font-bold">৳{fmt(totalBalance)}</span>
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
                  className="group text-left cursor-pointer bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#1a2b4b] hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-[#1a73e8] tracking-wider uppercase">{vault.vault_code || `ID: ${vault.id}`}</p>
                      <h4 className="text-base font-black text-[#1a2b4b] mt-0.5">{vault.name}</h4>
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{vault.address || "—"}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#1a2b4b] transition-colors" />
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available Balance</p>
                      <p className="text-xl font-black text-[#1a2b4b] mt-0.5">৳{fmt(balance)}</p>
                    </div>
                    <span className="bg-green-50 border border-green-200 text-green-600 text-[11px] font-bold px-2.5 py-1 rounded-full">
                      {bagCount} Bag{bagCount !== 1 ? "s" : ""}
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
