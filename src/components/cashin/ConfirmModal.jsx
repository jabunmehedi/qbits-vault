import { Loader2 } from "lucide-react";
import CustomModal from "../global/modal/CustomModal";
import { useState } from "react";

const ConfirmModal = ({ grandTotal, onCancel, onConfirm, loading, isDepositError, message, onBagCreated, totalRacks = 0 }) => {
  const [rackNumber, setRackNumber] = useState("1");
  const [bagLoading, setBagLoading] = useState(false);
  const [bagError, setBagError] = useState("");

  const hasCreatePermission = !!message?.message?.bag_create_role;
  const isBlocked = message?.errors?.role_status === false;

  // Racks only matter when the vault defines total_racks (mirrors the vault modal).
  // When it doesn't, the rack is optional and the backend defaults it to "1".
  const racksEnabled = totalRacks > 0;
  const rackNum = parseInt(rackNumber, 10);
  const rackMissing = racksEnabled && rackNumber.trim() === "";
  const rackOutOfRange = racksEnabled && rackNumber.trim() !== "" && (rackNum < 1 || rackNum > totalRacks);
  const rackError = bagError || (rackOutOfRange ? `Rack number cannot exceed ${totalRacks}` : "");
  const createDisabled = bagLoading || rackMissing || rackOutOfRange;

  const handleCreateBag = async () => {
    setBagError("");
    setBagLoading(true);
    try {
      // Creates the bag and submits the cash-in in one go. On success the parent
      // closes this modal; on failure we surface the reason inline (e.g. rack taken).
      await onBagCreated(racksEnabled ? rackNumber : "1");
    } catch (e) {
      setBagError(e?.message || "Failed to create bag");
    } finally {
      setBagLoading(false);
    }
  };

  return (
    <CustomModal title="Cash In Deposit" isCloseModal={onCancel} className="max-w-2xl">
      {isDepositError ? (
        <div>
          <div className="py-6 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-slate-500 text-sm">{message?.message?.message}</p>
          </div>

          {hasCreatePermission ? (
            <div className="mx-4 mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Create New Bag</p>
              <div>
                <label className="text-xs text-slate-500 font-medium mb-1 block">
                  Rack Number{racksEnabled && <span className="text-slate-400 font-normal"> (1–{totalRacks})</span>}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={racksEnabled ? rackNumber : "1"}
                  disabled={!racksEnabled}
                  onChange={(e) => {
                    setRackNumber(e.target.value.replace(/[^0-9]/g, ""));
                    if (bagError) setBagError("");
                  }}
                  placeholder={racksEnabled ? `1–${totalRacks}` : "1"}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                    !racksEnabled
                      ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed select-none"
                      : rackError
                        ? "border-red-400 focus:ring-red-200"
                        : "border-slate-200 focus:ring-blue-300"
                  }`}
                />
                {racksEnabled && rackError && <p className="text-[11px] text-red-500 font-semibold mt-1">{rackError}</p>}
                {!racksEnabled && bagError && <p className="text-[11px] text-red-500 font-semibold mt-1">{bagError}</p>}
              </div>
              <p className="text-[11px] text-slate-400">A bag will be created and your cash-in submitted in one step.</p>
            </div>
          ) : isBlocked ? (
            <div className="mx-4 mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
              <p className="text-yellow-700 text-sm font-medium">You don&apos;t have permission to create bags. Contact your admin.</p>
            </div>
          ) : null}

          <div className="flex justify-between items-center gap-4 px-4 pb-4">
            <button
              onClick={onCancel}
              disabled={bagLoading}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm border border-gray-200 font-bold text-gray-600 hover:text-red-400 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            {hasCreatePermission && (
              <button
                onClick={handleCreateBag}
                disabled={createDisabled}
                className="py-2.5 px-6 flex-1 whitespace-nowrap rounded-xl bg-[#1a73e8] shadow-lg shadow-blue-200 hover:bg-blue-600 text-sm font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {bagLoading ? <Loader2 className="animate-spin w-4 h-4" /> : "Create Bag & Submit Cash-In"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="py-6 text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-slate-800 font-bold text-lg mb-1">Confirm Submission</h3>
            <p className="text-slate-500 text-sm">
              You are about to submit a cash deposit of{" "}
              <span className="font-bold text-slate-800">৳{grandTotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}</span>
            </p>
          </div>
          <div className="flex justify-between items-center gap-4 px-4">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm border border-gray-200 font-bold text-gray-600 hover:text-red-400 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm()}
              disabled={loading || grandTotal === 0}
              className="px-4 flex-1 py-2.5 rounded-xl bg-[#1a73e8] shadow-lg shadow-blue-200 hover:bg-blue-600 text-sm font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Confirm & Submit"}
            </button>
          </div>
        </div>
      )}
    </CustomModal>
  );
};

export default ConfirmModal;
