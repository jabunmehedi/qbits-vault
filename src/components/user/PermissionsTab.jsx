import { Check, Shield } from "lucide-react";
import { useState } from "react";

const PermissionsTab = ({ permissions, editFormData, onToggle, saving }) => {
  const [search, setSearch] = useState("");

  const grouped = permissions
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
    .reduce((acc, perm) => {
      const key = perm.name.split(".")[0].replace(/-/g, " ");
      if (!acc[key]) acc[key] = [];
      acc[key].push(perm);
      return acc;
    }, {});

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search permissions..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-cyan-400 bg-gray-50"
      />

      <div className="max-h-[420px] overflow-y-auto pr-1 space-y-2">
        {Object.keys(grouped)
          .sort()
          .map((groupName) => (
            <div key={groupName} className="border border-gray-100 rounded-lg overflow-hidden">
              {/* Group header */}
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
                <Shield className="w-3.5 h-3.5 text-cyan-500" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{groupName}</span>
                <span className="ml-auto text-xs text-gray-400">
                  {grouped[groupName].filter((p) => editFormData.permissions.includes(p.id)).length}/{grouped[groupName].length}
                </span>
              </div>

              {/* Permissions list — compact rows */}
              <div className="divide-y divide-gray-50">
                {grouped[groupName].map((perm) => {
                  const isChecked = editFormData.permissions.includes(perm.id);
                  const fromRole = editFormData.rolePermissions.includes(perm.id);
                  const action = perm.name.split(".").pop().replace(/-/g, " ");

                  return (
                    <label
                      key={perm.id}
                      htmlFor={`perm-${perm.id}`}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                        isChecked ? "bg-cyan-50/60" : "bg-white hover:bg-gray-50"
                      } ${saving ? "pointer-events-none opacity-60" : ""}`}
                    >
                      {/* Custom checkbox */}
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                          isChecked ? "bg-cyan-500 border-cyan-500" : "border-gray-300 bg-white"
                        }`}
                      >
                        {isChecked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                      </div>

                      <input type="checkbox" id={`perm-${perm.id}`} checked={isChecked} onChange={() => onToggle(perm.id)} className="sr-only" />

                      <span className="text-sm text-gray-700 flex-1 capitalize">{action}</span>

                      {fromRole && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 border border-blue-100 flex-shrink-0">role</span>
                      )}
                      {!fromRole && isChecked && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-500 border border-emerald-100 flex-shrink-0">direct</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

        {Object.keys(grouped).length === 0 && <p className="text-center text-sm text-gray-400 py-8">No permissions found</p>}
      </div>
    </div>
  );
};

export default PermissionsTab;
