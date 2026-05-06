import { Loader2 } from "lucide-react";
import CustomModal from "../global/modal/CustomModal";

const ConfirmModal = ({ grandTotal, onCancel, onConfirm, loading, isDepositError, message, onCreate }) => {
  return (
    <CustomModal title="Cash In Deposit" isCloseModal={onCancel} className="max-w-lg">
      {isDepositError ? (
        <div>
          <div className="py-6 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-slate-500 text-sm">{message?.message?.message}</p>
          </div>
          <div className="flex justify-between items-center gap-4 px-4">
            <button
              onClick={onCancel}
              className="flex-1 p-4 rounded-2xl text-sm border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            {message?.errors?.role_status === false ? null : (
              <button
                onClick={onCreate}
                className="p-4 flex-1 rounded-2xl bg-[#1a73e8] shadow-lg shadow-blue-200 hover:bg-blue-600 text-sm font-bold text-white transition-colors"
              >
                {!message?.message?.bag_create_role ? "Request Bag" : "Create Bag"}
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
              className="flex-1 px-4 py-2 rounded-2xl text-sm border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading || grandTotal === 0}
              className="px-4 flex-1 py-2 rounded-2xl bg-[#1a73e8] shadow-lg shadow-blue-200 hover:bg-blue-600 text-sm font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
