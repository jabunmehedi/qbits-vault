import { useEffect, useState } from "react";
import DataTable from "../../components/global/dataTable/DataTable";
import { CreateVault, GetVault, GetVaults, UpdateVault } from "../../services/Vault";
import dayjs from "dayjs";
import CustomModal from "../../components/global/modal/CustomModal";
import { AiOutlineDelete, AiOutlinePlus } from "react-icons/ai";
import { AnimatePresence, motion } from "framer-motion";
import { set, useForm } from "react-hook-form";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
  ChevronRight,
  History,
  Package,
  X,
  AlertTriangle,
  Clock,
  Edit3,
  Trash2,
  Plus,
  Download,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import axiosConfig from "../../utils/axiosConfig";
import { GoDatabase } from "react-icons/go";
import { FiBox } from "react-icons/fi";
import Drawer from "../../components/global/drawer/Drawer";

// ─── Barcode Download Utility ─────────────────────────────────────────────────
/**
 * Downloads a single bag's barcode as a PNG image using an off-screen canvas.
 * Requires JsBarcode to be available via CDN or bundled.
 */
const downloadBagBarcode = (bag) => {
  // Dynamically load JsBarcode if not already present
  const run = () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    try {
      // JsBarcode must be available globally; it's loaded in printBagBarcodes via CDN
      if (typeof window.JsBarcode === "undefined") {
        // Inject script tag once then retry
        if (!document.querySelector("script[data-jsbarcode]")) {
          const s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js";
          s.setAttribute("data-jsbarcode", "true");
          s.onload = () => downloadBagBarcode(bag); // retry after load
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

      // Convert SVG → Canvas → PNG download
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

// ─── Bag History Drawer ───────────────────────────────────────────────────────
const BagHistoryDrawer = ({ bag, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bag) return;
    setLoading(true);
    axiosConfig
      .get(`/activity-logs/bag/${bag.id}`)
      .then((res) => setHistory(res.data?.history || []))
      .catch(() => setHistory(bag.history || []))
      .finally(() => setLoading(false));
  }, [bag]);

  const eventMeta = {
    created: { color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: <Plus className="w-3 h-3" /> },
    updated: { color: "text-blue-600 bg-blue-50 border-blue-200", icon: <Edit3 className="w-3 h-3" /> },
    deleted: { color: "text-red-600 bg-red-50 border-red-200", icon: <Trash2 className="w-3 h-3" /> },
    cash_in: { color: "text-green-600 bg-green-50 border-green-200", icon: <ArrowDownCircle className="w-3 h-3" /> },
    cash_out: { color: "text-orange-600 bg-orange-50 border-orange-200", icon: <ArrowUpCircle className="w-3 h-3" /> },
    rack_changed: { color: "text-purple-600 bg-purple-50 border-purple-200", icon: <Edit3 className="w-3 h-3" /> },
  };

  const getMeta = (event) => eventMeta[event] || { color: "text-gray-600 bg-gray-50 border-gray-200", icon: <Clock className="w-3 h-3" /> };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-[60] flex flex-col"
    >
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900">{bag?.barcode} — History</p>
            <p className="text-xs text-gray-400">{bag?.bag_identifier_barcode}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-cyan-500" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No history recorded yet.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100" />

            <div className="space-y-4 pl-10">
              {history.map((entry, i) => {
                const meta = getMeta(entry.event);
                const changes = entry.data?.changes || null;

                return (
                  <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="relative">
                    {/* Dot */}
                    <div className={`absolute -left-7 top-1 w-5 h-5 rounded-full border flex items-center justify-center ${meta.color}`}>{meta.icon}</div>

                    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${meta.color}`}>
                          {entry.event?.replace("_", " ").toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{dayjs(entry.timestamp).format("DD MMM YYYY, h:mm A")}</span>
                      </div>

                      <p className="text-sm text-gray-700 mt-1">{entry.description}</p>

                      {changes && Object.keys(changes).length > 0 && (
                        <div className="mt-2 space-y-1">
                          {Object.entries(changes).map(([field, { from, to }]) => (
                            <div key={field} className="text-xs flex items-center gap-1 text-gray-500">
                              <span className="font-medium text-gray-600">{field}:</span>
                              <span className="line-through text-red-400">{String(from)}</span>
                              <span>→</span>
                              <span className="text-green-600">{String(to)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {(entry.data?.amount || entry.data?.cash_in_amount || entry.data?.cash_out_amount) && (
                        <div className="mt-2 text-sm font-bold text-green-600">
                          ৳{(entry.data?.amount || entry.data?.cash_in_amount || entry.data?.cash_out_amount).toLocaleString()}
                        </div>
                      )}

                      {entry.user_name && <p className="text-xs text-gray-400 mt-2">by {entry.user_name}</p>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ─── Main Vault Component ─────────────────────────────────────────────────────
const Vault = () => {
  const [vaults, setVaults] = useState([]);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [totalRacks, setTotalRacks] = useState("");
  const [rackErrors, setRackErrors] = useState({});
  const [bags, setBags] = useState([]);
  const [deleteErrors, setDeleteErrors] = useState([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedVault, setSelectedVault] = useState(null);
  const [vaultBagsDetails, setVaultBagsDetails] = useState([]);
  const [loadingBags, setLoadingBags] = useState(false);
  const [expandedBag, setExpandedBag] = useState(null);
  const [historyBag, setHistoryBag] = useState(null);
  const [generatedVaultCode, setGeneratedVaultCode] = useState(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingVaultId, setEditingVaultId] = useState(null);
  // ── FIX: preserve the display vault_id (e.g. "VLT-001") separately ──────────
  const [editingVaultDisplayId, setEditingVaultDisplayId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm();

  const watchedTotalRacks = watch("total_racks");
  const watchedName = watch("name");

  useEffect(() => {
    if (isOpenModal && !isEditMode) {
      const code = Math.floor(100 + Math.random() * 900); // 100-999
      setGeneratedVaultCode(code);
    }
  }, [isOpenModal, isEditMode]);

  useEffect(() => {
    setTotalRacks(watchedTotalRacks || "");
  }, [watchedTotalRacks]);

  // Re-generate barcodes ONLY in create mode
  useEffect(() => {
    if (isEditMode || bags.length === 0) return;
    const prefix = getVaultPrefix(watchedName);
    const year = new Date().getFullYear();
    setBags((prev) =>
      prev.map((bag, index) => {
        const n = String(index + 1).padStart(3, "0");
        return { ...bag, barcode: `${prefix}${n}`, bag_identifier_barcode: `QVB-${year}-${prefix}-${n}` };
      }),
    );
  }, [watchedName]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getVaultPrefix = (name) => {
    if (!name?.trim()) return "VLT";
    const trimmed = name.trim();
    if (/^[A-Z]{2,4}$/.test(trimmed)) return trimmed;
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
    return words
      .map((w) => w[0].toUpperCase())
      .slice(0, 4)
      .join("");
  };

  // const generateBagCodes = (vaultName, seq) => {
  //   const year = new Date().getFullYear();
  //   const prefix = getVaultPrefix(vaultName);
  //   const n = String(seq).padStart(3, "0");
  //   return { humanBarcode: `${prefix}${n}`, scannableBarcode: `QVB-${year}-${prefix}-${n}` };
  // };

  // ── Bag actions ───────────────────────────────────────────────────────────────
  const addBag = () => {
    // Use the generated code if creating, or the existing display ID/code if editing
    const vaultCode = isEditMode ? watch("vault_code") || generatedVaultCode : generatedVaultCode;

    if (!vaultCode) {
      toast.error("Vault code is missing. Please enter a name first.");
      return;
    }

    // 1. Find the highest current sequence number in the bags list
    let maxSeq = 0;
    bags.forEach((bag) => {
      // Extract the number after the "_" (e.g., "707_002" -> 2)
      const parts = bag.barcode.split("_");
      if (parts.length === 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    });

    // 2. Set the next number
    const nextNumber = maxSeq + 1;
    const n = String(nextNumber).padStart(3, "0");

    const humanBarcode = `${vaultCode}_${n}`;
    const year = new Date().getFullYear();
    const scannableBarcode = `QVB-${year}-${vaultCode}-${n}`;

    setBags([
      ...bags,
      {
        id: Date.now(), // Unique ID for React keys
        barcode: humanBarcode,
        bag_identifier_barcode: scannableBarcode,
        rack_number: "",
        current_amount: "0",
      },
    ]);
  };

  const removeBag = (id) => {
    const bag = bags.find((b) => b.id === id);
    if (!bag) return;
    const amount = parseFloat(bag.current_amount || 0);
    if (amount > 0) {
      alert(`Cannot remove "${bag.barcode}" — it has ৳${amount.toFixed(2)}. Zero the amount first.`);
      return;
    }
    setBags(bags.filter((b) => b.id !== id));
  };

  // const updateRack = (id, value) => {
  //   const cleaned = value.replace(/[^0-9]/g, "");
  //   const num = cleaned ? parseInt(cleaned, 10) : 0;
  //   setBags((prev) => prev.map((b) => (b.id === id ? { ...b, rack_number: cleaned } : b)));
  //   if (totalRacks && num > parseInt(totalRacks)) {
  //     setRackErrors((prev) => ({ ...prev, [id]: `Rack cannot exceed ${totalRacks}` }));
  //   } else {
  //     setRackErrors((prev) => {
  //       const u = { ...prev };
  //       delete u[id];
  //       return u;
  //     });
  //   }
  // };

  // const updateBagAmount = (id, value) => {
  //   const cleaned = value.replace(/[^0-9.]/g, "");
  //   setBags((prev) => prev.map((b) => (b.id === id ? { ...b, current_amount: cleaned } : b)));
  // };

  // ── Data fetching ─────────────────────────────────────────────────────────────
  const fetchVaultData = async () => {
    const res = await GetVaults();
    setVaults(res?.data);
  };

  useEffect(() => {
    fetchVaultData();
  }, []);

  const openEditModal = async (vault) => {
    try {
      const res = await GetVault(vault?.id);
      const vaultData = res?.data ?? res;

      reset({
        name: vaultData.name || "",
        vault_code: vaultData.vault_code || "",
        bag_balance_limit: vaultData.bag_balance_limit || "",
        address: vaultData.address || "",
        total_racks: vaultData.total_racks || "",
      });

      const existingBags = (vaultData.bags || []).map((bag) => ({
        id: bag.id,
        originalId: bag.id,
        barcode: bag.barcode || "",
        bag_identifier_barcode: bag.bag_identifier_barcode || "",
        rack_number: String(bag.rack_number || ""),
        current_amount: String(parseFloat(bag.current_amount || 0)),
      }));

      setBags(existingBags);
      setRackErrors({});
      setDeleteErrors([]);
      setEditingVaultId(vault.id);

      // ── FIX: store the human-readable vault_id so we can send it back ────────
      setEditingVaultDisplayId(vaultData.vault_code || vault.vault_code || null);

      setIsEditMode(true);
      setIsOpenModal(true);
    } catch (err) {
      console.error("Cannot load vault for edit", err);
      alert("Failed to load vault details. Please try again.");
    }
  };

  const openVaultDrawer = async (vault) => {
    setSelectedVault(vault);
    setDrawerOpen(true);
    setLoadingBags(true);
    setExpandedBag(null);
    setHistoryBag(null);

    if (vault.bags?.length > 0) {
      setVaultBagsDetails(vault.bags);
      setLoadingBags(false);
      return;
    }

    try {
      const res = await GetVault(vault.id);
      const vaultData = res?.data ?? res;
      setVaultBagsDetails(vaultData?.bags || []);
    } catch {
      setVaultBagsDetails([]);
    } finally {
      setLoadingBags(false);
    }
  };

  const handleCloseModal = () => {
    setIsOpenModal(false);
    setIsEditMode(false);
    setEditingVaultId(null);
    setEditingVaultDisplayId(null);
    setBags([]);
    setRackErrors({});
    setDeleteErrors([]);
    reset();
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const onSubmit = async (data) => {
    if (Object.keys(rackErrors).length > 0) {
      alert("Please fix rack number errors before submitting.");
      return;
    }

    setIsLoading(true);

    const validBags = bags.map((b) => ({
      ...(b.originalId ? { id: b.originalId } : {}),
      barcode: b.barcode,
      bag_identifier_barcode: b.bag_identifier_barcode,
      rack_number: null, // Or a default value since you aren't inputting it
      current_amount: parseFloat(b.current_amount || 0).toFixed(2),
    }));

    const payload = {
      vault_code: generatedVaultCode,
      name: data.name.trim(),
      address: data.address?.trim() || null,
      total_racks: data.total_racks ? Number(data.total_racks) : null,
      current_amount: validBags.reduce((s, b) => s + Number(b.current_amount), 0),
      total_bags: validBags.length,
      bags: validBags.length > 0 ? validBags : undefined,
      bag_balance_limit: data.bag_balance_limit ? Number(data.bag_balance_limit) : null,
    };

    // ── FIX: always send vault_id back on update so backend doesn't reset it ──
    if (isEditMode && editingVaultDisplayId) {
      payload.vault_code = editingVaultDisplayId;
    }

    try {
      if (isEditMode && editingVaultId) {
        const res = await UpdateVault(editingVaultId, payload);

        if (res?.errors?.length > 0) {
          setDeleteErrors(res.errors);
          await fetchVaultData();
          return;
        }
        toast.success("Vault updated successfully.");
      } else {
        await CreateVault(payload);
        toast.success("Vault created successfully.");
      }

      setIsLoading(false);
      handleCloseModal();

      await fetchVaultData();

      if (!isEditMode && validBags.length > 0) {
        printBagBarcodes(validBags, data.name);
      }
    } catch (error) {
      const serverErrors = error?.response?.data?.errors;
      if (serverErrors?.length > 0) {
        setDeleteErrors(serverErrors);
        await fetchVaultData();
        return;
      }
      console.error("Vault save failed:", error);
      toast.error("Failed to save vault.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBagExpand = (barcode) => setExpandedBag(expandedBag === barcode ? null : barcode);

  // ── Print all bag barcodes (on create) ───────────────────────────────────────
  const printBagBarcodes = (bags, vaultName) => {
    const printWindow = window.open("", "_blank", "width=1000,height=900");
    if (!printWindow) {
      alert("Please allow popups for printing.");
      return;
    }
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Barcodes - ${vaultName}</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:15mm}
.label-container{display:flex;flex-direction:column;gap:25mm;max-width:180mm;margin:0 auto}
.barcode-label{padding:5mm 20mm;text-align:center;page-break-inside:avoid}
.barcode-label svg{width:100%;max-width:140mm;height:auto;margin:0 auto 10mm;display:block}
@media print{@page{size:A4;margin:8mm}}</style></head><body>
<div class="label-container">${bags.map((b) => `<div class="barcode-label"><svg class="barcode" data-code="${b.bag_identifier_barcode}"></svg></div>`).join("")}</div>
<script>document.addEventListener("DOMContentLoaded",function(){
document.querySelectorAll(".barcode").forEach(function(svg){
const c=svg.getAttribute("data-code");if(!c)return;
try{JsBarcode(svg,c,{format:"CODE128",width:3,height:110,displayValue:true,fontSize:24,textMargin:12,margin:10});}
catch(e){svg.outerHTML="<div style='color:red'>Invalid: "+c+"</div>";}});
setTimeout(()=>window.print(),2000);});</script></body></html>`;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // ── Table columns ─────────────────────────────────────────────────────────────
  const columns = [
    {
      title: "Vault Code",
      key: "vault_code",
      className: "w-24 text-start",
      render: (row) => <span className="text-cyan-500">{row.vault_code}</span>,
    },
    { title: "Name", key: "name", className: "w-40 text-start", render: (row) => <span>{row.name}</span> },
    { title: "Address", key: "address", className: "w-32 text-start", render: (row) => <span>{row.address}</span> },
    {
      title: "Balance (৳)",
      key: "balance",
      className: "w-32 text-start",
      render: (row) => (
        <span>{row?.bags?.reduce((s, b) => s + parseFloat(b.current_amount || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
      ),
    },
    { title: "Racks", key: "total_racks", className: "w-20 text-start", render: (row) => <span>{row.total_racks || "-"}</span> },
    {
      title: "Bags",
      key: "total_bags",
      className: "w-36 text-start",
      render: (row) => {
        const count = row.bags?.length || 0;
        return (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openVaultDrawer(row)}
            className="px-3 py-2 bg-green-50 border border-green-200 cursor-pointer text-green-500 text-xs rounded-full flex items-center gap-2"
          >
            <span>
              {count} Bag{count !== 1 ? "s" : ""}
            </span>
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        );
      },
    },
    {
      title: "Last Cash In",
      key: "last_cash_in",
      className: "w-34 text-start",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-mono">{row.last_cash_in?.amount}</span>
          <span>{row.last_cash_in?.created_at ? dayjs(row.last_cash_in.created_at).format("DD MMM, YYYY") : "—"}</span>
        </div>
      ),
    },
    {
      title: "Last Cash Out",
      key: "last_cash_out",
      className: "w-34 text-start",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-mono">{row.last_cash_out?.amount}</span>
          <span>{row.last_cash_out?.created_at ? dayjs(row.last_cash_out.created_at).format("DD MMM, YYYY") : "—"}</span>
        </div>
      ),
    },
    {
      title: "Status",
      key: "status",
      className: "w-32 text-start",
      render: () => <span className="bg-cyan-50 text-xs text-cyan-500 border border-cyan-200 py-1 px-2 rounded-full">Active</span>,
    },
    {
      title: "Action",
      key: "actions",
      className: "w-28 text-start",
      render: (row) => (
        <div className="flex items-center justify-center gap-3 py-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(row);
            }}
            className="p-2 rounded-lg bg-blue-500/10 cursor-pointer hover:bg-blue-500/20 text-blue-600 border border-blue-400/20 transition-all"
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
              if (window.confirm(`Delete vault "${row.name}"?`)) {
                /* DeleteVault */
              }
            }}
            className="p-2 rounded-lg bg-red-500/10 cursor-pointer hover:bg-red-500/20 text-red-600 border border-red-400/20 transition-all"
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
        </div>
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-6 flex justify-between">
        <div>
          <p className="text-[#424242] text-lg font-medium">Vault Management</p>
          <span className="text-gray-400 text-sm capitalize">Monitor and manage all vault assets and bags</span>
        </div>
        <button
          onClick={() => {
            setIsEditMode(false);
            setIsOpenModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all"
        >
          <Plus className="w-5 h-5" /> Create Vault
        </button>
      </div>

      <DataTable columns={columns} data={vaults} paginationData={{}} className="h-[calc(100vh-120px)]" />

      {/* ── Create / Edit Modal ── */}
      {isOpenModal && (
        <CustomModal
          title={
            <div className="flex items-center gap-2">
              <GoDatabase className="text-blue-700" /> {isEditMode ? "Edit Vault Configuration" : "New Vault Configuration"}
            </div>
          }
          isCloseModal={handleCloseModal}
          className="max-w-3xl"
        >
          <form className="space-y-6 mt-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Delete errors banner */}
            {deleteErrors.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <p className="text-sm font-semibold text-amber-700">Some bags could not be deleted</p>
                </div>
                <ul className="space-y-1">
                  {deleteErrors.map((err, i) => (
                    <li key={i} className="text-xs text-amber-600">
                      • {err.message}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-amber-500 mt-2">Zero the bag amount first, then save again.</p>
              </div>
            )}

            <div className="space-y-5">
              <div className="">
                <div>
                  <label className="block  uppercase tracking-wider font-semibold text-xs text-gray-400 mb-2">Vault Name *</label>
                  <input
                    {...register("name", { required: "Vault name is required" })}
                    className={`w-full px-4 py-2 bg-[#F8FAFC] border ${errors.name ? "border-red-500" : "border-gray-100"} rounded-lg placeholder:text-xs focus:border-blue-300 focus:outline-none transition`}
                    placeholder="e.g. SM Office"
                  />
                  {errors.name && <span className="text-[10px] text-red-500 mt-1">{errors.name.message}</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block  uppercase tracking-wider font-semibold text-xs text-gray-400 mb-2">Total Racks (optional)</label>
                  <input
                    type="number"
                    {...register("total_racks")}
                    className="w-full px-4 py-2 bg-[#F8FAFC] border border-gray-100 placeholder:text-xs rounded-lg focus:outline-none focus:border-blue-300"
                    placeholder="e.g. 10"
                  />
                </div>
                <div>
                  <label className="block  uppercase tracking-wider font-semibold text-xs text-gray-400 mb-2">Vault Code (AUTO)</label>
                  <input
                    value={generatedVaultCode}
                    // type="number"
                    {...register("vault_code")}
                    className="w-full px-4 py-2 font-semibold read-only bg-[#F8FAFC] border border-gray-100 placeholder:text-xs rounded-lg focus:outline-none focus:border-blue-300"
                    placeholder="e.g. 10"
                  />
                </div>
              </div>
              <div>
                <label className="block  uppercase tracking-wider font-semibold text-xs text-gray-400 mb-2">Address *</label>
                <textarea
                  {...register("address", { required: "Address is required" })}
                  className={`w-full px-4 py-2 bg-[#F8FAFC] border ${errors.address ? "border-red-500" : "border-gray-100"} rounded-lg placeholder:text-xs focus:outline-none focus:border-blue-300`}
                  placeholder="123 Bank Street..."
                />
                {errors.address && <span className="text-[10px] text-red-500 mt-1">{errors.address.message}</span>}
              </div>

              {/* Bags */}
              <div className="bg-[#F7FBFF] p-4 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <FiBox className="w-6 h-6 text-blue-600" />
                    <label className="text-sm font-semibold text-gray-600">Bags Association</label>
                  </div>
                  <div className="flex uppercase font-semibold items-center gap-2 cursor-pointer px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-xs text-blue-400 ">
                    Limit
                    <input type="text" {...register("bag_balance_limit")} className="p-2 px-4 w-24 text-center bg-white border border-slate-200 rounded-lg" />
                  </div>
                </div>

                {/* Grid Container */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {bags.map((bag) => {
                      const amount = parseFloat(bag.current_amount || 0);
                      const hasAmt = amount > 0;
                      const isError = deleteErrors.some((e) => e.barcode === bag.barcode);

                      return (
                        <motion.div
                          key={bag.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className={`relative group flex items-center justify-between p-5 bg-white rounded-2xl border transition-all ${
                            isError ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-blue-200"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="bg-blue-50 w-10 h-10 flex justify-center items-center rounded-xl">
                              <FiBox className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                              <p className="uppercase text-[10px] font-bold text-gray-400 tracking-wider">Bag ID</p>
                              <p className="text-[#1A335E] text-sm font-bold">{bag.barcode || "707_000"}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="uppercase text-[10px] font-bold text-blue-400 tracking-wider">Initial Amount</p>
                              <p className="text-[#1A335E] text-sm font-bold">৳ {amount.toFixed(2)}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeBag(bag.id)}
                              className={`transition-colors ${hasAmt ? "text-gray-200 cursor-not-allowed" : "text-gray-300 hover:text-red-500"}`}
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}

                    {/* Add Bag Button Styled as a Card */}
                    <motion.button
                      layout
                      onClick={addBag}
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-blue-200 rounded-2xl bg-blue-50/30 hover:bg-blue-50 transition-colors min-h-[92px]"
                    >
                      <div className="flex items-center gap-2 text-blue-400 font-semibold">
                        <AiOutlinePlus className="w-5 h-5" />
                        <span>Add Bag</span>
                      </div>
                      <p className="text-[10px] text-blue-300 mt-1 font-medium">Auto-generated ID with ৳ 0.00 base</p>
                    </motion.button>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-10 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 text-black py-3 border border-gray-200 rounded-xl  hover:text-red-400 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`flex-1 py-3 flex justify-center items-center  text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition ${isLoading ? "cursor-not-allowed bg-[#f7fbff] border border-blue-100" : " bg-gradient-to-r from-blue-600 to-purple-600"}`}
              >
                {isLoading ? <Loader2 size={18} className="animate-spin text-blue-400" /> : isEditMode ? "Save Changes" : "Create Vault"}
              </button>
            </div>
          </form>
        </CustomModal>
      )}

      {/* ── Vault Bags Drawer ── */}
      {/* <AnimatePresence>
        {drawerOpen && selectedVault && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setDrawerOpen(false);
                setHistoryBag(null);
              }}
              className="fixed inset-0 bg-black/60 z-50"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-6xl bg-white shadow-2xl z-50 overflow-y-auto"
            >
             
            </motion.div>

           
            <AnimatePresence>{historyBag && <BagHistoryDrawer bag={historyBag} onClose={() => setHistoryBag(null)} />}</AnimatePresence>
          </>
        )}
      </AnimatePresence> */}

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="sticky top-0 bg-white border-b border-gray-200 p-8 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl">
              <Package className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{selectedVault?.name}</h2>
              <p className="text-2xl text-cyan-600 font-mono mt-2">{selectedVault?.vault_id}</p>
            </div>
          </div>
          <button onClick={() => setDrawerOpen(false)} className="p-4 hover:bg-gray-100 rounded-full transition">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="p-8 pt-0">
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
            <div className="space-y-6">
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
                        {/* ── Download barcode button ── */}
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

                        {/* History button */}
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
        {/* <AnimatePresence>{historyBag && <BagHistoryDrawer bag={historyBag} onClose={() => setHistoryBag(null)} />}</AnimatePresence> */}
      </Drawer>
    </div>
  );
};

export default Vault;
