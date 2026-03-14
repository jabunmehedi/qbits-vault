import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import PermissionsTab from "./PermissionsTab";
import { MigrateTab } from "./MigrateTab";

const TabContent = ({
  activeTab,
  editFormData,
  setEditFormData,
  handleSaveProfile,
  savingProfile,
  permissions,
  handleTogglePermission,
  savingPerm,
  selectedUser,
  users,
  handleMigrate,
  migrating,
}) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div key={activeTab} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
        {/* ── Profile tab ── */}
        {activeTab === "profile" && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                name="name"
                value={editFormData.name}
                onChange={(e) => setEditFormData((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                name="email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData((p) => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                name="status"
                value={editFormData.status}
                onChange={(e) => setEditFormData((p) => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-cyan-400 outline-none bg-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-800 hover:bg-black text-white text-sm rounded-lg transition-colors disabled:opacity-60"
            >
              {savingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        )}

        {/* ── Permissions tab ── */}
        {activeTab === "permissions" && (
          <PermissionsTab permissions={permissions} editFormData={editFormData} onToggle={handleTogglePermission} saving={savingPerm} />
        )}

        {/* ── Migrate tab ── */}
        {activeTab === "migrate" && <MigrateTab currentUser={selectedUser} users={users} onMigrate={handleMigrate} migrating={migrating} />}
      </motion.div>
    </AnimatePresence>
  );
};

export default TabContent;
