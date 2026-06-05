import { AlertTriangle, Loader2, ArrowRight } from "lucide-react";
import CustomModal from "../global/modal/CustomModal";

const UserMigrationModal = ({
  isOpen,
  onClose,
  userName,
  pendingResponsibilities = [],
  availableUsers = [],
  selectedTargetUser,
  setSelectedTargetUser,
  onExecuteMigration,
  isMigrating,
}) => {
  return (
    <CustomModal
      isOpen={isOpen}
      isCloseModal={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight">Accountability Handoff</h3>
            <p className="text-[11px] text-slate-400">Migrate active operational assignments</p>
          </div>
        </div>
      }
    >
      {/* Form Content */}
      <div className=" space-y-4 flex-1">
        <p className="text-xs text-gray-600 leading-relaxed">
          <strong>{userName}</strong> is registered to active workflows. Transfer these pending verifications or approvals to an eligible staff member to safely
          complete the archiving block:
        </p>

        {/* Task Checklist Items */}
        {pendingResponsibilities.length > 0 ? (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2 scrollbar-thin">
            {pendingResponsibilities.map((task, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-[11px] font-mono text-slate-600 bg-white border border-slate-200/60 px-3 py-2 rounded-lg shadow-2xs"
              >
                <span className="font-bold text-slate-700">{task.type}</span>
                <span className="bg-amber-50 text-amber-800 border border-amber-200/60 px-2 py-0.5 rounded text-[10px] font-sans font-black tracking-wide">
                  {task.id}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-4 text-xs bg-emerald-50/50 text-emerald-600 border border-emerald-100 rounded-xl font-semibold">
            ✓ This profile has zero outstanding authorization blocks. You may proceed directly to permanent archive.
          </div>
        )}

        {/* Target Selection Dropdown */}
        {pendingResponsibilities.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">Assign Target Successor</label>
            <select
              value={selectedTargetUser}
              onChange={(e) => setSelectedTargetUser(e.target.value)}
              className="w-full bg-white border border-gray-200 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition appearance-none cursor-pointer"
            >
              <option value="">-- Choose Target User --</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-5 py-3.5 flex items-center justify-end gap-2.5">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 rounded-xl text-xs font-bold transition active:scale-98"
        >
          Cancel
        </button>

        {pendingResponsibilities.length > 0 && (
          <button
            onClick={onExecuteMigration}
            disabled={isMigrating || !selectedTargetUser}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold tracking-wide transition shadow-sm active:scale-98"
          >
            {isMigrating ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <>
                Execute Migration
                <ArrowRight size={12} />
              </>
            )}
          </button>
        )}
      </div>
    </CustomModal>
  );
};

export default UserMigrationModal;
