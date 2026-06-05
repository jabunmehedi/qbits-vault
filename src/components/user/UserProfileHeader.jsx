import Avatar from "../helpers/Avatar";
import { RiVerifiedBadgeFill } from "react-icons/ri";
import { MapPin, RefreshCw, Loader2, FileText } from "lucide-react";

const UserProfileHeader = ({
  user,
  userId,
  isSuperAdmin,
  isAdmin,
  onShowPreview,
  onShowPasswordModal,
  onDisableUser,
  onFetchMigrationDetails,
  onArchiveUser,
  actionLoading,
  checkingMigration,
  migrationPending,
  archivePending,
  currentAddress,
  permanentAddress
}) => {
  return (
    <div className="flex items-center p-6 justify-between border-b border-gray-50 pb-6">
      <div className="flex items-center gap-4">
        <Avatar src={user?.img} name={user?.name} size="xl" />
        <div className="flex-1">
          <div className="flex items-center mb-2 gap-2">
            <h3 className="text-2xl font-bold text-[#1a2b4b]">{user?.name}</h3>
            <RiVerifiedBadgeFill className={`w-6 h-6 ${user?.verified ? "text-blue-500" : "text-gray-400"}`} />
          </div>
          <p className="text-sm text-gray-400">{user?.email}</p>
          <p className="text-sm text-gray-400">{user?.phone}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 items-end">
        <div className="flex justify-end items-center gap-2">
          <button
            onClick={onShowPreview}
            disabled={!isSuperAdmin && !isAdmin}
            className="flex items-center justify-center gap-2 text-black bg-white border border-gray-300 hover:border-gray-400 py-1.5 px-4 rounded-lg text-sm font-semibold transition disabled:opacity-70"
          >
            <FileText size={14} />
            ID
          </button>

          {isSuperAdmin && (
            <button
              onClick={onShowPasswordModal}
              disabled={!isSuperAdmin && !isAdmin}
              className="flex items-center justify-center gap-2 bg-indigo-500 text-white hover:bg-indigo-600 py-2 px-3 rounded-lg text-xs font-semibold transition disabled:opacity-50 shadow-xs"
            >
              Change Pass
            </button>
          )}

          <div className="relative group">
            <button className="flex items-center justify-center gap-2 bg-indigo-500 border border-gray-300 hover:border-gray-400 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-help">
              <MapPin size={16} className="text-white" />
            </button>
            <div className="absolute top-full right-0 mt-2 w-64 p-4 bg-white border border-gray-200 rounded-xl shadow-xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 z-[80] origin-top-right">
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Current Address</p>
                  <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{currentAddress}</p>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Permanent Address</p>
                  <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{permanentAddress}</p>
                </div>
              </div>
              <div className="absolute -top-1 right-4 w-2 h-2 bg-white border-t border-l border-gray-200 rotate-45"></div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full justify-end">
          <button
            onClick={onDisableUser}
            disabled={actionLoading === "disable" || (!isSuperAdmin && !isAdmin)}
            className={`text-white px-3 py-2 rounded-lg text-xs font-bold transition disabled:opacity-20 ${
              user?.status === "inactive" ? "bg-green-600 hover:bg-green-700" : "bg-[#AE2448] hover:bg-red-800"
            }`}
          >
            {actionLoading === "disable" ? "..." : user?.status === "inactive" ? "ENABLE USER" : "DISABLE USER"}
          </button>

          <button
            onClick={onFetchMigrationDetails}
            disabled={checkingMigration || migrationPending || user?.status === "archived" || (!isSuperAdmin && !isAdmin)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200 disabled:opacity-40"
          >
            {checkingMigration ? <Loader2 size={12} className="animate-spin" /> : (
              <>
                <RefreshCw size={12} />
                MIGRATE
              </>
            )}
          </button>

          <button
            onClick={onArchiveUser}
            disabled={checkingMigration || archivePending || migrationPending || user?.status === "archived" || (!isSuperAdmin && !isAdmin)}
            className={`text-white px-3 py-2 rounded-lg text-xs font-bold transition disabled:opacity-40 ${
              user?.status === "archived" ? "bg-gray-400" : "bg-zinc-800 hover:bg-zinc-900"
            }`}
          >
            {archivePending ? <Loader2 size={12} className="animate-spin" /> : user?.status === "archived" ? "ARCHIVED" : "ARCHIVE USER"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileHeader;