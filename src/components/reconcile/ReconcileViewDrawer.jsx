import { useEffect, useMemo, useRef, useState } from "react";
import Drawer from "../global/drawer/Drawer";
import AppButton from "../global/AppButton";
import Can from "../global/can/Can";
import SettleVarianceModal from "../reports/SettleVarianceModal";
import { CompleteReconciliation, EndReconciliation, RejectReconcile, StartReconciliation, VerifyReconcile, ViewReconcile } from "../../services/Reconcile";
import { useToast } from "../../hooks/useToast";
import { useSelector } from "react-redux";
import { selectAuthUser, selectIsSuperAdmin } from "../../store/authSlice";
import dayjs from "dayjs";
import { QrCode, CheckCircle2, Wallet } from "lucide-react";
import VerifyButton from "../verifyButton/VerifyButton";
import ReconclieDetails from "./ReconclieDetails";

// Hardware barcode scanners emit their characters as a very fast keystroke burst
// (typically a few ms apart). A human typing on a keyboard can't keep gaps this
// small, so any inter-keystroke gap above this threshold marks the entry as manual.
const SCAN_MAX_GAP_MS = 50;
const SCAN_MIN_LENGTH = 4;

const ReconcileViewDrawer = ({ isOpen, onClose, reconcileId, reconcileTranId, refetch }) => {
  const [currentStep, setCurrentStep] = useState("intro");
  const [racks, setRacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submittingBagId, setSubmittingBagId] = useState(null);
  // eslint-disable-next-line no-unused-vars -- setter used by the Validate By toggle, currently commented out
  const [validateBy, setValidateBy] = useState({ amount: true /*, weight: false */ });
  const [reconcileVerified, setReconcileVerified] = useState();
  const [canSubmitFromApi, setCanSubmitFromApi] = useState(false);
  const [reconclieStatus, setReconcileStatus] = useState();
  const [targetVaultId, setTargetVaultId] = useState(null);
  const [scheduledTimestamp, setScheduledTimestamp] = useState(null);
  const [, setIsAllowedToEnd] = useState(false);
  const [bagNotes, setBagNotes] = useState({});
  const [submittedBags, setSubmittedBags] = useState({});
  const [noteModal, setNoteModal] = useState({ isOpen: false, rackIndex: null, bagIndex: null, noteText: "", isReadOnly: false });
  const [bagScanInputs, setBagScanInputs] = useState({});
  const [reconcileData, setReconcileData] = useState(null);
  const [requiredReconcilers, setRequiredReconcilers] = useState([]);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [forceSubmitModal, setForceSubmitModal] = useState({ isOpen: false, note: "" });
  const [forceSubmitLoading, setForceSubmitLoading] = useState(false);
  const [settleBagId, setSettleBagId] = useState(null);
  // Read-only view of a bag's settlement note (amount + when + note).
  const [settleNoteView, setSettleNoteView] = useState(null);

  // Guards the one-time auto-submit of empty (expected 0) bags per reconcile load.
  const zeroBagsAutoSubmitRef = useRef(false);

  // Per-bag keystroke timing used to tell a hardware scan from manual typing.
  // bagId -> { lastTs, maxGap, count }
  const scanTimingRef = useRef({});

  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const user = useSelector(selectAuthUser);
  const { addToast } = useToast();

  // Per-bag variance + settled amount, so a completed reconcile can expose a Settle
  // action on the bags that are still short/over.
  const varianceByBag = useMemo(() => {
    const map = {};
    (reconcileData?.variance_bags || []).forEach((b) => {
      map[Number(b.id)] = {
        difference: Number(b?.pivot?.difference || 0),
        settled: Number(b?.pivot?.settled_amount || 0),
        note: (b?.pivot?.settlement_note || "").trim(),
        settledAt: b?.pivot?.settled_at || null,
      };
    });
    return map;
  }, [reconcileData]);

  const bagOutstanding = (bagId) => {
    const v = varianceByBag[Number(bagId)];
    if (!v) return 0;
    return Math.max(Math.round((Math.abs(v.difference) - v.settled) * 100) / 100, 0);
  };

  // 1. Audit Initiator Check (Step 1: Start Audit Button Visibility)
  const canStartAudit = () => {
    if (isSuperAdmin) return true;
    if (!targetVaultId || !user?.vault_assignments) return false;

    const activeAssignment = user.vault_assignments.find((assign) => Number(assign.vault_id) === Number(targetVaultId) && assign.status === "active");

    const auditInitiatorRoleId = user?.roles?.find((role) => role?.name?.toLowerCase() == "audit initiator")?.id;

    return activeAssignment?.roles?.some((roleId) => Number(roleId) === auditInitiatorRoleId) || false;
  };

  // Determine the live scheduling status window of the audit task
  const getScheduleStatus = () => {
    if (!scheduledTimestamp) return "pending";

    const now = dayjs();
    const targetSchedule = dayjs(scheduledTimestamp);
    const hoursDifference = now.diff(targetSchedule, "hour", true);

    if (hoursDifference > 6) {
      return "expired";
    } else if (hoursDifference >= 0) {
      return "active";
    } else {
      return "pending";
    }
  };

  // 2. Auditor / Reconciler Check (Step 2: Bag Data Inputs and Save Submission Capabilities)
  const canPerformCounting = () => {
    // Once the scheduled audit window has expired, counting is locked for everyone
    // — the only remaining action is the initiator's force-submit with a note.
    if (getScheduleStatus() === "expired") return false;
    if (isSuperAdmin) return true;
    if (!targetVaultId || !user?.vault_assignments) return false;

    const activeAssignment = user.vault_assignments.find((assign) => Number(assign.vault_id) === Number(targetVaultId) && assign.status === "active");
    const countingRoleIds = (user?.roles || [])
      .filter((role) => ["auditor", "reconciler"].includes(role?.name?.toLowerCase()))
      .map((role) => Number(role.id));

    return activeAssignment?.roles?.some((roleId) => countingRoleIds.includes(Number(roleId))) || false;
  };

  // Helper function to process backend bags array into state format
  const parseBackendBags = (bagsArray, varianceBagsArray = []) => {
    const varianceMap = new Map((varianceBagsArray || []).map((vBag) => [vBag.id, vBag]));

    const rackGroups = bagsArray.reduce((acc, bag) => {
      const rackNum = bag?.rack_number || "Unknown";
      if (!acc[rackNum]) {
        acc[rackNum] = {
          id: `rack-${rackNum}`,
          rack_number: rackNum,
          title: `RACK ${rackNum} - ENTRY`,
          savedNote: "",
          bags: [],
        };
      }

      const varianceBagInfo = varianceMap.get(bag.id);
      let initialAmount = bag?.user_amount !== undefined && bag?.user_amount !== null ? bag.user_amount : "";
      let savedNote = "";

      if (varianceBagInfo) {
        const savedCountedAmount =
          varianceBagInfo?.pivot?.counted_amount ??
          varianceBagInfo?.pivot?.user_amount ??
          varianceBagInfo?.pivot?.amount ??
          varianceBagInfo?.counted_amount ??
          varianceBagInfo?.user_amount;

        if (savedCountedAmount !== undefined && savedCountedAmount !== null) {
          initialAmount = Number(savedCountedAmount);
        } else if (varianceBagInfo?.pivot?.difference !== undefined && varianceBagInfo?.current_amount !== undefined) {
          initialAmount = Number(varianceBagInfo.current_amount) - Number(varianceBagInfo.pivot.difference || 0);
        }

        if (varianceBagInfo?.pivot?.note) {
          savedNote = varianceBagInfo.pivot.note;
        }
      }

      const expectedAmount = Number(bag?.current_amount) || 0;

      // Empty bags (e.g. fully cashed out → 0) auto-count as 0 so the auditor
      // never has to type 0 manually; the field stays editable if needed.
      if (initialAmount === "" && expectedAmount === 0) {
        initialAmount = 0;
      }

      acc[rackNum].bags.push({
        id: bag?.id,
        bagNo: bag?.barcode || "N/A",
        tranId: bag?.last_cash_in_tran_id || "",
        expectedAmount,
        // expectedWeight: 0.5,
        amount: initialAmount,
        savedNote,
        // weight: bag?.user_weight !== undefined && bag?.user_weight !== null ? bag.user_weight : "",
      });

      return acc;
    }, {});

    return Object.values(rackGroups).sort((a, b) => a.title.localeCompare(b.title));
  };

  const determineSubmittedBags = (vaultBags, varianceBags) => {
    const initialSubmitted = {};
    const verifiedBagIds = new Set((varianceBags || []).map((bag) => bag.id));

    vaultBags.forEach((bag) => {
      if (verifiedBagIds.has(bag.id) || bag?.is_processed || bag?.status === "reconciled") {
        initialSubmitted[bag.id] = true;
      }
    });

    return initialSubmitted;
  };


  useEffect(() => {
    if (reconcileId && isOpen) {
      zeroBagsAutoSubmitRef.current = false;
      setLoading(true);
      ViewReconcile(reconcileId)
        .then((res) => {
          if (res?.data?.status === "pending") {
            setCurrentStep("intro");
          } else {
            setCurrentStep("counting");
          }
          setReconcileVerified(res?.data?.verifier_status);
          setCanSubmitFromApi(res?.data?.can_submit ?? false);
          setReconcileStatus(res?.data?.status);
          setTargetVaultId(res?.data?.vault_id);
          setReconcileData(res?.data || null);
          setRequiredReconcilers(res?.data?.required_reconcilers || []);

          if (res?.data?.started_by === user?.id) {
            setIsAllowedToEnd(true);
          }

          // Extract and combine schedule dates and times
          const datePart = res?.data?.from_date ? res.data.from_date.split("T")[0] : null;
          const timePart = res?.data?.audit_time || "00:00:00";
          if (datePart) {
            setScheduledTimestamp(`${datePart} ${timePart}`);
          }

          const bagsArray = res?.data?.vault?.bags || [];
          const varianceBagsArray = res?.data?.variance_bags || [];

          const parsedRacks = parseBackendBags(bagsArray, varianceBagsArray);
          const submitted = determineSubmittedBags(bagsArray, varianceBagsArray);
          setRacks(parsedRacks);
          setSubmittedBags(submitted);

          // Restore the scanned value for already-done bags so it stays visible
          // after the drawer is closed and reopened.
          const restoredScans = {};
          parsedRacks.forEach((rack) =>
            rack.bags.forEach((bag) => {
              if (submitted[bag.id]) {
                restoredScans[bag.id] = { value: bag.tranId || bag.bagNo || "", status: "success" };
              }
            })
          );
          setBagScanInputs(restoredScans);
        })
        .catch((err) => console.error("Error loading reconciliation details:", err))
        .finally(() => setLoading(false));
    }
  }, [reconcileId, isOpen, user?.id]);

  // Auto-complete empty bags (expected 0, counted 0): nothing to count, so they
  // are submitted as done without the auditor clicking Done.
  useEffect(() => {
    if (currentStep !== "counting" || racks.length === 0 || !canPerformCounting() || zeroBagsAutoSubmitRef.current) return;

    const byRack = {};
    racks.forEach((rack) => {
      rack.bags.forEach((bag) => {
        const counted = bag.amount === "" ? 0 : Number(bag.amount);
        if (bag.expectedAmount === 0 && counted === 0 && !submittedBags[bag.id]) {
          (byRack[rack.rack_number] ||= []).push(bag);
        }
      });
    });

    const rackNumbers = Object.keys(byRack);
    if (rackNumbers.length === 0) return;

    zeroBagsAutoSubmitRef.current = true;

    (async () => {
      try {
        for (const rackNumber of rackNumbers) {
          await CompleteReconciliation(reconcileId, {
            rack_number: rackNumber,
            variances_bags: byRack[rackNumber].map((bag) => ({
              bag_id: bag.id,
              counted_amount: 0,
              expected_amount: bag.expectedAmount,
              note: "",
            })),
          });
        }

        const refreshRes = await ViewReconcile(reconcileId);
        const bagsArray = refreshRes?.data?.vault?.bags || [];
        const varianceBagsArray = refreshRes?.data?.variance_bags || [];
        setReconcileData(refreshRes?.data || null);
        setRacks(parseBackendBags(bagsArray, varianceBagsArray));
        setSubmittedBags((prev) => {
          const next = { ...prev, ...determineSubmittedBags(bagsArray, varianceBagsArray) };
          rackNumbers.forEach((rn) => byRack[rn].forEach((bag) => (next[bag.id] = true)));
          return next;
        });
        refetch?.();
      } catch (err) {
        console.error("Auto-submit of empty bags failed:", err);
        zeroBagsAutoSubmitRef.current = false; // allow a retry on next render
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per load when counting starts; guarded by zeroBagsAutoSubmitRef
  }, [currentStep, racks, targetVaultId]);

  const handleInputChange = (rackIndex, bagIndex, field, value) => {
    const updatedRacks = [...racks];
    const bag = updatedRacks[rackIndex].bags[bagIndex];

    bag[field] = value === "" ? "" : Number(value);
    setRacks(updatedRacks);

    if (submittedBags[bag.id]) {
      setSubmittedBags((prev) => ({ ...prev, [bag.id]: false }));
    }
  };

  const normalizeScanValue = (value) => String(value || "").trim().toLowerCase();

  // ── Scanner-only input ──
  // The scan field's value is fully owned here: native typing and paste are blocked
  // in the input, and only characters that arrive as a fast scanner burst are
  // appended to the buffer. A slow (human) gap discards whatever was buffered, so
  // manual typing can never build up a usable value.
  const resetScanTiming = (bagId) => {
    delete scanTimingRef.current[bagId];
  };

  // Fed one character at a time from the scan field's keydown.
  const feedScanChar = (bagId, char) => {
    const now = performance.now();
    const entry = scanTimingRef.current[bagId] || { lastTs: null, chars: [] };
    if (entry.lastTs !== null && now - entry.lastTs > SCAN_MAX_GAP_MS) {
      entry.chars = []; // gap too slow for a scanner — drop the stale buffer
    }
    entry.chars.push(char);
    entry.lastTs = now;
    scanTimingRef.current[bagId] = entry;

    // Only surface the value once it's a confirmed fast burst (SCAN_MIN_LENGTH chars).
    // Anything shorter can't be a real scanner output, so the field stays blank.
    if (entry.chars.length >= SCAN_MIN_LENGTH) {
      setBagScanInputs((prev) => ({ ...prev, [bagId]: { value: entry.chars.join(""), status: null } }));
    }
  };

  // Clear the field at the start of a fresh capture so manual keystrokes can't
  // linger and each scan begins from blank.
  const startScanCapture = (bagId) => {
    resetScanTiming(bagId);
    setBagScanInputs((prev) => ({ ...prev, [bagId]: { value: "", status: null } }));
  };

  // A buffer only ever holds one uninterrupted fast burst, so a sufficient length
  // confirms it came from a scanner rather than manual typing.
  const isLikelyScan = (bagId) => {
    const entry = scanTimingRef.current[bagId];
    return !!entry && entry.chars.length >= SCAN_MIN_LENGTH;
  };

  const handleBagScanSubmit = (rackIndex, bagIndex) => {
    const rack = racks[rackIndex];
    const bag = rack.bags[bagIndex];
    const rawValue = bagScanInputs[bag.id]?.value || "";
    const scannedCode = normalizeScanValue(rawValue);

    if (!scannedCode || !canPerformCounting() || submittedBags[bag.id]) return;

    // Reject anything that wasn't produced by a hardware scan — manual typing or
    // paste. The field is cleared so the user has to scan the bag for real.
    if (!isLikelyScan(bag.id)) {
      setBagScanInputs((prev) => ({ ...prev, [bag.id]: { value: "", status: "manual" } }));
      resetScanTiming(bag.id);
      return;
    }

    // The bag must be complete before a scan is accepted: amount entered, and if
    // it's a variance, a note added. The scanned value is kept visible either way
    // so it's clear the scan was captured — only the submit is held back.
    if (!isBagAmountEntered(bag)) {
      setBagScanInputs((prev) => ({ ...prev, [bag.id]: { value: "", status: "no-amount" } }));
      resetScanTiming(bag.id);
      return;
    }
    if (isBagMismatched(bag) && !bagNotes[bag.id]) {
      setBagScanInputs((prev) => ({ ...prev, [bag.id]: { value: "", status: "no-note" } }));
      resetScanTiming(bag.id);
      return;
    }

    // Bag is ready — confirm the barcode and auto-submit on a match.
    // QR encodes the cash-in transaction id; fall back to the bag barcode for manual entry.
    const matchesScan = normalizeScanValue(bag.tranId) === scannedCode || normalizeScanValue(bag.bagNo) === scannedCode;

    if (matchesScan) {
      setBagScanInputs((prev) => ({ ...prev, [bag.id]: { value: rawValue, status: "success" } }));
      submitBagToApi(rackIndex, bagIndex);
    } else {
      setBagScanInputs((prev) => ({ ...prev, [bag.id]: { value: rawValue, status: "error" } }));
    }
  };

  const isBagMismatched = (bag) => {
    const amountVal = bag.amount === "" ? 0 : Number(bag.amount);
    // Compare to 2-decimal precision so an exactly-equal amount is never flagged
    // as a variance due to floating-point/string differences.
    const amountMismatch = validateBy.amount && Math.round(amountVal * 100) !== Math.round((Number(bag.expectedAmount) || 0) * 100);
    return amountMismatch;
  };

  // A bag is "done-able" once its amount is entered and, if it mismatches the
  // expected balance, a discrepancy note has been saved for it.
  const isBagAmountEntered = (bag) => !validateBy.amount || bag.amount !== "";

  // eslint-disable-next-line no-unused-vars -- used by the per-bag Done button, currently commented out
  const isBagReadyToDone = (bag) => {
    if (!isBagAmountEntered(bag)) return false;
    if (isBagMismatched(bag)) return !!bagNotes[bag.id];
    return true;
  };

  const getValidatedCount = (rack) => {
    const doneCount = rack.bags.filter((bag) => submittedBags[bag.id]).length;
    return `${doneCount}/${rack.bags.length} Done`;
  };

  const isRackFullyDone = (rack) => rack.bags.every((bag) => submittedBags[bag.id]);

  const openNoteModal = (rackIndex, bagIndex) => {
    const targetBag = racks[rackIndex].bags[bagIndex];
    const isSubmitted = submittedBags[targetBag.id];
    const noteContent = isSubmitted ? targetBag.savedNote || "" : bagNotes[targetBag.id] || "";

    setNoteModal({
      isOpen: true,
      rackIndex,
      bagIndex,
      noteText: noteContent,
      isReadOnly: !!isSubmitted,
    });
  };

  const saveNoteForBag = () => {
    const targetBag = racks[noteModal.rackIndex].bags[noteModal.bagIndex];
    setBagNotes((prev) => ({
      ...prev,
      [targetBag.id]: noteModal.noteText,
    }));
    setNoteModal({ isOpen: false, rackIndex: null, bagIndex: null, noteText: "", isReadOnly: false });
  };

  const submitBagToApi = (rackIndex, bagIndex, countedAmountOverride) => {
    const targetRack = racks[rackIndex];
    const bag = targetRack.bags[bagIndex];
    setSubmittingBagId(bag.id);

    // On auto-submit (scan) the freshly scanned amount is passed in, since the
    // racks state update from handleInputChange hasn't been applied yet.
    const countedAmount = countedAmountOverride !== undefined ? countedAmountOverride : bag.amount === "" ? 0 : bag.amount;
    const mismatch = validateBy.amount && Number(countedAmount) !== Number(bag.expectedAmount);

    const payload = {
      rack_number: targetRack.rack_number,
      variances_bags: [
        {
          bag_id: bag.id,
          counted_amount: countedAmount,
          expected_amount: bag.expectedAmount,
          note: mismatch ? bagNotes[bag.id] || "" : "",
        },
      ],
    };

    CompleteReconciliation(reconcileId, payload)
      .then((saveRes) => {
        // Don't mark the bag done if the save failed — otherwise the audit could
        // be finalized with bags that were never recorded (counted/variance wrong).
        if (saveRes && saveRes.success === false) {
          addToast({ type: "error", message: saveRes.message || "Failed to save bag. Please try again." });
          return null;
        }
        return ViewReconcile(reconcileId);
      })
      .then((refreshRes) => {
        if (!refreshRes) return;
        const bagsArray = refreshRes?.data?.vault?.bags || [];
        const varianceBagsArray = refreshRes?.data?.variance_bags || [];

        setRacks(parseBackendBags(bagsArray, varianceBagsArray));
        const freshSubmittedState = determineSubmittedBags(bagsArray, varianceBagsArray);

        setSubmittedBags((prev) => ({
          ...prev,
          ...freshSubmittedState,
          [bag.id]: true,
        }));

        // Keep verify-gating state fresh so the Verify button can surface as soon
        // as the last bag is done — without needing to reopen the drawer.
        setReconcileVerified(refreshRes?.data?.verifier_status);
        setReconcileStatus(refreshRes?.data?.status);
        setCanSubmitFromApi(refreshRes?.data?.can_submit ?? false);
        setRequiredReconcilers(refreshRes?.data?.required_reconcilers || []);
        // Keep the full reconcile snapshot fresh too so the verify modal
        // (ReconclieDetails) shows the live counted_balance without a reload.
        setReconcileData(refreshRes?.data || null);
        refetch?.();
      })
      .catch((err) => console.error("Error executing component sync loop:", err))
      .finally(() => setSubmittingBagId(null));
  };

  const handleFinalSubmit = async () => {
    try {
      await EndReconciliation(reconcileId);
      addToast({ message: "Reconciliation completed successfully", type: "success" });
      refetch?.();
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  // Force-submit with a mandatory note (initiator override after window expiry).
  const handleForceSubmit = async () => {
    const note = forceSubmitModal.note.trim();
    if (!note) return;
    setForceSubmitLoading(true);
    try {
      const res = await EndReconciliation(reconcileId, note);
      if (res && res.success === false) {
        addToast({ message: res.message || "Failed to submit reconciliation", type: "error" });
        return;
      }
      addToast({ message: "Reconciliation submitted successfully", type: "success" });
      refetch?.();
      onClose();
    } catch (error) {
      console.error("Failed to force-submit reconciliation:", error);
    } finally {
      setForceSubmitLoading(false);
      setForceSubmitModal({ isOpen: false, note: "" });
    }
  };

  const handleStartAuditSession = async () => {
    setIsAllowedToEnd(true);
    // Await start so the backend status is "counting" before the auto-submit
    // useEffect fires — otherwise CompleteReconciliation runs against a "pending"
    // reconcile and is silently rejected.
    await StartReconciliation(reconcileId);
    setCurrentStep("counting");
    refetch();
  };

  // Re-pull verifier-related state after a verify/reject action.
  const refreshVerifierState = async () => {
    const res = await ViewReconcile(reconcileId);
    if (!res?.data) return;

    setReconcileVerified(res.data.verifier_status);
    setCanSubmitFromApi(res.data.can_submit ?? false);
    setReconcileStatus(res.data.status);
    setReconcileData(res.data);
    setRequiredReconcilers(res.data.required_reconcilers || []);

    // Re-derive end permission: started_by may have been set after this drawer
    // first loaded (e.g. the user started the audit in this same session).
    if (res.data.started_by === user?.id) {
      setIsAllowedToEnd(true);
    }

    // Also refresh bags/submitted state so the final-submit gate re-evaluates
    // consistently right after verify (otherwise it can stay disabled until the
    // drawer is reopened).
    const bagsArray = res.data.vault?.bags || [];
    const varianceBagsArray = res.data.variance_bags || [];
    setRacks(parseBackendBags(bagsArray, varianceBagsArray));
    setSubmittedBags((prev) => ({ ...prev, ...determineSubmittedBags(bagsArray, varianceBagsArray) }));
  };

  const handleVerify = async () => {
    setVerifyLoading(true);
    try {
      const res = await VerifyReconcile(reconcileId);
      if (!res?.success) {
        addToast({ message: res?.message || "Failed to verify reconciliation", type: "error" });
        return;
      }
      await refreshVerifierState();
      addToast({ message: "Reconcile verified successfully", type: "success" });
      refetch?.();
    } catch (err) {
      console.error("Failed to verify Reconcile:", err);
    } finally {
      setVerifyLoading(false);
      setVerifyOpen(false);
    }
  };

  // After a reject the backend wipes the counted values, so the auditor must
  // re-count from scratch. Unlike refreshVerifierState (which merges), this fully
  // REPLACES the working state so old "Done" bags/scans/notes don't linger.
  const reloadAfterReject = async () => {
    const res = await ViewReconcile(reconcileId);
    if (!res?.data) return;

    setReconcileVerified(res.data.verifier_status);
    setCanSubmitFromApi(res.data.can_submit ?? false);
    setReconcileStatus(res.data.status);
    setReconcileData(res.data);
    setRequiredReconcilers(res.data.required_reconcilers || []);

    const bagsArray = res.data.vault?.bags || [];
    const varianceBagsArray = res.data.variance_bags || [];
    zeroBagsAutoSubmitRef.current = false;
    setRacks(parseBackendBags(bagsArray, varianceBagsArray));
    setSubmittedBags(determineSubmittedBags(bagsArray, varianceBagsArray));
    setBagScanInputs({});
    setBagNotes({});
    setCurrentStep(res.data.status === "pending" ? "intro" : "counting");
  };

  const handleReject = async (note) => {
    setVerifyLoading(true);
    try {
      const res = await RejectReconcile(reconcileId, note, "verifier");
      if (!res?.success) {
        addToast({ message: res?.message || "Failed to reject reconciliation", type: "error" });
        return;
      }
      await reloadAfterReject();
      addToast({ message: "Reconciliation rejected. Auditor must re-count.", type: "success" });
      refetch?.();
    } catch (err) {
      console.error("Failed to reject reconciliation:", err);
    } finally {
      setVerifyLoading(false);
      setVerifyOpen(false);
    }
  };

  const scheduleStatus = getScheduleStatus();

  const allBagsDone = racks.length > 0 && racks.every((rack) => rack.bags.every((bag) => submittedBags[bag.id]));
  const currentUserId = Number(user?.id);

  // Only reconcilers verify a reconciliation. Whether the user holds the reconciler
  // role for this vault (mirrors canPerformCounting). Used as a fallback so a
  // legitimate reconciler still sees the button even if the backend hasn't yet
  // snapshotted them into required_reconcilers — the verify endpoint re-syncs and
  // accepts them on click.
  const isReconcilerByRole = (() => {
    if (!targetVaultId || !user?.vault_assignments) return false;
    const activeAssignment = user.vault_assignments.find((assign) => Number(assign.vault_id) === Number(targetVaultId) && assign.status === "active");
    const reconcilerRoleId = user?.roles?.find((role) => role?.name?.toLowerCase() === "reconciler")?.id;
    return activeAssignment?.roles?.some((roleId) => Number(roleId) === reconcilerRoleId) || false;
  })();

  const hasCurrentUserVerified = requiredReconcilers.some((v) => Number(v.user_id) === currentUserId && !!v.verified);
  const isInRequiredReconcilers = requiredReconcilers.some((v) => Number(v.user_id) === currentUserId);
  // The current user is a pending reconciler when they haven't verified yet and
  // are either already in the required list or hold the reconciler role here.
  const isPendingReconciler = !hasCurrentUserVerified && (isInRequiredReconcilers || isReconcilerByRole);
  const canShowVerifyButton =
    isPendingReconciler && allBagsDone && reconcileVerified !== "verified" && reconcileVerified !== "rejected";

  const canEndAudit = (() => {
    if (isSuperAdmin) return true;
    if (!targetVaultId || !user?.vault_assignments) return false;
    const activeAssignment = user.vault_assignments.find((assign) => Number(assign.vault_id) === Number(targetVaultId) && assign.status === "active");
    const auditInitiatorRoleId = user?.roles?.find((role) => role?.name?.toLowerCase() === "audit initiator")?.id;
    return activeAssignment?.roles?.some((roleId) => Number(roleId) === auditInitiatorRoleId) || false;
  })();
  const canSubmitReconcileButton = canEndAudit && allBagsDone && (canSubmitFromApi || reconcileVerified === "verified");

  // Initiator/super-admin override: once the scheduled audit window has expired,
  // they can force-submit the in-progress reconcile with a mandatory note,
  // bypassing the verification workflow entirely.
  const canForceSubmit = canEndAudit && reconclieStatus === "counting" && scheduleStatus === "expired";

  return (
    <>
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl"
      title={
        <div className="flex flex-col">
          <span className="text-black">Audit Process</span>
          <span className="text-gray-400 text-sm">ID: {reconcileTranId}</span>
        </div>
      }
    >
      <div className="p-6 max-w-2xl mx-auto h-[calc(100vh-100px)] relative flex flex-col justify-between">
        {loading ? (
          <div className="flex items-center justify-center my-auto py-12 flex-1">
            <span className="text-sm font-medium text-gray-400 animate-pulse">Loading vault logs details...</span>
          </div>
        ) : (
          <>
            {/* --- STEP 1: INITIAL INTRODUCTION VIEW --- */}
            {currentStep === "intro" && (
              <div className="flex flex-col items-center justify-center text-center space-y-6 py-2 flex-1">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold">📋</div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Ready to start audit?</h2>
                  <p className="text-sm text-gray-400 mt-1">Vault reconciliation expects specific totals for verification.</p>

                  {scheduledTimestamp && (
                    <div className="mt-3">
                      {scheduleStatus === "pending" && (
                        <p className="text-xs text-orange-500 font-semibold bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100 inline-block">
                          🕒 Scheduled for: {dayjs(scheduledTimestamp).format("DD MMM YYYY [at] hh:mm A")}
                        </p>
                      )}
                      {scheduleStatus === "active" && (
                        <p className="text-xs text-green-600 font-semibold bg-green-50 px-3 py-1.5 rounded-full border border-green-100 inline-block">
                          🟢 Window open until: {dayjs(scheduledTimestamp).add(6, "hour").format("hh:mm A")}
                        </p>
                      )}
                      {scheduleStatus === "expired" && (
                        <p className="text-xs text-red-500 font-semibold bg-red-50 px-3 py-1.5 rounded-full border border-red-100 inline-block">
                          🛑 Expired: Scheduled session window closed (+6hrs passed)
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* ── CHANGED: Added loading check condition for targetVaultId ── */}
                {targetVaultId === null ? (
                  <div className="text-xs font-medium text-gray-400 animate-pulse bg-gray-50 px-4 py-2.5 rounded-lg border border-gray-100">
                    Authenticating vault security metrics...
                  </div>
                ) : canStartAudit() ? (
                  <AppButton
                    disabled={scheduleStatus !== "active"}
                    onClick={handleStartAuditSession}
                    variant={scheduleStatus === "active" ? "primary" : "secondary"}
                  >
                    {scheduleStatus === "active" && "Start Audit Session"}
                    {scheduleStatus === "pending" && "Locking Until Scheduled Time"}
                    {scheduleStatus === "expired" && "Audit Window Expired"}
                  </AppButton>
                ) : (
                  <div className="text-xs font-semibold bg-red-50 text-red-500 px-4 py-2.5 rounded-lg border border-red-100">
                    ⚠️ Only authorized Audit Initiators can begin sessions for this vault.
                  </div>
                )}
              </div>
            )}

            {/* --- STEP 2: ACTIVE UI COUNTING VIEW --- */}
            {currentStep === "counting" && (
              <div className="relative flex flex-col h-full w-full overflow-hidden">
                <div className="space-y-6 overflow-y-auto pr-1 flex-1 pb-32 invisible-scrollbar">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-700">Rack Wise Bag Entry</h2>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-600 uppercase rounded tracking-wider">Active Counting</span>
                  </div>

                  {!canPerformCounting() && scheduleStatus !== "expired" && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl p-3.5 font-medium">
                      🔒 Read-Only Mode: You don&apos;t have Auditor permissions assigned to this specific vault location.
                    </div>
                  )}

                  {scheduleStatus === "expired" && reconclieStatus !== "completed" && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-3.5 font-medium">
                      🛑 Audit window expired — the scheduled session closed (+6hrs passed).
                      {canForceSubmit && " You can submit this reconciliation with a note, bypassing verification."}
                    </div>
                  )}

                  {reconclieStatus === "completed" && reconcileData?.notes && (
                    <div className="bg-orange-50 border border-orange-200 text-orange-700 text-xs rounded-xl p-3.5 font-medium">
                      <span className="font-bold uppercase tracking-wider block text-[10px] text-orange-500 mb-1">Submission Note</span>
                      {reconcileData.notes}
                    </div>
                  )}

                  {/*<div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-center space-x-6">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Validate By:</span>
                    <label className="flex items-center space-x-2 text-sm text-gray-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!canPerformCounting()}
                        checked={validateBy.amount}
                        onChange={(e) => setValidateBy({ ...validateBy, amount: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 disabled:opacity-50"
                      />
                      <span>Amount</span>
                    </label>
                    { Weight validation temporarily disabled
                    <label className="flex items-center space-x-2 text-sm text-gray-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!canPerformCounting()}
                        checked={validateBy.weight}
                        onChange={(e) => setValidateBy({ ...validateBy, weight: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 disabled:opacity-50"
                      />
                      <span>Weight</span>
                    </label>
                    }
                  </div>*/}

                  {racks.map((rack, rackIndex) => {
                    const rackDone = isRackFullyDone(rack);

                    return (
                      <div
                        key={rack.id}
                        className={`border border-gray-100 rounded-xl ${rackDone ? "bg-gray-50/50" : "bg-white"} overflow-hidden`}
                      >
                        <div className="bg-gray-50/50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-xs font-semibold text-slate-600 tracking-wide">{rack.title}</span>
                            <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">{getValidatedCount(rack)}</span>
                          </div>

                          {rackDone && <span className="text-xs font-semibold text-green-600 flex items-center space-x-1">✅ Rack Reconciled</span>}
                        </div>

                        <div className="p-4 space-y-5">
                          {rack.bags.filter((bag) => bag.expectedAmount !== 0).map((bag, bagIndex) => {
                            const isBagSubmitted = submittedBags[bag.id];
                            const isBagSaving = submittingBagId === bag.id;
                            const amountEntered = bag.amount !== "";
                            const amountError = amountEntered && validateBy.amount && bag.amount !== bag.expectedAmount;
                            const mismatch = isBagMismatched(bag);
                            const hasNoteSaved = !!bagNotes[bag.id];
                            const scanState = bagScanInputs[bag.id];

                            return (
                              <div key={bag.id} className={`space-y-2 ${isBagSubmitted ? "opacity-75" : ""}`}>
                                <div className="grid grid-cols-3 gap-3">
                                  {/* Bag No */}
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Bag No</label>
                                    <div className="w-full bg-gray-50 border border-gray-200 text-gray-500 text-sm rounded-lg p-2 font-medium truncate">
                                      {bag.bagNo}
                                    </div>
                                  </div>

                                  {/* Amount */}
                                  <div>
                                    <div className="flex justify-between items-center mb-1">
                                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount</label>
                                      <span className="text-[10px] font-bold text-blue-500">expected: {bag.expectedAmount}</span>
                                    </div>
                                    <input
                                      type="number"
                                      placeholder="0"
                                      value={bag.amount}
                                      disabled={isBagSubmitted || !canPerformCounting()}
                                      onChange={(e) => handleInputChange(rackIndex, bagIndex, "amount", e.target.value)}
                                      className={`w-full border text-gray-700 text-sm rounded-lg p-2 font-medium focus:ring-1 outline-none ${
                                        isBagSubmitted || !canPerformCounting()
                                          ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                                          : amountError
                                            ? "border-red-500 focus:border-red-600 focus:ring-red-200 bg-red-50/10 text-red-600"
                                            : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-200"
                                      }`}
                                    />
                                  </div>

                                  {/* Scan */}
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Scan</label>
                                    <div className="relative">
                                      <input
                                        type="text"
                                        placeholder="Scan Barcode..."
                                        value={scanState?.value || ""}
                                        disabled={isBagSubmitted || !canPerformCounting()}
                                        onFocus={() => startScanCapture(bag.id)}
                                        onPaste={(e) => e.preventDefault()}
                                        onChange={() => {}}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleBagScanSubmit(rackIndex, bagIndex);
                                            return;
                                          }
                                          // Block native typing: every printable character is captured and
                                          // routed through the burst-timing buffer instead. Manual (slow)
                                          // keystrokes get discarded, so only a real scan fills the field.
                                          if (e.key.length === 1) {
                                            e.preventDefault();
                                            feedScanChar(bag.id, e.key);
                                          }
                                        }}
                                        className={`w-full border rounded-lg pl-2 pr-9 py-2 text-sm font-mono text-slate-700 outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-400 ${
                                          scanState?.status === "error" || scanState?.status === "manual"
                                            ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                                            : scanState?.status === "no-amount" || scanState?.status === "no-note"
                                              ? "border-amber-400 focus:border-amber-500 focus:ring-amber-100"
                                              : scanState?.status === "success"
                                                ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-100"
                                                : "border-slate-200 focus:border-[#1a73e8] focus:ring-blue-100"
                                        }`}
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
                                        <QrCode size={16} />
                                      </span>
                                    </div>
                                    {/* Validation feedback sits below the input */}
                                    <div className="min-h-[14px] mt-1">
                                      {scanState?.status === "success" && <span className="text-[10px] font-bold text-emerald-600">✓ Scanned</span>}
                                      {scanState?.status === "error" && <span className="text-[10px] font-bold text-red-500">No match</span>}
                                      {scanState?.status === "no-amount" && <span className="text-[10px] font-bold text-amber-500">Enter amount first</span>}
                                      {scanState?.status === "no-note" && <span className="text-[10px] font-bold text-amber-500">Add note first</span>}
                                      {scanState?.status === "manual" && <span className="text-[10px] font-bold text-red-500">Use scanner — manual entry blocked</span>}
                                    </div>
                                  </div>
                                </div>

                                {/* Per-bag actions: Note + Done */}
                                <div className="flex items-center justify-end gap-2 min-h-[28px]">
                                  {isBagSaving ? (
                                    <span className="text-xs text-gray-400 animate-pulse">Saving...</span>
                                  ) : isBagSubmitted ? (
                                    <>
                                      {bag.savedNote && (
                                        <button
                                          onClick={() => openNoteModal(rackIndex, bagIndex)}
                                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-semibold py-1 px-2.5 rounded transition-colors cursor-pointer"
                                        >
                                          📝 View Note
                                        </button>
                                      )}
                                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                                        <CheckCircle2 size={16} /> Done
                                      </span>
                                      {reconclieStatus === "completed" && varianceByBag[bag.id]?.note && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setSettleNoteView({
                                              note: varianceByBag[bag.id].note,
                                              amount: varianceByBag[bag.id].settled,
                                              at: varianceByBag[bag.id].settledAt,
                                            })
                                          }
                                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 border border-amber-200 bg-amber-50 rounded px-2.5 py-1 hover:border-amber-500 transition cursor-pointer"
                                        >
                                          📝 Settle note
                                        </button>
                                      )}
                                      {reconclieStatus === "completed" && bagOutstanding(bag.id) > 0 && (
                                        <Can perform="reconciliation.settle">
                                          <button
                                            type="button"
                                            onClick={() => setSettleBagId(bag.id)}
                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 border border-amber-200 bg-amber-50 rounded px-2.5 py-1 hover:border-amber-500 transition cursor-pointer"
                                          >
                                            <Wallet size={12} /> Settle variance
                                          </button>
                                        </Can>
                                      )}
                                    </>
                                  ) : (
                                    canPerformCounting() && (
                                      <>
                                        <button
                                          onClick={() => openNoteModal(rackIndex, bagIndex)}
                                          disabled={!amountEntered || !mismatch}
                                          className={`text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors ${
                                            !amountEntered || !mismatch
                                              ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                                              : hasNoteSaved
                                                ? "bg-orange-100 text-orange-600 hover:bg-orange-200 cursor-pointer"
                                                : "bg-orange-500 text-white hover:bg-orange-600 cursor-pointer"
                                          }`}
                                        >
                                          {hasNoteSaved ? "Edit Note" : "Note"}
                                        </button>
                                        {/* Done button commented out for now — bags are completed via barcode scan.
                                        <button
                                          onClick={() => submitBagToApi(rackIndex, bagIndex)}
                                          disabled={!isBagReadyToDone(bag)}
                                          className={`text-xs font-semibold py-1.5 px-4 rounded-lg transition-colors ${
                                            isBagReadyToDone(bag) ? "bg-green-600 text-white hover:bg-green-700 cursor-pointer" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                          }`}
                                        >
                                          Done
                                        </button>
                                        */}
                                      </>
                                    )
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {reconclieStatus === "completed" ? (
                  <div className="absolute bottom-0 left-0 justify-center right-0 bg-green-50 border-t border-green-100 p-4 flex space-x-3 z-10">
                    <p className="text-green-600 font-semibold text-center text-sm">Reconciliation completed successfully</p>
                  </div>
                ) : (
                  <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex items-center gap-3 z-10">
                    <button
                      onClick={onClose}
                      className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-600 hover:text-red-400 hover:bg-gray-50 font-bold text-sm rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>

                    {canForceSubmit ? (
                      <button
                        onClick={() => setForceSubmitModal({ isOpen: true, note: "" })}
                        className="flex-1 py-2.5 px-4 font-bold text-sm rounded-xl transition-all bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-200 cursor-pointer"
                      >
                        Submit with Note
                      </button>
                    ) : (
                      <>
                        {/* Verify and Submit can appear together: a reconciler who is
                            also the audit initiator verifies, then submits. Once every
                            reconciler has verified, the Verify button drops away and the
                            read-only view is all that remains for non-submitters. */}
                        {canShowVerifyButton && (
                          <VerifyButton
                            handleSubmit={handleVerify}
                            handleReject={handleReject}
                            isOpen={verifyOpen}
                            isLoading={verifyLoading}
                            setOpen={setVerifyOpen}
                            className="max-w-xl"
                            wrapperClassName="flex-1"
                            triggerClassName="w-full py-2.5 px-4 text-sm"
                            title="Verify"
                            rejectTitle="Reject this reconciliation?"
                          >
                            <ReconclieDetails reconcile={reconcileData} />
                          </VerifyButton>
                        )}

                        {canEndAudit && (
                          <button
                            disabled={!canSubmitReconcileButton}
                            onClick={handleFinalSubmit}
                            className={`flex-1 py-2.5 px-4 font-bold text-sm rounded-xl transition-all ${
                              canSubmitReconcileButton
                                ? "bg-[#1a73e8] hover:bg-blue-600 text-white shadow-lg shadow-blue-200 cursor-pointer"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            }`}
                          >
                            Submit Audit Reconcile
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {noteModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 mx-4">
            <div>
              <h3 className="text-base font-bold text-gray-800">{noteModal.isReadOnly ? "Discrepancy Note Details" : "Add Discrepancy Note"}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {noteModal.isReadOnly
                  ? "This is the saved administrative reason for the expected bag differences."
                  : "Please provide an administrative reason why the expected bag balances do not match physical counts."}
              </p>
            </div>
            <textarea
              rows={4}
              value={noteModal.noteText}
              disabled={noteModal.isReadOnly}
              onChange={(e) => !noteModal.isReadOnly && setNoteModal({ ...noteModal, noteText: e.target.value })}
              placeholder="No notes were provided regarding this mismatch discrepancy..."
              className={`w-full border rounded-lg p-3 text-sm outline-none resize-none font-medium ${
                noteModal.isReadOnly
                  ? "bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed"
                  : "border-gray-200 text-gray-700 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
              }`}
            />
            <div className="flex space-x-3 justify-end text-sm font-medium">
              <button
                onClick={() => setNoteModal({ isOpen: false, rackIndex: null, bagIndex: null, noteText: "", isReadOnly: false })}
                className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>

              {!noteModal.isReadOnly && (
                <button
                  onClick={saveNoteForBag}
                  disabled={!noteModal.noteText.trim()}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    noteModal.noteText.trim() ? "bg-orange-500 hover:bg-orange-600 text-white cursor-pointer" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Submit Note
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {forceSubmitModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 mx-4">
            <div>
              <h3 className="text-base font-bold text-gray-800">Submit Reconciliation with Note</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                The scheduled audit window has expired. Provide a reason to submit this reconciliation now — this will complete it without the verification workflow.
              </p>
            </div>
            <textarea
              rows={4}
              value={forceSubmitModal.note}
              onChange={(e) => setForceSubmitModal({ ...forceSubmitModal, note: e.target.value })}
              placeholder="Explain why this reconciliation is being submitted without verification..."
              className="w-full border border-gray-200 text-gray-700 rounded-lg p-3 text-sm outline-none resize-none font-medium focus:ring-2 focus:ring-orange-100 focus:border-orange-500"
            />
            <div className="flex space-x-3 justify-end text-sm font-medium">
              <button
                onClick={() => setForceSubmitModal({ isOpen: false, note: "" })}
                className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleForceSubmit}
                disabled={!forceSubmitModal.note.trim() || forceSubmitLoading}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  forceSubmitModal.note.trim() && !forceSubmitLoading
                    ? "bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                {forceSubmitLoading ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
      {settleNoteView && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 mx-4">
            <div>
              <h3 className="text-base font-bold text-gray-800">Settlement Note</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Settled ৳{Number(settleNoteView.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                {settleNoteView.at ? ` · ${dayjs(settleNoteView.at).format("DD MMM YYYY, h:mm A")}` : ""}
              </p>
            </div>
            <div className="w-full border border-gray-200 bg-gray-50 rounded-lg p-3 text-sm text-gray-700 font-medium whitespace-pre-wrap break-words">
              {settleNoteView.note}
            </div>
            <div className="flex justify-end text-sm font-medium">
              <button
                onClick={() => setSettleNoteView(null)}
                className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Drawer>

    {settleBagId && (
      <SettleVarianceModal
        reconciliationId={reconcileId}
        bagId={settleBagId}
        onClose={() => setSettleBagId(null)}
        onSettled={() => {
          refreshVerifierState();
          refetch?.();
        }}
      />
    )}
    </>
  );
};

export default ReconcileViewDrawer;
