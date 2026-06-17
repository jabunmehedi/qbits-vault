import { useState } from "react";
import { Loader2 } from "lucide-react";
import { FiBox as BoxIcon } from "react-icons/fi";
import CustomModal from "../global/modal/CustomModal";
import { BagCreateRequest } from "../../services/Vault";
import { useToast } from "../../hooks/useToast";

const BagRequestModal = ({ isOpen, onClose, onSuccess, vaultId, vaultName, userId, message }) => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    onSuccess?.();
  };

  const handleRequest = async () => {
    setLoading(true);
    try {
      const res = await BagCreateRequest({
        requester_id: userId,
        vault_id: vaultId,
      });

      if (res?.success === false || res?.status >= 400) {
        addToast({ type: "error", message: res?.message || "Failed to submit request." });
        return;
      }

      setSubmitted(true);
    } catch {
      addToast({ type: "error", message: "Failed to submit bag request." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomModal
      title={
        <div className="flex items-center gap-2">
          <BoxIcon className="text-blue-600" />
          Bag Unavailable
        </div>
      }
      isCloseModal={handleClose}
      className="max-w-md"
    >
      {submitted ? (
        <div className="py-6 text-center space-y-4">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-slate-800 font-bold text-base">Request Submitted</h3>
          <p className="text-slate-500 text-sm">
            Your bag creation request for <span className="font-semibold text-slate-700">{vaultName}</span> has been submitted. The vault admin will be notified.
          </p>
          <button
            onClick={handleClose}
            className="mt-2 w-full py-2.5 bg-[#1a73e8] hover:bg-blue-600 text-white font-bold text-sm rounded-xl transition"
          >
            Close
          </button>
        </div>
      ) : (
        <div className="space-y-5 mt-2">
          <div className="py-4 text-center">
            <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-slate-700 font-semibold text-sm">No bag available</p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
            <p className="font-semibold mb-1">Request a bag to be created</p>
            <p className="text-blue-500 text-xs">
              You don&apos;t have permission to create bags. Submitting this request will notify the vault admin for{" "}
              <span className="font-semibold">{vaultName}</span> to create one.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 hover:text-red-400 hover:bg-gray-50 font-bold text-sm rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleRequest}
              disabled={loading}
              className="flex-1 py-2.5 bg-[#1a73e8] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Request Bag Creation"}
            </button>
          </div>
        </div>
      )}
    </CustomModal>
  );
};

export default BagRequestModal;
