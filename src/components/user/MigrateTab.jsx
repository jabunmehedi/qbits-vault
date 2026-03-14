import { ArrowRightLeft, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { RxAvatar } from "react-icons/rx";
import StatusBadge from "./StatusBadge";

export const MigrateTab = ({ currentUser, users, onMigrate, migrating }) => {
  const [targetUserId, setTargetUserId] = useState("");
  const [search, setSearch] = useState("");

  // Exclude current user from target list
  const eligibleUsers = users.filter((u) => u.id !== currentUser?.data?.id && (!search || u.name.toLowerCase().includes(search.toLowerCase())));

  const targetUser = users.find((u) => u.id === parseInt(targetUserId));

  const pendingVerifications = currentUser?.data?.pending_verifications || [];

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <ArrowRightLeft className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 leading-relaxed">
          Migrating will reassign all pending verifications from <strong>{currentUser?.data?.name}</strong> to the selected user. This action is required before
          deleting the user.
        </p>
      </div>

      {/* Pending verifications count */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
        <span className="text-sm text-gray-600">Pending verifications</span>
        <span className={`text-sm font-semibold ${pendingVerifications.length > 0 ? "text-amber-600" : "text-emerald-600"}`}>
          {pendingVerifications.length}
        </span>
      </div>

      {/* Pending list */}
      {pendingVerifications.length > 0 && (
        <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
          {pendingVerifications.map((v, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-100 rounded-lg text-xs text-gray-600">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              <span className="flex-1 truncate">{v.label || v.description || `Verification #${v.id}`}</span>
              <span className="text-gray-400">{v.type || "—"}</span>
            </div>
          ))}
        </div>
      )}

      {pendingVerifications.length === 0 && (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
            <Check className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-sm text-gray-500">No pending verifications</p>
          <p className="text-xs text-gray-400 mt-1">This user can be safely deleted</p>
        </div>
      )}

      {/* Target user selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Migrate to user</label>
        <input
          type="text"
          placeholder="Search user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-cyan-400 bg-gray-50"
        />
        <div className="max-h-[160px] overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
          {eligibleUsers.length === 0 && <p className="text-center text-sm text-gray-400 py-4">No users found</p>}
          {eligibleUsers.map((u) => (
            <label
              key={u.id}
              className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                targetUserId === String(u.id) ? "bg-cyan-50" : "hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="migrate-target"
                value={u.id}
                checked={targetUserId === String(u.id)}
                onChange={() => setTargetUserId(String(u.id))}
                className="sr-only"
              />
              <div
                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  targetUserId === String(u.id) ? "border-cyan-500" : "border-gray-300"
                }`}
              >
                {targetUserId === String(u.id) && <div className="w-2 h-2 rounded-full bg-cyan-500" />}
              </div>
              <RxAvatar src={u.img} name={u.name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{u.name}</p>
                <p className="text-xs text-gray-400 truncate">{u.email}</p>
              </div>
              <StatusBadge status={u.status} />
            </label>
          ))}
        </div>
      </div>

      {/* Migrate button */}
      <button
        onClick={() => targetUser && onMigrate(targetUser)}
        disabled={!targetUserId || migrating}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
          targetUserId && !migrating ? "bg-cyan-500 hover:bg-cyan-600 text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        {migrating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Migrating...
          </>
        ) : (
          <>
            <ArrowRightLeft className="w-4 h-4" /> Migrate verifications
          </>
        )}
      </button>
    </div>
  );
};
