import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CreateVault, DeleteVault, GetVault, GetVaults, MakeDefaultVault, UpdateVault } from "../../services/Vault";
import { GetRoles } from "../../services/User";
import { useForm } from "react-hook-form";
import { Loader2, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import { useToast } from "../../hooks/useToast";
import { useNavigate, useSearchParams } from "react-router-dom";
import VaultBagDetailsDrawer from "../../components/vaults/VaultBagDetailsDrawer";
import CreateUpdateVault from "../../components/vaults/CreateUpdateVault";
import VaultCardList from "../../components/vaults/VaultCardList";
import { useDispatch, useSelector } from "react-redux";
import { fetchAuthUser, selectAuthUser, selectIsSuperAdmin } from "../../store/authSlice";
import { usePermissions } from "../../hooks/usePermissions";

const Vault = () => {
  const [vaults, setVaults] = useState([]);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [totalRacks, setTotalRacks] = useState("");
  const [rackErrors, setRackErrors] = useState({});
  const [bags, setBags] = useState([]);
  const [deleteErrors, setDeleteErrors] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedVault, setSelectedVault] = useState(null);
  const [vaultBagsDetails, setVaultBagsDetails] = useState([]);
  const [loadingBags, setLoadingBags] = useState(false);
  const [expandedBag, setExpandedBag] = useState(null);
  const [generatedVaultCode, setGeneratedVaultCode] = useState(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingVaultId, setEditingVaultId] = useState(null);
  const [editingVaultDisplayId, setEditingVaultDisplayId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [deletingVaultId, setDeletingVaultId] = useState(null);
  const [isApiDeleting, setIsApiDeleting] = useState(false);
  const [paginationData, setPaginationData] = useState();
  const currentPage = parseInt(searchParams.get("page") || "1");

  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const { hasPermission, hasRole } = usePermissions();
  const canRequestCashIn = isSuperAdmin || hasPermission("cash-in.request");

  // Bag-create is a PER-VAULT capability (stored in the user's vault_assignments[].roles
  // as role ids), not a global role. Resolve the "bag create" role id once so we can check
  // the logged-in user's assignment for the specific vault being edited.
  const [bagCreateRoleId, setBagCreateRoleId] = useState(null);
  useEffect(() => {
    let active = true;
    GetRoles().then((res) => {
      const role = (res?.data || []).find((r) => String(r.name).toLowerCase() === "bag create");
      if (active) setBagCreateRoleId(role?.id ?? null);
    });
    return () => {
      active = false;
    };
  }, []);

  // ── Default vault ─────────────────────────────────────────────────────────────
  const dispatch = useDispatch();
  const user = useSelector(selectAuthUser);
  const [defaultVault, setDefaultVault] = useState(null);
  const [savingDefaultVaultId, setSavingDefaultVaultId] = useState(null);

  // Does the logged-in user hold the bag-create role for THIS vault? Super admins always pass.
  // When creating a brand-new vault there is no assignment yet, so fall back to the global role.
  const canCreateBagForVault = (vaultId) => {
    if (isSuperAdmin) return true;
    if (!vaultId) return hasRole("bag create");
    if (bagCreateRoleId == null) return false;
    const assignment = user?.vault_assignments?.find((a) => a.vault_id === vaultId);
    return (assignment?.roles || []).map(Number).includes(Number(bagCreateRoleId));
  };

  // ── Threshold modal ───────────────────────────────────────────────────────────
  const [thresholdModalOpen, setThresholdModalOpen] = useState(false);
  const [thresholdModalVault, setThresholdModalVault] = useState(null);
  const [thresholdMin, setThresholdMin] = useState("");
  const [thresholdMax, setThresholdMax] = useState("");
  const [isSavingThreshold, setIsSavingThreshold] = useState(false);

  // Deep-link to the cash-in page with this vault's request drawer pre-opened.
  const handleRequestCashIn = (vault) => navigate(`/cashin?request=1&vaultId=${vault.id}`);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
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

  // Sync user's saved default vault
  useEffect(() => {
    if (user?.default_vault_id) setDefaultVault(user.default_vault_id);
  }, [user?.default_vault_id]);

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

  const bagsRef = useRef(bags);
  useEffect(() => {
    bagsRef.current = bags;
  }, [bags]);

  // ── Bag actions ───────────────────────────────────────────────────────────────
  const addBag = () => {
    const vaultCode = isEditMode ? watch("vault_code") || generatedVaultCode : generatedVaultCode;

    if (!vaultCode) {
      addToast({ type: "error", message: "Vault code is missing. Please enter a name first." });
      return;
    }

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

    const usedSeqs = new Set(
      bags
        .map((bag) => {
          const parts = bag.barcode.split("_");
          return parts.length === 2 ? parseInt(parts[1], 10) : NaN;
        })
        .filter((n) => !isNaN(n))
    );
    let nextNumber = 1;
    while (usedSeqs.has(nextNumber)) nextNumber++;
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
      addToast({ type: "error", message: `Cannot remove "${bag.barcode}" — it holds a balance of ৳${amount.toFixed(2)} and can't be deleted.` });
      return;
    }
    if (bag.has_transactions) {
      addToast({ type: "error", message: `Cannot remove "${bag.barcode}" — it has cash-in/cash-out history and can't be deleted.` });
      return;
    }
    setBags(bags.filter((b) => b.id !== id));
  };

  useEffect(() => {
    const editId = searchParams.get("vault_edit_id");
    if (editId && vaults.length > 0) {
      openEditModal(editId);
      setSearchParams(
        (prev) => {
          const newParams = new URLSearchParams(prev);
          newParams.delete("vault_edit_id");
          return newParams;
        },
        { replace: true },
      );
    }
  }, [vaults, searchParams, setSearchParams]);

  // ── Data fetching ─────────────────────────────────────────────────────────────
  const fetchVaultData = async () => {
    const res = await GetVaults({ page: currentPage });
    const { data: items, ...pagination } = res?.data ?? {};
    setVaults(items ?? []);
    setPaginationData(pagination);
    return items ?? [];
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
        has_transactions: !!bag.has_transactions,
      }));

      setBags(existingBags);
      setRackErrors({});
      setDeleteErrors([]);
      setEditingVaultId(vaultData.id || null);
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
    const currentBags = bagsRef.current;
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

    const maxRacks = data.total_racks ? parseInt(data.total_racks, 10) : null;
    const isTotalRacksEmpty = !maxRacks || maxRacks <= 0;

    const processedBags = currentBags.map((bag) => ({
      ...bag,
      rack_number: isTotalRacksEmpty ? "1" : (bag.rack_number || "").trim(),
    }));

    const newRackErrors = {};
    const seenRacks = new Map();

    processedBags.forEach((bag) => {
      const rackStr = (bag.rack_number || "").trim();
      if (!rackStr) { newRackErrors[bag.id] = "Rack number is required"; return; }
      const rackNum = parseInt(rackStr, 10);
      if (maxRacks !== null && !isTotalRacksEmpty && rackNum > maxRacks) {
        newRackErrors[bag.id] = `Cannot exceed ${maxRacks}`; return;
      }
      if (!isTotalRacksEmpty) {
        if (seenRacks.has(rackNum)) {
          newRackErrors[bag.id] = `Rack ${rackNum} is already used`;
          newRackErrors[seenRacks.get(rackNum)] = `Rack ${rackNum} is already used`;
        } else {
          seenRacks.set(rackNum, bag.id);
        }
      }
    });

    if (Object.keys(newRackErrors).length > 0) {
      setRackErrors(newRackErrors);
      addToast({ type: "error", message: "Please fix rack number errors before submitting." });
      return;
    }
    if (Object.keys(rackErrors).length > 0) {
      addToast({ type: "error", message: "Please fix rack number errors before submitting." });
      return;
    }

    setIsLoading(true);

    const validBags = processedBags.map((b) => ({
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
      bags: validBags,
      bag_limit: data.bag_limit ? Number(data.bag_limit) : null,
    };

    if (isEditMode && editingVaultDisplayId) payload.vault_code = editingVaultDisplayId;

    try {
      if (isEditMode && editingVaultId) {
        const res = await UpdateVault(editingVaultId, payload);
        if (res?.errors?.length > 0) {
          setDeleteErrors(res.errors);
          await fetchVaultData();
          return;
        }
        addToast({ type: "success", message: "Vault updated successfully." });
      } else {
        const res = await CreateVault(payload);
        if (!res?.success) {
          addToast({ type: "error", message: res?.message });
          setIsLoading(false);
          return;
        }
        if (res?.errors) {
          Object.keys(res.errors).forEach((field) => {
            setError(field, { type: "server", message: res.errors[field][0] });
          });
          setIsLoading(false);
          return;
        }
        const createdCode = String(generatedVaultCode);
        setIsLoading(false);
        handleCloseModal();
        const refreshedVaults = await fetchVaultData();
        const canSeeVault = refreshedVaults.some((v) => String(v.vault_code) === createdCode);
        if (canSeeVault) {
          addToast({ type: "success", message: "Vault created successfully." });
        } else {
          addToast({ type: "info", message: "Vault created. Please wait for admin to enable your access." });
        }
        return;
      }

      setIsLoading(false);
      handleCloseModal();
      await fetchVaultData();
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

  const handlePageChange = (page) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("page", page.toString());
      return p;
    });
  };

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
      await fetchVaultData();
    } catch (error) {
      console.error("Failed to delete vault:", error);
      toast.error(error?.response?.data?.message || "Failed to delete vault.");
    } finally {
      setIsApiDeleting(false);
      setDeletingVaultId(null);
    }
  };

  // ── Default vault handler ─────────────────────────────────────────────────────
  const handleSetDefaultVault = async (vaultId) => {
    const isAlreadyDefault = defaultVault === vaultId;
    const newValue = isAlreadyDefault ? null : vaultId;
    setSavingDefaultVaultId(vaultId);
    try {
      await MakeDefaultVault(user?.id, { default_vault_id: newValue });
      setDefaultVault(newValue);
      dispatch(fetchAuthUser());
      addToast({ type: "success", message: isAlreadyDefault ? "Default vault removed." : "Default vault updated." });
    } catch {
      addToast({ type: "error", message: "Failed to update default vault." });
    } finally {
      setSavingDefaultVaultId(null);
    }
  };

  // ── Threshold modal handlers ──────────────────────────────────────────────────
  const handleOpenThreshold = (vault) => {
    setThresholdModalVault(vault);
    setThresholdMin(vault.bag_min_bal_limit ?? "");
    setThresholdMax(vault.bag_balance_limit ?? "");
    setThresholdModalOpen(true);
  };

  const handleSaveThreshold = async () => {
    if (!thresholdModalVault) return;
    setIsSavingThreshold(true);
    try {
      await UpdateVault(thresholdModalVault.id, {
        bag_min_bal_limit: thresholdMin === "" ? null : parseFloat(thresholdMin),
        bag_balance_limit: thresholdMax === "" ? null : parseFloat(thresholdMax),
      });
      addToast({ type: "success", message: `Thresholds updated for "${thresholdModalVault.name}".` });
      setThresholdModalOpen(false);
      await fetchVaultData();
    } catch {
      addToast({ type: "error", message: "Failed to save thresholds." });
    } finally {
      setIsSavingThreshold(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-16px)] flex flex-col min-h-0">
      <div className="mb-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 bg-[#1a2b4b] rounded-full" />
          <div>
            <h1 className="xl:text-2xl font-black text-[#1a2b4b] uppercase">Vault Management</h1>
            <p className="text-[8px] xl:text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">Vault Management</p>
          </div>
        </div>
        {(isSuperAdmin || hasPermission("vault.create")) && (
          <button
            onClick={() => {
              setIsEditMode(false);
              setIsOpenModal(true);
              setBags([]);
              setRackErrors([]);
              setDeleteErrors([]);
              reset({ name: "", vault_code: "", bag_limit: "", address: "", total_racks: "" });
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1a73e8] text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all"
          >
            <Plus className="w-5 h-5" /> Create Vault
          </button>
        )}
      </div>

      <VaultCardList
        vaults={vaults}
        paginationData={paginationData}
        changePage={handlePageChange}
        onOpenDrawer={openVaultDrawer}
        onEdit={openEditModal}
        onDelete={handleDeleteSubmit}
        onRequestCashIn={handleRequestCashIn}
        canRequestCashIn={canRequestCashIn}
        canEdit={isSuperAdmin || hasPermission("vault.edit")}
        canDelete={isSuperAdmin || hasPermission("vault.delete")}
        isApiDeleting={isApiDeleting}
        defaultVaultId={defaultVault}
        onSetDefault={handleSetDefaultVault}
        savingDefaultVaultId={savingDefaultVaultId}
        onOpenThreshold={handleOpenThreshold}
        canEditThreshold={isSuperAdmin || hasPermission("vault.edit")}
      />

      {/* ── Threshold Modal ── */}
      {thresholdModalOpen && thresholdModalVault && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Vault Thresholds</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{thresholdModalVault.name}</p>
              </div>
              <button
                onClick={() => setThresholdModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Default vault card */}
            {/*<button
              onClick={() => handleSetDefaultVault(thresholdModalVault.id)}
              disabled={savingDefaultVaultId === thresholdModalVault.id}
              className={`w-full mb-5 p-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer ${
                defaultVault === thresholdModalVault.id
                  ? "border-[#1a73e8] bg-blue-50/60"
                  : "border-slate-200 bg-slate-50 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    defaultVault === thresholdModalVault.id ? "bg-[#1a73e8] text-white" : "bg-white border border-slate-200 text-slate-400"
                  }`}>
                    {savingDefaultVaultId === thresholdModalVault.id
                      ? <Loader2 size={16} className="animate-spin" />
                      : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                    }
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${defaultVault === thresholdModalVault.id ? "text-[#1a73e8]" : "text-slate-700"}`}>Default Vault</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {defaultVault === thresholdModalVault.id ? "This is your default vault" : "Set as default for transactions"}
                    </p>
                  </div>
                </div>
                <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                  defaultVault === thresholdModalVault.id ? "bg-[#1a73e8]" : "bg-slate-200"
                }`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
                    defaultVault === thresholdModalVault.id ? "left-6" : "left-1"
                  }`} />
                </div>
              </div>
            </button>*/}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Min Amount (৳)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">৳</span>
                  <input
                    type="number"
                    value={thresholdMin}
                    onChange={(e) => setThresholdMin(e.target.value)}
                    placeholder="Not Set (0)"
                    className="w-full pl-7 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/10 outline-none text-sm font-mono font-bold transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Max Amount (৳)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">৳</span>
                  <input
                    type="number"
                    value={thresholdMax}
                    onChange={(e) => setThresholdMax(e.target.value)}
                    placeholder="Max Amount"
                    className="w-full pl-7 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/10 outline-none text-sm font-mono font-bold transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setThresholdModalOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveThreshold}
                disabled={isSavingThreshold}
                className="flex-1 py-2.5 bg-[#1a73e8] hover:bg-blue-600 disabled:bg-gray-300 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition"
              >
                {isSavingThreshold ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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
          canCreateBag={canCreateBagForVault(isEditMode ? editingVaultId : null)}
          setRackErrors={setRackErrors}
          rackErrors={rackErrors}
          removeBag={removeBag}
          watchedBagLimit={watchedBagLimit}
          isLoading={isLoading}
          watchedTotalRacks={watchedTotalRacks}
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
      />
    </div>
  );
};

export default Vault;
