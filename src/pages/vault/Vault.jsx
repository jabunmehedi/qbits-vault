import { useEffect, useState } from "react";
import DataTable from "../../components/global/dataTable/DataTable";
import { CreateVault, DeleteVault, GetVault, GetVaults, UpdateVault } from "../../services/Vault";
import dayjs from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { ChevronRight, Plus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useToast } from "../../hooks/useToast";
import { useSearchParams } from "react-router-dom";
import VaultBagDetailsDrawer from "../../components/vaults/VaultBagDetailsDrawer";
import CreateUpdateVault from "../../components/vaults/CreateUpdateVault";
import { useSelector } from "react-redux";
import { selectIsSuperAdmin } from "../../store/authSlice";
import { usePermissions } from "../../hooks/usePermissions";

const Vault = () => {
  const [vaults, setVaults] = useState([]);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [totalRacks, setTotalRacks] = useState("");
  const [rackErrors, setRackErrors] = useState({});
  const [bags, setBags] = useState([]);
  const [deleteErrors, setDeleteErrors] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedVault, setSelectedVault] = useState(null);
  const [vaultBagsDetails, setVaultBagsDetails] = useState([]);
  const [loadingBags, setLoadingBags] = useState(false);
  const [expandedBag, setExpandedBag] = useState(null);
  const [historyBag, setHistoryBag] = useState(null);
  const [generatedVaultCode, setGeneratedVaultCode] = useState(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingVaultId, setEditingVaultId] = useState(null);
  const [editingVaultDisplayId, setEditingVaultDisplayId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [deletingVaultId, setDeletingVaultId] = useState(null);
  const [isApiDeleting, setIsApiDeleting] = useState(false);
  const [paginationData, setPaginationData] = useState();
  const currentPage = parseInt(searchParams.get("page") || "1");

  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const { hasPermission } = usePermissions();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm();

  const watchedTotalRacks = watch("total_racks");
  const watchedName = watch("name");
  const watchedBagLimit = watch("bag_limit");
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpenModal && !isEditMode) {
      const code = Math.floor(100 + Math.random() * 900);
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

  // ── Bag actions ───────────────────────────────────────────────────────────────
  const addBag = () => {
    const vaultCode = isEditMode ? watch("vault_code") || generatedVaultCode : generatedVaultCode;

    if (!vaultCode) {
      addToast({ type: "error", message: "Vault code is missing. Please enter a name first." });
      return;
    }

    // --- Bag Limit Logic ---
    if (watchedBagLimit !== undefined && watchedBagLimit !== null && watchedBagLimit !== "") {
      const limit = parseInt(watchedBagLimit, 10);

      if (limit === 0) {
        addToast({ type: "error", message: "Bag limit is set to 0. No bags can be created." });
        return;
      }

      if (limit !== null && bags.length >= limit) {
        addToast({ type: "error", message: `You have reached the limit of ${limit} bags.` });
        return;
      }
    }

    let maxSeq = 0;
    bags.forEach((bag) => {
      const parts = bag.barcode.split("_");
      if (parts.length === 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    });

    const nextNumber = maxSeq + 1;
    const n = String(nextNumber).padStart(3, "0");
    const humanBarcode = `${vaultCode}_${n}`;
    const year = new Date().getFullYear();
    const scannableBarcode = `QVB-${year}-${vaultCode}-${n}`;

    setBags([
      ...bags,
      {
        id: Date.now(),
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

  // Put this inside the Vault component
  useEffect(() => {
    const editId = searchParams.get("vault_edit_id");

    // Only proceed if we have an ID to search for and vaults have loaded
    if (editId && vaults.length > 0) {
      // Find the vault matching the vault_code (display ID)
      const vaultToEdit = vaults.find((v) => v.vault_id === editId);

      openEditModal(editId);

      // Clean up the URL so it doesn't reopen if the user refreshes or saves
      setSearchParams(
        (prev) => {
          const newParams = new URLSearchParams(prev);
          newParams.delete("vault_edit_id");
          return newParams;
        },
        { replace: true },
      );
    }
  }, [vaults, searchParams, setSearchParams]); //

  // ── Data fetching ─────────────────────────────────────────────────────────────
  const fetchVaultData = async () => {
    const res = await GetVaults({ page: currentPage });
    const { data: items, ...pagination } = res?.data ?? {};

    setVaults(items ?? []);
    setPaginationData(pagination);
  };

  useEffect(() => {
    fetchVaultData();
  }, [currentPage]);

  const openEditModal = async (vault) => {
    try {
      const res = await GetVault(vault?.id || vault);
      const vaultData = res?.data ?? res;

      reset({
        name: vaultData.name || "",
        vault_code: vaultData.vault_code || "",
        bag_limit: vaultData.bag_limit || "",
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
      setEditingVaultId(vaultData.id || null);

      // ── FIX: store the human-readable vault_id so we can send it back ────────
      setEditingVaultDisplayId(vaultData.vault_code || null);

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
    setSelectedVault(null);
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
    const limit = data.bag_limit ? parseInt(data.bag_limit, 10) : null;

    if (limit !== null) {
      if (limit === 0) {
        addToast({ type: "error", message: "Bag limit is set to 0. You cannot save a vault with 0 bags allowed." });
        return;
      }
      if (bags.length > limit) {
        addToast({ type: "error", message: `Validation Error: You have ${bags.length} bags, but the limit is ${limit}.` });
        return;
      }
    }
    // ── Rack number validation ──────────────────────────────────────
    const maxRacks = data.total_racks ? parseInt(data.total_racks, 10) : null;
    const newRackErrors = {};

    bags.forEach((bag) => {
      if (!bag.rack_number || bag.rack_number.trim() === "") {
        newRackErrors[bag.id] = "Rack number is required";
      } else if (maxRacks !== null && parseInt(bag.rack_number, 10) > maxRacks) {
        newRackErrors[bag.id] = `Cannot exceed ${maxRacks}`;
      }
    });

    if (Object.keys(newRackErrors).length > 0) {
      setRackErrors(newRackErrors);
      addToast({ type: "error", message: "Please fix rack number errors before submitting." });
      return;
    }
    // ───────────────────────────────────────────────────────────────

    if (Object.keys(rackErrors).length > 0) {
      addToast({ type: "error", message: "Please fix rack number errors before submitting." });
      return;
    }

    setIsLoading(true);

    const validBags = bags.map((b) => ({
      ...(b.originalId ? { id: b.originalId } : {}),
      barcode: b.barcode,
      bag_identifier_barcode: b.bag_identifier_barcode,
      rack_number: b.rack_number ? parseInt(b.rack_number, 10) : null,
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
      bag_limit: data.bag_limit ? Number(data.bag_limit) : null,
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

      // if (!isEditMode && validBags.length > 0) {
      //   printBagBarcodes(validBags, data.name);
      // }
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
  //   const printBagBarcodes = (bags, vaultName) => {
  //     const printWindow = window.open("", "_blank", "width=1000,height=900");
  //     if (!printWindow) {
  //       alert("Please allow popups for printing.");
  //       return;
  //     }
  //     const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Barcodes - ${vaultName}</title>
  // <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  // <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:15mm}
  // .label-container{display:flex;flex-direction:column;gap:25mm;max-width:180mm;margin:0 auto}
  // .barcode-label{padding:5mm 20mm;text-align:center;page-break-inside:avoid}
  // .barcode-label svg{width:100%;max-width:140mm;height:auto;margin:0 auto 10mm;display:block}
  // @media print{@page{size:A4;margin:8mm}}</style></head><body>
  // <div class="label-container">${bags.map((b) => `<div class="barcode-label"><svg class="barcode" data-code="${b.bag_identifier_barcode}"></svg></div>`).join("")}</div>
  // <script>document.addEventListener("DOMContentLoaded",function(){
  // document.querySelectorAll(".barcode").forEach(function(svg){
  // const c=svg.getAttribute("data-code");if(!c)return;
  // try{JsBarcode(svg,c,{format:"CODE128",width:3,height:110,displayValue:true,fontSize:24,textMargin:12,margin:10});}
  // catch(e){svg.outerHTML="<div style='color:red'>Invalid: "+c+"</div>";}});
  // setTimeout(()=>window.print(),2000);});</script></body></html>`;
  //     printWindow.document.open();
  //     printWindow.document.write(html);
  //     printWindow.document.close();
  //   };

  const handlePageChange = (page) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("page", page.toString());
      return p;
    });
  };

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveActionMenuId(null);
      setDeleteConfirmId(null);
    };
    if (activeActionMenuId !== null) {
      window.addEventListener("click", handleOutsideClick);
    }
    return () => {
      window.removeEventListener("click", handleOutsideClick);
    };
  }, [activeActionMenuId]);

  const handleDeleteSubmit = async (id) => {
    setIsApiDeleting(true);
    try {
      const res = await DeleteVault(id);
      if (!res?.success) {
        addToast({ type: "error", message: res?.message });
        return;
      }
      addToast({ type: "success", message: "Vault deleted successfully" });
      setDeletingVaultId(null);
      await fetchVaultData(); // Refresh the table list
    } catch (error) {
      console.error("Failed to delete vault:", error);
      toast.error(error?.response?.data?.message || "Failed to delete vault.");
    } finally {
      setIsApiDeleting(false);
      setDeletingVaultId(null);
    }
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
    { title: "Racks", key: "total_racks", className: "w-18 text-start", render: (row) => <span>{row.total_racks || "-"}</span> },
    {
      title: "Bags",
      key: "total_bags",
      className: "!w-16 text-start",
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
          <span>{row.last_cash_in ? dayjs(row.last_cash_in).format("DD MMM, YYYY HH:mm A") : "—"}</span>
        </div>
      ),
    },
    {
      title: "Last Cash Out",
      key: "last_cash_out",
      className: "w-34 text-start",
      render: (row) => (
        <div className="flex flex-col">
          <span>{row.last_cash_out ? dayjs(row.last_cash_out).format("DD MMM, YYYY") : "—"}</span>
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
      className: "w-14 relative",
      render: (row) => {
        const isMenuOpen = activeActionMenuId === row.id;
        const isConfirmingDelete = deleteConfirmId === row.id;

        const toggleMenu = (e) => {
          e.stopPropagation();
          setActiveActionMenuId(isMenuOpen ? null : row.id);
          setDeleteConfirmId(null);
        };

        const handleDeleteClick = (e) => {
          e.stopPropagation(); // Stop parent triggers
          setDeleteConfirmId(row.id); // Shift dropdown view into inline verification mode
        };

        const handleCancelDelete = (e) => {
          e.stopPropagation();
          setDeleteConfirmId(null);
        };

        return (
          <div className="relative inline-block text-left">
            <button
              onClick={toggleMenu}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors duration-200 cursor-pointer"
              aria-label="Actions"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>

            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.15 }}
                className={`absolute right-0 mt-1 ${row?.verifier_status === "verified" ? "hidden" : ""} bg-white border border-gray-200 divide-y divide-gray-100 rounded-lg shadow-xl z-50 overflow-hidden transition-all ${
                  isConfirmingDelete ? "w-44" : "w-28"
                }`}
              >
                <AnimatePresence mode="wait">
                  {!isConfirmingDelete ? (
                    <motion.div key="options" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {/* Edit Option */}
                      {(isSuperAdmin || hasPermission("vault.edit")) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(row);
                          }}
                          className="flex items-center w-full px-3 py-2 text-xs hover:text-blue-600 hover:bg-blue-50 transition-colors gap-2 cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Edit
                        </button>
                      )}

                      {/* Delete Option Trigger */}
                      {(isSuperAdmin || hasPermission("vault.delete")) && (
                        <button
                          onClick={handleDeleteClick}
                          className="flex items-center w-full px-3 py-2 text-xs hover:text-red-600 hover:bg-red-50 transition-colors gap-2 cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Delete
                        </button>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="py-4 text-center"
                    >
                      <p className="text-xs text-gray-500 font-medium mb-2">Are you sure you want to delete?</p>
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={handleCancelDelete}
                          className="px-2 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={isApiDeleting}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSubmit(row.id);
                          }}
                          className="px-2 py-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded transition-colors cursor-pointer"
                        >
                          {isApiDeleting ? <Loader2 className="w-4 h-4  mx-2 animate-spin" /> : "Confirm"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        );
      },
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
        {isSuperAdmin ||
          (hasPermission("vault_create") && (
            <button
              onClick={() => {
                setIsEditMode(false);
                setIsOpenModal(true);
                setBags([]); // Clear bags state
                setRackErrors([]); // Clear rack errors
                setDeleteErrors([]); // Clear delete errors
                reset({
                  name: "",
                  vault_code: "",
                  bag_limit: "",
                  address: "",
                  total_racks: "",
                });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all"
            >
              <Plus className="w-5 h-5" /> Create Vault
            </button>
          ))}
      </div>

      <DataTable columns={columns} data={vaults} paginationData={paginationData} changePage={handlePageChange} className="h-[calc(100vh-120px)]" />

      {/* ── Create / Edit Modal ── */}
      {isOpenModal && (
        <CreateUpdateVault
          isEditMode={isEditMode}
          handleSubmit={handleSubmit}
          register={register}
          errors={errors}
          onSubmit={onSubmit}
          deleteErrors={deleteErrors}
          isCloseModal={handleCloseModal}
          generatedVaultCode={generatedVaultCode}
          bags={bags}
          setBags={setBags}
          addBag={addBag}
          setRackErrors={setRackErrors}
          rackErrors={rackErrors}
          removeBag={removeBag}
          watchedBagLimit={watchedBagLimit}
          isLoading={isLoading}
        />
      )}

      <VaultBagDetailsDrawer
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        selectedVault={selectedVault}
        vaultBagsDetails={vaultBagsDetails}
        loadingBags={loadingBags}
        toggleBagExpand={toggleBagExpand}
        expandedBag={expandedBag}
        setHistoryBag={setHistoryBag}
      />
    </div>
  );
};

export default Vault;
