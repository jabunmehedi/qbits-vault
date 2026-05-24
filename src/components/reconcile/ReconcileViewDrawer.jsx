import { useEffect, useState } from "react";
import Drawer from "../global/drawer/Drawer";
import { CompleteReconciliation, EndReconciliation, StartReconciliation, ViewReconcile } from "../../services/Reconcile";
import { useToast } from "../../hooks/useToast";
import { useSelector } from "react-redux";
import { selectAuthUser } from "../../store/authSlice";
import dayjs from "dayjs";

const ReconcileViewDrawer = ({ isOpen, onClose, reconcileId, reconcileTranId, refetch }) => {
  const [currentStep, setCurrentStep] = useState("intro"); // "intro" or "counting"
  const [racks, setRacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submittingRackId, setSubmittingRackId] = useState(null);
  const [validateBy, setValidateBy] = useState({ amount: true, weight: false });
  const [reconcileVerified, setReconcileVerified] = useState();
  const [reconclieStatus, setReconcileStatus] = useState();
  const [targetVaultId, setTargetVaultId] = useState(null);
  const [scheduledTimestamp, setScheduledTimestamp] = useState(null); // Stores combined YYYY-MM-DD HH:mm:ss string

  // Track racks that have temporary local notes filled out
  const [rackNotes, setRackNotes] = useState({});
  // Track racks that have been successfully saved/submitted to the API
  const [submittedRacks, setSubmittedRacks] = useState({});

  // Modal State for Note
  const [noteModal, setNoteModal] = useState({ isOpen: false, rackIndex: null, noteText: "", isReadOnly: false });

  const user = useSelector(selectAuthUser);
  const { addToast } = useToast();

  // --- DYNAMIC SECURITY ROLE BALANCING ENGINE ---
  const isSuperAdmin = user?.roles?.some((role) => role.id === 1 || role.name === "super-admin");

  // 1. Audit Initiator Check (Step 1: Start Audit Button Visibility)
  const canStartAudit = () => {
    if (isSuperAdmin) return true;
    if (!targetVaultId || !user?.vault_assignments) return false;

    const activeAssignment = user.vault_assignments.find((assign) => Number(assign.vault_id) === Number(targetVaultId) && assign.status === "active");
    return activeAssignment?.roles?.some((roleId) => Number(roleId) === 8) || false;
  };

  // Determine the live scheduling status window of the audit task
  const getScheduleStatus = () => {
    if (!scheduledTimestamp) return "pending";

    const now = dayjs();
    const targetSchedule = dayjs(scheduledTimestamp);
    const hoursDifference = now.diff(targetSchedule, "hour", true); // Positive means target is in the past

    if (hoursDifference > 6) {
      return "expired"; // 6 hours or more past the scheduled timeline
    } else if (hoursDifference >= 0) {
      return "active"; // Current time is past schedule, but within the 6-hour window
    } else {
      return "pending"; // Future schedule time not reached yet
    }
  };

  // 2. Auditor Check (Step 2: Bag Data Inputs and Save Submission Capabilities)
  const canPerformCounting = () => {
    if (isSuperAdmin) return true;
    if (!targetVaultId || !user?.vault_assignments) return false;

    const activeAssignment = user.vault_assignments.find((assign) => Number(assign.vault_id) === Number(targetVaultId) && assign.status === "active");
    return activeAssignment?.roles?.some((roleId) => Number(roleId) === 2) || false;
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

      if (varianceBagInfo) {
        initialAmount = varianceBagInfo.current_amount !== undefined ? Number(varianceBagInfo.current_amount) : initialAmount;

        if (varianceBagInfo?.pivot?.note) {
          acc[rackNum].savedNote = varianceBagInfo.pivot.note;
        }
      }

      acc[rackNum].bags.push({
        id: bag?.id,
        bagNo: bag?.barcode || "N/A",
        expectedAmount: Number(bag?.current_amount) || 0,
        expectedWeight: 0.5,
        amount: initialAmount,
        weight: bag?.user_weight !== undefined && bag?.user_weight !== null ? bag.user_weight : "",
      });

      return acc;
    }, {});

    return Object.values(rackGroups).sort((a, b) => a.title.localeCompare(b.title));
  };

  const determineSubmittedRacks = (vaultBags, varianceBags) => {
    const initialSubmitted = {};
    const verifiedRacks = new Set((varianceBags || []).map((bag) => String(bag.rack_number)));
    const verifiedBagIds = new Set((varianceBags || []).map((bag) => bag.id));

    vaultBags.forEach((bag) => {
      const rackId = `rack-${bag.rack_number}`;
      if (verifiedRacks.has(String(bag.rack_number)) || verifiedBagIds.has(bag.id) || bag?.is_processed || bag?.status === "reconciled") {
        initialSubmitted[rackId] = true;
      }
    });

    return initialSubmitted;
  };

  useEffect(() => {
    if (reconcileId && isOpen) {
      setLoading(true);
      ViewReconcile(reconcileId)
        .then((res) => {
          if (res?.data?.status === "pending") {
            setCurrentStep("intro");
          } else {
            setCurrentStep("counting");
          }
          setReconcileVerified(res?.data?.verifier_status);
          setReconcileStatus(res?.data?.status);
          setTargetVaultId(res?.data?.vault_id);

          // Extract and combine schedule dates and times
          const datePart = res?.data?.from_date ? res.data.from_date.split("T")[0] : null;
          const timePart = res?.data?.audit_time || "00:00:00";
          if (datePart) {
            setScheduledTimestamp(`${datePart} ${timePart}`);
          }

          const bagsArray = res?.data?.vault?.bags || [];
          const varianceBagsArray = res?.data?.variance_bags || [];

          setRacks(parseBackendBags(bagsArray, varianceBagsArray));
          setSubmittedRacks(determineSubmittedRacks(bagsArray, varianceBagsArray));
        })
        .catch((err) => console.error("Error loading reconciliation details:", err))
        .finally(() => setLoading(false));
    }
  }, [reconcileId, isOpen]);

  const handleInputChange = (rackIndex, bagIndex, field, value) => {
    const updatedRacks = [...racks];
    const bag = updatedRacks[rackIndex].bags[bagIndex];

    bag[field] = value === "" ? "" : Number(value);
    setRacks(updatedRacks);

    const rackId = updatedRacks[rackIndex].id;
    if (submittedRacks[rackId]) {
      setSubmittedRacks((prev) => ({ ...prev, [rackId]: false }));
    }
  };

  const isBagMismatched = (bag) => {
    const amountVal = bag.amount === "" ? 0 : Number(bag.amount);
    const weightVal = bag.weight === "" ? 0 : Number(bag.weight);

    const amountMismatch = validateBy.amount && amountVal !== bag.expectedAmount;
    const weightMismatch = validateBy.weight && weightVal !== bag.expectedWeight;
    return amountMismatch || weightMismatch;
  };

  const isAllBagsTypedInRack = (rack) => {
    return rack.bags.every((bag) => {
      const isAmountFilled = !validateBy.amount || bag.amount !== "";
      const isWeightFilled = !validateBy.weight || bag.weight !== "";
      return isAmountFilled && isWeightFilled;
    });
  };

  const checkIfRackHasMismatch = (rack) => {
    return rack.bags.some((bag) => isBagMismatched(bag));
  };

  const getValidatedCount = (rack) => {
    const validCount = rack.bags.filter((bag) => !isBagMismatched(bag)).length;
    return `${validCount}/${rack.bags.length} Validated`;
  };

  const isAuditReadyForFinalSubmit = () => {
    if (racks.length === 0) return false;
    return racks.every((rack) => submittedRacks[rack.id] === true && reconcileVerified === "verified");
  };

  const openNoteModal = (rackIndex) => {
    const targetRack = racks[rackIndex];
    const isSubmitted = submittedRacks[targetRack.id];
    const noteContent = isSubmitted ? targetRack.savedNote || "" : rackNotes[targetRack.id] || "";

    setNoteModal({
      isOpen: true,
      rackIndex,
      noteText: noteContent,
      isReadOnly: !!isSubmitted,
    });
  };

  const saveNoteForRack = () => {
    const targetRack = racks[noteModal.rackIndex];
    setRackNotes((prev) => ({
      ...prev,
      [targetRack.id]: noteModal.noteText,
    }));
    setNoteModal({ isOpen: false, rackIndex: null, noteText: "", isReadOnly: false });
  };

  const submitRackDataToApi = (rackIndex) => {
    const targetRack = racks[rackIndex];
    const finalNote = rackNotes[targetRack.id] || "";
    setSubmittingRackId(targetRack.id);

    const payload = {
      rack_number: targetRack.rack_number,
      variances_bags: targetRack.bags.map((bag) => ({
        bag_id: bag.id,
        counted_amount: bag.amount === "" ? 0 : bag.amount,
        expected_amount: bag.expectedAmount,
        note: isBagMismatched(bag) ? finalNote : "",
      })),
    };

    CompleteReconciliation(reconcileId, payload)
      .then((res) => {
        return ViewReconcile(reconcileId);
      })
      .then((refreshRes) => {
        const bagsArray = refreshRes?.data?.vault?.bags || [];
        const varianceBagsArray = refreshRes?.data?.variance_bags || [];

        setRacks(parseBackendBags(bagsArray, varianceBagsArray));
        const freshSubmittedState = determineSubmittedRacks(bagsArray, varianceBagsArray);

        setSubmittedRacks((prev) => ({
          ...prev,
          ...freshSubmittedState,
          [targetRack.id]: true,
        }));
      })
      .catch((err) => console.error("Error executing component sync loop:", err))
      .finally(() => setSubmittingRackId(null));
  };

  const handleFinalSubmit = async () => {
    try {
      await EndReconciliation(reconcileId);
      addToast({ message: "Reconciliation completed successfully", type: "success" });
      onClose();
    } catch (error) {
      console.log(error);
    }
  };

  const handleStartAuditSession = () => {
    setCurrentStep("counting");
    StartReconciliation(reconcileId).then((res) => {
      refetch();
      console.log("Session initialization details:", res);
    });
  };

  const scheduleStatus = getScheduleStatus();

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-xl"
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

                {/* Controls enabled/disabled based on time execution check values */}
                {canStartAudit() ? (
                  <button
                    disabled={scheduleStatus !== "active"}
                    onClick={handleStartAuditSession}
                    className={`font-medium py-2.5 px-6 rounded-lg transition-all ${
                      scheduleStatus === "active"
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-md"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300"
                    }`}
                  >
                    {scheduleStatus === "active" && "Start Audit Session"}
                    {scheduleStatus === "pending" && "Locking Until Scheduled Time"}
                    {scheduleStatus === "expired" && "Audit Window Expired"}
                  </button>
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

                  {!canPerformCounting() && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl p-3.5 font-medium">
                      🔒 Read-Only Mode: You don't have Auditor permissions assigned to this specific vault location.
                    </div>
                  )}

                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-center space-x-6">
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
                  </div>

                  {racks.map((rack, rackIndex) => {
                    const allBagsTyped = isAllBagsTypedInRack(rack);
                    const hasMismatch = checkIfRackHasMismatch(rack);
                    const hasNoteSaved = !!rackNotes[rack.id];
                    const isRackSubmitted = submittedRacks[rack.id];
                    const isCurrentlyLoading = submittingRackId === rack.id;

                    return (
                      <div
                        key={rack.id}
                        className={`border border-gray-100 rounded-xl ${isRackSubmitted ? "bg-gray-50/50 opacity-75" : "bg-white"} overflow-hidden`}
                      >
                        <div className="bg-gray-50/50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-xs font-semibold text-slate-600 tracking-wide">{rack.title}</span>
                            <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">{getValidatedCount(rack)}</span>
                          </div>

                          <div className="flex items-center space-x-2">
                            {isCurrentlyLoading && <span className="text-xs text-gray-400 animate-pulse">Saving...</span>}

                            {!isCurrentlyLoading && isRackSubmitted && (
                              <div className="flex items-center space-x-2">
                                {rack.savedNote && (
                                  <button
                                    onClick={() => openNoteModal(rackIndex)}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-semibold py-1 px-2.5 rounded transition-colors cursor-pointer mr-1"
                                  >
                                    📝 View Note
                                  </button>
                                )}
                                <span className="text-xs font-semibold text-green-600 flex items-center space-x-1">✅ Done Reconciled</span>
                              </div>
                            )}

                            {!isCurrentlyLoading && !isRackSubmitted && allBagsTyped && canPerformCounting() && (
                              <>
                                {hasMismatch && !hasNoteSaved && (
                                  <button
                                    onClick={() => openNoteModal(rackIndex)}
                                    className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                                  >
                                    Add Note
                                  </button>
                                )}

                                {hasMismatch && hasNoteSaved && (
                                  <button
                                    onClick={() => submitRackDataToApi(rackIndex)}
                                    className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                                  >
                                    Confirm & Done
                                  </button>
                                )}

                                {!hasMismatch && (
                                  <button
                                    onClick={() => submitRackDataToApi(rackIndex)}
                                    className="bg-green-500 hover:bg-green-700 text-white text-xs font-semibold py-1.5 px-3 rounded-full transition-colors cursor-pointer"
                                  >
                                    Done
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="p-4 space-y-4">
                          {rack.bags.map((bag, bagIndex) => {
                            const amountError = allBagsTyped && validateBy.amount && bag.amount !== bag.expectedAmount;
                            const weightError = allBagsTyped && validateBy.weight && bag.weight !== bag.expectedWeight;

                            return (
                              <div key={bag.id} className="grid grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Bag No</label>
                                  <input
                                    type="text"
                                    value={bag.bagNo}
                                    disabled
                                    className="w-full bg-gray-50 border border-gray-200 text-gray-500 text-sm rounded-lg p-2 font-medium truncate"
                                  />
                                </div>

                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount</label>
                                    <span className="text-[10px] font-bold text-blue-500">exp: {bag.expectedAmount}</span>
                                  </div>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={bag.amount}
                                    disabled={isRackSubmitted || !canPerformCounting()}
                                    onChange={(e) => handleInputChange(rackIndex, bagIndex, "amount", e.target.value)}
                                    className={`w-full border text-gray-700 text-sm rounded-lg p-2 font-medium focus:ring-1 outline-none ${
                                      isRackSubmitted || !canPerformCounting()
                                        ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                                        : amountError
                                          ? "border-red-500 focus:border-red-600 focus:ring-red-200 bg-red-50/10 text-red-600"
                                          : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-200"
                                    }`}
                                  />
                                </div>

                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Weight</label>
                                    <span className="text-[10px] font-bold text-blue-500">exp: {bag.expectedWeight}</span>
                                  </div>
                                  <input
                                    type="number"
                                    step="0.1"
                                    placeholder="0.0"
                                    value={bag.weight}
                                    disabled={isRackSubmitted || !canPerformCounting()}
                                    onChange={(e) => handleInputChange(rackIndex, bagIndex, "weight", e.target.value)}
                                    className={`w-full border text-gray-700 text-sm rounded-lg p-2 font-medium outline-none focus:ring-1 ${
                                      isRackSubmitted || !canPerformCounting()
                                        ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                                        : weightError
                                          ? "border-red-500 focus:border-red-600 focus:ring-red-200 bg-red-50/10 text-red-600"
                                          : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-200"
                                    }`}
                                  />
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
                  <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 flex space-x-3 z-10">
                    <button
                      onClick={onClose}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-2.5 px-4 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={!isAuditReadyForFinalSubmit() || !canPerformCounting()}
                      onClick={handleFinalSubmit}
                      className={`flex-1 font-medium py-2.5 px-4 rounded-lg transition-all ${
                        isAuditReadyForFinalSubmit() && canPerformCounting()
                          ? "bg-green-600 hover:bg-green-700 text-white shadow-md cursor-pointer"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      Submit Audit Reconcile
                    </button>
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
                onClick={() => setNoteModal({ isOpen: false, rackIndex: null, noteText: "", isReadOnly: false })}
                className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>

              {!noteModal.isReadOnly && (
                <button
                  onClick={saveNoteForRack}
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
    </Drawer>
  );
};

export default ReconcileViewDrawer;
