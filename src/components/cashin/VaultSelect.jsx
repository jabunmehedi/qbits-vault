import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { HiChevronUpDown } from "react-icons/hi2";
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

  return (
    <div className="relative w-64" ref={containerRef}>
      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Select Vault</p>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center  justify-between px-4 py-2.5 bg-white border ${error ? "border-red-300" : "border-slate-200"} rounded-xl hover:border-cyan-500 transition-all  group`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <MdOutlineAccountBalanceWallet className="text-slate-400 group-hover:text-cyan-500 transition-colors" size={18} />
          <span className="text-sm font-semibold text-slate-700 truncate">
            {selectedVault ? selectedVault.vault.name + (selectedVault?.vault.id == defaultVault ? " (Default)" : "") : "Select Vault"}
          </span>
        </div>
        <HiChevronUpDown className="text-slate-400" />
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
              {vaults?.map((vault) => (
                <button
                  key={vault.id}
                  onClick={() => {
                    onSelect(vault);
                    setIsOpen(false);
                    setError("");
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-cyan-50 transition-colors text-left"
                >
                  <div className="flex flex-col">
                    <span className={`text-sm ${selectedVault?.id === vault.id ? "font-bold text-cyan-600" : "font-medium text-slate-600"}`}>
                      {vault.vault.name} {vault.vault.id == defaultVault && <span className="text-gray-400">(Default)</span>}
                    </span>
                    {vault.is_default && <span className="text-[9px] text-cyan-500 font-bold uppercase">Default Vault</span>}
                  </div>
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
