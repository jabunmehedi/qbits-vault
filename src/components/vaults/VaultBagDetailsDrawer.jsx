import { ArrowDownCircle, ArrowUpCircle, ChevronDown, Download, History, Package } from "lucide-react";
import Drawer from "../global/drawer/Drawer";
import { AnimatePresence, motion } from "framer-motion";
import dayjs from "dayjs";
import { useState } from "react";
import toast from "react-hot-toast";

const VaultBagDetailsDrawer = ({ drawerOpen, setDrawerOpen, selectedVault, vaultBagsDetails, loadingBags }) => {
  const [expandedBag, setExpandedBag] = useState(null);
  const [historyBag, setHistoryBag] = useState(null);

  const toggleBagExpand = (barcode) => setExpandedBag(expandedBag === barcode ? null : barcode);

  const downloadBagBarcode = (bag) => {
    const run = () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

      try {
        if (typeof window.JsBarcode === "undefined") {
          if (!document.querySelector("script[data-jsbarcode]")) {
            const s = document.createElement("script");
            s.src = "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js";
            s.setAttribute("data-jsbarcode", "true");
            s.onload = () => downloadBagBarcode(bag);
            document.head.appendChild(s);
          } else {
            toast.error("Barcode library loading… please try again in a moment.");
          }
          return;
        }

        window.JsBarcode(svg, bag.bag_identifier_barcode, {
          format: "CODE128",
          width: 3,
          height: 110,
          displayValue: true,
          fontSize: 24,
          textMargin: 12,
          margin: 10,
        });

        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width || 400;
          canvas.height = img.height || 150;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);

          canvas.toBlob((blob) => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `${bag.barcode}_barcode.png`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          }, "image/png");
        };
        img.src = url;
      } catch (err) {
        console.error("Barcode generation failed:", err);
        toast.error("Failed to generate barcode.");
      }
    };

    run();
  };

  return (
    <Drawer
      isOpen={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      title={
        <div>
          <div className="flex items-center gap-6">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl">
              <Package className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{selectedVault?.name}</h2>
              <p className="text-2xl text-cyan-600 font-mono mt-2">{selectedVault?.vault_id}</p>
            </div>
          </div>
        </div>
      }
    >
      {/* ── FIX: Added explicit max-height calculation and overflow-y-auto ── */}
      <div className="p-8 pt-0 max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar">
        <div className="mb-8 mt-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Cash Bags</h3>
            <p className="text-sm text-gray-600 mt-1">
              {vaultBagsDetails.length} bag{vaultBagsDetails.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Balance</p>
            <p className="text-xl font-bold text-green-600">
              ৳{vaultBagsDetails.reduce((s, b) => s + parseFloat(b.current_amount || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {loadingBags ? (
          <div className="flex items-center justify-center py-32">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-cyan-500" />
          </div>
        ) : vaultBagsDetails.length === 0 ? (
          <div className="text-center py-32">
            <Package className="w-24 h-24 mx-auto mb-6 text-gray-300" />
            <p className="text-xl text-gray-500">No bags found in this vault.</p>
          </div>
        ) : (
          <div className="space-y-6 pb-6"> {/* Added bottom padding so the last item doesn't cut off */}
            {vaultBagsDetails.map((bag) => {
              const denominations = bag.denominations ? JSON.parse(bag.denominations) : null;
              const totalNotes = denominations ? Object.values(denominations).reduce((a, b) => a + b, 0) : 0;

              return (
                <motion.div
                  key={bag.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300"
                >
                  <button
                    onClick={() => toggleBagExpand(bag.barcode)}
                    className="w-full px-8 py-7 flex items-center justify-between hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-6">
                      <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl">
                        <Package className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-4">
                          <h4 className="text-lg font-bold text-gray-800">{bag.barcode}</h4>
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-cyan-100 text-cyan-700">Rack #{bag.rack_number}</span>
                        </div>
                        <div className="flex items-center gap-8 mt-4">
                          <span className="text-xl font-bold text-green-600">
                            ৳{parseFloat(bag.current_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                          <div className="flex items-center gap-4">
                            {bag.is_sealed && <span className="px-4 py-1.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">Sealed</span>}
                            {!bag.is_active && <span className="px-4 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">Inactive</span>}
                            {bag.last_cash_in_at && (
                              <span className="text-sm text-gray-600 flex items-center gap-2">
                                <ArrowDownCircle className="w-5 h-5 text-green-600" />
                                {dayjs(bag.last_cash_in_at).format("DD MMM, YYYY")}
                              </span>
                            )}
                            {bag.last_cash_out_at && (
                              <span className="text-sm text-gray-600 flex items-center gap-2">
                                <ArrowUpCircle className="w-5 h-5 text-red-600" />
                                {dayjs(bag.last_cash_out_at).format("DD MMM, YYYY")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {bag.bag_identifier_barcode && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadBagBarcode(bag);
                          }}
                          title="Download barcode as PNG"
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-cyan-50 hover:bg-cyan-100 text-cyan-600 border border-cyan-200 rounded-full transition"
                        >
                          <Download className="w-3.5 h-3.5" /> Barcode
                        </motion.button>
                      )}

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setHistoryBag(bag);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition"
                      >
                        <History className="w-3.5 h-3.5" /> History
                      </motion.button>

                      <motion.div animate={{ rotate: expandedBag === bag.barcode ? 180 : 0 }} transition={{ duration: 0.3 }}>
                        <ChevronDown className="w-7 h-7 text-gray-500" />
                      </motion.div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedBag === bag.barcode && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="border-t border-gray-200 bg-gray-50/70"
                      >
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          <div className="lg:col-span-2">
                            <h5 className="text-sm text-gray-600 mb-5">Denomination Breakdown</h5>
                            {denominations ? (
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                                {Object.entries(denominations)
                                  .filter(([_, c]) => c > 0)
                                  .map(([note, count]) => (
                                    <div key={note} className="bg-white p-6 rounded-xl border border-gray-200 text-center shadow-md">
                                      <p className="text-xl font-bold text-gray-800">৳{note}</p>
                                      <p className="text-sm text-gray-600 mt-2">
                                        {count} note{count !== 1 ? "s" : ""}
                                      </p>
                                      <p className="text-xl font-bold text-green-600 mt-3">৳{(parseInt(note) * count).toLocaleString()}</p>
                                    </div>
                                  ))}
                                {totalNotes === 0 && <p className="col-span-full text-center text-gray-500 py-10">No notes recorded yet.</p>}
                              </div>
                            ) : (
                              <p className="text-gray-400 text-xs">No denomination data available.</p>
                            )}
                          </div>

                          <div>
                            <h5 className="text-sm text-gray-600 mb-5 flex items-center gap-3">
                              <History className="w-4 h-4 text-gray-600" /> Activity Summary
                            </h5>
                            <div className="bg-white p-7 rounded-xl border border-gray-200 shadow-md space-y-6">
                              <div className="flex justify-between">
                                <div>
                                  <p className="text-xs text-gray-600">Successful Deposits</p>
                                  <p className="text-lg font-bold text-green-600">{bag.total_successful_deposits}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600">Total Attempts</p>
                                  <p className="text-lg font-semibold text-gray-800">{bag.total_cash_in_attempts}</p>
                                </div>
                              </div>
                              {bag.last_cash_in_amount && (
                                <div className="pt-5 border-t border-gray-200">
                                  <p className="text-sm text-gray-600">Last Cash In (৳)</p>
                                  <p className="text-2xl font-bold text-green-600">+ {parseFloat(bag.last_cash_in_amount).toLocaleString()}</p>
                                  <p className="text-sm text-gray-500 mt-1">{dayjs(bag.last_cash_in_at).format("DD MMM YYYY, h:mm A")}</p>
                                </div>
                              )}
                              {bag.notes && (
                                <div className="pt-5 border-t border-gray-200">
                                  <p className="text-sm text-gray-600">Notes</p>
                                  <p className="text-gray-700 mt-2">{bag.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </Drawer>
  );
};

export default VaultBagDetailsDrawer;