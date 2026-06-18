import { useEffect, useRef, useState } from "react";
import { CreateVault, DeleteVault, GetVault, GetVaults, UpdateVault } from "../../services/Vault";
import { useForm } from "react-hook-form";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useToast } from "../../hooks/useToast";
import { useSearchParams } from "react-router-dom";
import VaultBagDetailsDrawer from "../../components/vaults/VaultBagDetailsDrawer";
import CreateUpdateVault from "../../components/vaults/CreateUpdateVault";
import VaultCardList from "../../components/vaults/VaultCardList";
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
  const canCreateBag = isSuperAdmin || hasRole("bag create");

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
      addToast({ type: "error", message: `Cannot remove "${bag.barcode}" — it holds ৳${amount.toFixed(2)}. Zero the amount first.` });
      return;
    }
    // A bag that has any cash-in/cash-out history must be kept for the audit
    // trail, even once its balance is back to zero.
    if (bag.has_transactions) {
      addToast({ type: "error", message: `Cannot remove "${bag.barcode}" — it has cash-in/cash-out history and can't be deleted.` });
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

    // Determine if total racks is omitted or invalid
    const maxRacks = data.total_racks ? parseInt(data.total_racks, 10) : null;
    const isTotalRacksEmpty = !maxRacks || maxRacks <= 0;

    const processedBags = currentBags.map((bag) => ({
      ...bag,
      rack_number: isTotalRacksEmpty ? "1" : (bag.rack_number || "").trim(),
    }));

    // ── Rack number validation ──────────────────────────────────────
    const newRackErrors = {};
    // Track racks already taken so a number can't be assigned to two bags.
    // Uniqueness only matters when total_racks is set (otherwise every bag is rack "1").
    const seenRacks = new Map();

    processedBags.forEach((bag) => {
      const rackStr = (bag.rack_number || "").trim();

      if (!rackStr) {
        newRackErrors[bag.id] = "Rack number is required";
        return;
      }

      const rackNum = parseInt(rackStr, 10);

      if (maxRacks !== null && !isTotalRacksEmpty && rackNum > maxRacks) {
        newRackErrors[bag.id] = `Cannot exceed ${maxRacks}`;
        return;
      }

      if (!isTotalRacksEmpty) {
        if (seenRacks.has(rackNum)) {
          newRackErrors[bag.id] = `Rack ${rackNum} is already used`;
          // Also flag the first bag that took this rack, so both are visible.
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
            setError(field, {
              type: "server",
              message: res.errors[field][0],
            });
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
      await fetchVaultData(); // Refresh the table list
    } catch (error) {
      console.error("Failed to delete vault:", error);
      toast.error(error?.response?.data?.message || "Failed to delete vault.");
    } finally {
      setIsApiDeleting(false);
      setDeletingVaultId(null);
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
              reset({
                name: "",
                vault_code: "",
                bag_limit: "",
                address: "",
                total_racks: "",
              });
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
        canEdit={isSuperAdmin || hasPermission("vault.edit")}
        canDelete={isSuperAdmin || hasPermission("vault.delete")}
        isApiDeleting={isApiDeleting}
      />

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
          canCreateBag={canCreateBag}
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
