import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ArrowDownLeft, ArrowUpRight, CheckSquare, Settings, Package, Save } from "lucide-react";
import { GetVaults, UpdateVault } from "../../services/Vault";

const SystemPreferences = () => {
  const [activeTab, setActiveTab] = useState("cash_in");
  const [vaults, setVaults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(null);

  // Tab Navigation Definitions Map
  const navigationTabs = [
    // { id: "vault", name: "Vault Rules", icon: Shield }, // moved to Vault page → Vault Config tab
    { id: "cash_in", name: "Cash In Settings", icon: ArrowDownLeft },
    { id: "cash_out", name: "Cash Out Limits", icon: ArrowUpRight },
    { id: "reconcile", name: "Reconciliation", icon: CheckSquare },
    { id: "settings", name: "System Config", icon: Settings },
  ];

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    GetVaults()
      .then((res) => {
        if (isMounted) {
          const formattedVaults = (res?.data?.data || []).map((vlt) => ({
            ...vlt,
            bag_min_bal_limit: vlt.bag_min_bal_limit ?? "",
            bag_balance_limit: vlt.bag_balance_limit ?? "",
          }));
          setVaults(formattedVaults);
        }
      })
      .catch((error) => {
        console.error("Failed fetching active vaults context configuration arrays:", error);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleThresholdChange = (id, field, value) => {
    setVaults((prev) => prev.map((vlt) => (vlt.id === id ? { ...vlt, [field]: value } : vlt)));
  };

  const handleSaveThreshold = async (vaultRow) => {
    setIsSaving(vaultRow.id);

    try {
      await UpdateVault(vaultRow.id, {
        bag_min_bal_limit: vaultRow.bag_min_bal_limit === "" ? null : parseFloat(vaultRow.bag_min_bal_limit),
        bag_balance_limit: vaultRow.bag_balance_limit === "" ? null : parseFloat(vaultRow.bag_balance_limit),
      });

      await new Promise((resolve) => setTimeout(resolve, 600));
    } catch (error) {
      console.error("Failed saving capacity updates matrix constraints context structures:", error);
    } finally {
      setIsSaving(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-10 bg-[#1a2b4b] rounded-full" />
        <div>
          <h1 className="xl:text-2xl font-black text-[#1a2b4b] uppercase">System Preferences</h1>
          <p className="text-[8px] xl:text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">System Configuration</p>
        </div>
      </div>

      {/* Dynamic Navigation Sub-tab Header Pills Row */}
      <div className="flex items-center gap-1.5 border-b border-slate-200/60 pb-px overflow-x-auto scrollbar-none">
        {navigationTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap outline-none ${
                isActive ? "text-blue-600 font-bold" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === "vault" && (
            <motion.div
              key="vault_pane"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Vault Capacity Threshold Rules</h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Define min/max bag validation scopes per active node storage block context.</p>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="w-8 h-8 rounded-full border-2 border-slate-100 border-t-[#1a73e8] animate-spin" />
                </div>
              ) : vaults.length === 0 ? (
                <div className="text-center py-20 bg-white">
                  <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400 font-bold">No registered vaults available to manage.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/20 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <th className="px-6 py-3.5 font-bold">Vault Info</th>
                        <th className="px-6 py-3.5 font-bold">Min Amount Threshold (৳)</th>
                        <th className="px-6 py-3.5 font-bold">Max Amount Threshold (৳)</th>
                        <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                      {vaults?.map((vault) => (
                        <tr key={vault.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-400">
                                <Package className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{vault.name}</p>
                                <p className="text-[10px] text-slate-400 tracking-wide mt-0.5 uppercase">{`Code: ${vault.code}`}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-full max-w-[200px] relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">৳</span>
                              <input
                                type="number"
                                placeholder="Not Set (0)"
                                value={vault.bag_min_bal_limit}
                                onChange={(e) => handleThresholdChange(vault.id, "bag_min_bal_limit", e.target.value)}
                                className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-[#1a73e8]/50 outline-none transition-all placeholder:text-gray-300 text-slate-700 text-xs font-mono font-bold"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-full max-w-[200px] relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">৳</span>
                              <input
                                type="number"
                                placeholder="Max Amount"
                                value={vault.bag_balance_limit}
                                onChange={(e) => handleThresholdChange(vault.id, "bag_balance_limit", e.target.value)}
                                className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-[#1a73e8]/50 outline-none transition-all placeholder:text-gray-300 text-slate-700 text-xs font-mono font-bold"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleSaveThreshold(vault)}
                              disabled={isSaving !== null}
                              className={`inline-flex items-center gap-1.5 px-6 py-2.5 text-sm font-bold rounded-xl transition shadow-lg ${
                                isSaving === vault.id
                                  ? "bg-gray-100 text-gray-400 shadow-none cursor-not-allowed"
                                  : "bg-[#1a73e8] hover:bg-blue-600 text-white shadow-blue-200"
                              }`}
                            >
                              {isSaving === vault.id ? (
                                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                              ) : (
                                <><Save className="w-4 h-4" /> Update</>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {activeTab !== "vault" && (
            <motion.div
              key="blank_pane"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="border border-dashed border-slate-200 rounded-2xl bg-slate-50/20 py-24 text-center flex flex-col items-center justify-center"
            >
              <Settings className="w-8 h-8 text-slate-300 animate-pulse mb-3" />
              <h4 className="text-sm font-bold text-slate-700 capitalize tracking-wide">{activeTab.replace("_", " ")} Workspace Configuration Pane</h4>
              <p className="text-xs text-slate-400 font-medium mt-1">This segment contains parameters currently pending data structure integration mappings.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SystemPreferences;
