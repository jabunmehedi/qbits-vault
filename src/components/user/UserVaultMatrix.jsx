import { FaCheckCircle } from "react-icons/fa";

const UserVaultMatrix = ({
  vaultList,
  userAssignments,
  assignedVaults,
  activeVaultId,
  activeRoles,
  rolesList,
  isSuperAdmin,
  isAdmin,
  onToggleVaultAccess,
  onSwitchVaultView,
  onToggleRole
}) => {
  return (
    <div className="grid grid-cols-3 p-6 bg-[#F6F7F9] rounded-lg gap-6">
      <div>
        <div className="mb-6">
          <h4 className="text-blue-600 font-bold uppercase text-xs mb-4">VAULT ACCESS CONTROL</h4>
          <div className="bg-white border border-gray-200 py-3 rounded-2xl">
            {vaultList.map((vault) => {
              const assignment = userAssignments.find((a) => a.vault_id === vault.id);
              const isActive = assignment && (assignment.status === "active" || assignment.status === 1);
              return (
                <div key={vault.id} className="text-sm text-black border-gray-100 rounded-3xl px-5 py-2.5 flex items-center justify-between transition">
                  <div className="flex items-center text-xs gap-3">
                    <div className="p-2 bg-gray-100 rounded-xl">🔒</div>
                    <p className="font-semibold">{vault.name}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={isActive} onChange={() => onToggleVaultAccess(vault.id)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
        
        <div>
          <h4 className="text-blue-600 font-bold uppercase text-xs mb-4">Switch Vault View</h4>
          <div className="bg-white border border-gray-200 py-3 rounded-2xl">
            {assignedVaults.length > 0 ? (
              assignedVaults.map((vault) => (
                <div key={vault.id} onClick={() => onSwitchVaultView(vault)} className="rounded-3xl text-xs px-5 py-2.5 flex items-center justify-between cursor-pointer transition-all">
                  <div className={`flex items-center gap-3 w-full rounded-2xl ${activeVaultId === vault.id ? "border-blue-600 !bg-black text-white" : "border-gray-100 text-gray-600"}`}>
                    <div className="p-2 bg-gray-100 rounded-xl">🔒</div>
                    <p className="font-semibold">{vault.name}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm p-4">No vault assigned yet.</p>
            )}
          </div>
        </div>
      </div>

      {activeVaultId && (
        <div className="col-span-2">
          <h4 className="text-blue-600 font-bold uppercase text-xs mb-4">
            CAPABILITY MATRIX: <span className="text-gray-500">{vaultList.find((v) => v.id === activeVaultId)?.name}</span>
          </h4>
          <div className="grid grid-cols-2 text-black gap-3">
            {rolesList
              ?.filter((role) => role.name !== "super-admin" && role.name !== "Super Admin")
              .map((role) => {
                const isEnabled = activeRoles.includes(role.id);
                return (
                  <div key={role.id} onClick={() => onToggleRole(role)} className={`rounded-3xl p-4 flex items-center capitalize justify-between cursor-pointer transition-all border ${isEnabled ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200 hover:border-gray-300"}`}>
                    <div>
                      <p className="font-bold">{role?.name}</p>
                      <p className="text-xs opacity-75">{isEnabled ? "Enabled" : "Disabled"}</p>
                    </div>
                    <div className={`w-8 h-8 rounded-2xl flex items-center justify-center text-xl ${isEnabled ? "" : "bg-gray-100"}`}>
                      {isEnabled ? <FaCheckCircle /> : "○"}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserVaultMatrix;