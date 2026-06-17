

const ReconcileDetails = ({ reconcile }) => {


  if (!reconcile) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <span className="text-sm text-gray-400">No reconciliation data available.</span>
      </div>
    );
  }

  // Format Date Helper
  const formatDate = (dateString) => {
    if (!dateString) return "--";
    return new Date(dateString).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // Status Badge Styling Lookup
  const getStatusBadge = (status) => {
    const profiles = {
      pending: "bg-amber-50 text-amber-700 border-amber-200 uppercase",
      counting: "bg-blue-50 text-blue-700 border-blue-200 uppercase animate-pulse",
      completed: "bg-emerald-50 text-emerald-700 border-emerald-200 uppercase",
      failed: "bg-red-50 text-red-700 border-red-200 uppercase",
    };
    const currentStyle = profiles[status?.toLowerCase()] || "bg-gray-50 text-gray-600 border-gray-200";

    return (
      <span className={`px-2.5 py-1 text-xs font-semibold tracking-wider rounded-md border ${currentStyle}`}>
        {status || "Unknown"}
      </span>
    );
  };

  return (
    <div className="">
      
      {/* --- HEADER BAR --- */}
      <div className="bg-gray-50/70 border-b border-gray-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">Transaction ID</span>
            {getStatusBadge(reconcile?.status)}
          </div>
          <h2 className="text-lg font-bold text-slate-800 mt-1 tracking-tight">
            {reconcile?.reconcile_tran_id || "N/A"}
          </h2>
        </div>
        
        <div className="flex flex-col sm:items-end text-xs text-gray-400">
          <span>Created At</span>
          <span className="font-semibold text-slate-600 mt-0.5">
            {formatDate(reconcile?.created_at)}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* --- SECTION 1: SUMMARY INFORMATION GRID --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl">
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vault Info</span>
            <span className="block text-sm font-bold text-slate-700 mt-1 truncate">
              {reconcile?.vault?.name || "N/A"}
            </span>
            <span className="inline-block text-[10px] font-semibold bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 mt-1">
              Code: {reconcile?.vault?.vault_code || "--"}
            </span>
          </div>

          <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl">
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Expected Balance</span>
            <span className="block text-base font-bold text-slate-800 mt-1">
              {reconcile?.expected_balance !== null ? `$${reconcile.expected_balance}` : "--"}
            </span>
          </div>

          <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl">
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Counted Balance</span>
            <span className="block text-base font-bold text-slate-800 mt-1">
              {reconcile?.counted_balance !== null ? `$${reconcile.counted_balance}` : "--"}
            </span>
          </div>

          <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl">
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Bag Scope</span>
            <span className="block text-base font-bold text-slate-800 mt-1">
              {reconcile?.total_bags !== null ? `${reconcile.total_bags} Bags` : "--"}
            </span>
          </div>
        </div>

        {/* --- SECTION 2: TIMEFRAMES & LOGISTICS --- */}
        <div className="border border-gray-100 rounded-xl p-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between items-center py-1.5 border-b border-gray-50 md:border-b-0 md:border-r md:pr-4">
            <span className="text-gray-400 font-medium">Audit Time Range (From)</span>
            <span className="font-semibold text-slate-700">{formatDate(reconcile?.from_date)}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 md:pl-4">
            <span className="text-gray-400 font-medium">Target Completion Deadline</span>
            <span className="font-semibold text-slate-700">{formatDate(reconcile?.expected_completion_at)}</span>
          </div>
        </div>

        {/* --- SECTION 3: RECONCILE VERIFIERS STATUS WORKFLOW --- */}
        {(() => {
          const verifiers = reconcile?.required_verifiers || [];
          const reconcilers = reconcile?.required_reconcilers || [];
          // Merge both lists, deduplicate by user_id, reconciler entry takes verified status if both present
          const seen = new Map();
          [...verifiers, ...reconcilers].forEach((entry) => {
            const uid = entry?.user_id;
            if (!seen.has(uid)) {
              seen.set(uid, entry);
            } else if (entry?.verified) {
              // If either record is verified, treat the user as verified
              seen.set(uid, { ...seen.get(uid), verified: true });
            }
          });
          const allEntries = [...seen.values()];
          return (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Required Verification Workflow ({allEntries.length})
              </h3>
              {allEntries.length > 0 ? (
                <div className="space-y-2">
                  {allEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between border border-gray-100 rounded-xl p-3.5 bg-white shadow-2xs hover:border-gray-200 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">
                          {entry?.user?.name ? entry.user.name.substring(0, 2) : "U"}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700">{entry?.user?.name || "Unknown"}</h4>
                          <p className="text-xs text-gray-400">{entry?.user?.email || "No email logged"}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${entry?.verified ? "bg-green-500" : "bg-amber-400"}`} />
                        <span className="text-xs font-bold text-slate-600">
                          {entry?.verified ? "Verified" : "Pending Action"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-gray-50 border border-gray-100 rounded-xl text-xs text-gray-400 font-medium">
                  No specific assignees assigned to this verification check.
                </div>
              )}
            </div>
          );
        })()}

        {/* --- SECTION 4: EXCEPTION & SYSTEM FLAGS --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
          <div className="flex items-center space-x-2 text-gray-500">
            <span className="text-gray-400 font-bold">Escalation Required:</span>
            <span className={`px-2 py-0.5 rounded ${reconcile?.requires_escalation ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"}`}>
              {reconcile?.requires_escalation ? "Yes" : "No"}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 text-gray-500 sm:justify-end">
            <span className="text-gray-400 font-bold">Session Security Lock:</span>
            <span className={`px-2 py-0.5 rounded ${reconcile?.is_locked ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-600"}`}>
              {reconcile?.is_locked ? "Locked" : "Open Session"}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ReconcileDetails;