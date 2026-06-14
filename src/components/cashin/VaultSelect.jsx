import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { MdCheck, MdOutlineAccountBalanceWallet } from "react-icons/md";

const VaultSelect = ({ vaults, selectedVault, onSelect, defaultVault, error, setError }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);



  const activeVaults = useMemo(() => {
    if (!vaults) return [];
    return [...vaults]
      .filter((v) => v.status === "active")
      .sort((a, b) => {
        const isADefault = a.vault?.id == defaultVault;
        const isBDefault = b.vault?.id == defaultVault;
        if (isADefault && !isBDefault) return -1;
        if (!isADefault && isBDefault) return 1;
        return (b.vault?.id || 0) - (a.vault?.id || 0);
      });
  }, [vaults, defaultVault]);

  // Single vault — show as read-only display, no dropdown
  if (activeVaults.length === 1) {
    return (
      <div className="relative min-w-64">
        <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1 ml-1">Vault</p>
        <div className="w-full flex items-center gap-2 px-4 py-2.5 bg-[#F0FDF4] border border-green-200 rounded-xl">
          <MdOutlineAccountBalanceWallet className="text-green-500 shrink-0" size={18} />
          <span className="text-sm font-semibold text-slate-700 truncate">{activeVaults[0].vault.name}</span>
          <span className="ml-auto text-[9px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full uppercase tracking-wide">Auto-selected</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-w-64" ref={containerRef}>
      <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1 ml-1">Select Vault</p>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-2.5 bg-[#F8FAFC] border ${error ? "border-red-300" : "border-slate-200"} rounded-xl hover:border-cyan-500 transition-all group`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <MdOutlineAccountBalanceWallet className="text-slate-400 group-hover:text-cyan-500 transition-colors" size={18} />
          <span className={`text-sm font-semibold truncate ${selectedVault ? "text-slate-700" : "text-slate-400"}`}>
            {selectedVault ? selectedVault.vault.name : "Select Vault"}
          </span>
        </div>
        <ChevronDown className="text-slate-400 w-4 h-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 4 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-[100] w-full bg-white border border-slate-100 rounded-xl shadow-2xl overflow-hidden py-1"
          >
            <div className="max-h-60 overflow-y-auto">
              {activeVaults.map((vault) => (
                <button
                  key={vault.id}
                  onClick={() => {
                    onSelect(vault);
                    setIsOpen(false);
                    setError("");
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-[#F8FAFC] transition-colors text-left"
                >
                  <span className={`text-sm ${selectedVault?.id === vault.id ? "font-bold text-cyan-600" : "font-medium text-slate-600"}`}>
                    {vault.vault.name}
                  </span>
                  {selectedVault?.id === vault.id && <MdCheck className="text-cyan-500" size={18} />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VaultSelect;
