import { useEffect, useState, useCallback } from "react";
import dayjs from "dayjs";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit3,
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  RefreshCw,
  X,
  Package,
  Eye,
} from "lucide-react";
import axiosConfig from "../../utils/axiosConfig";


// ─── Config ───────────────────────────────────────────────────────────────────
const MODULES = ["", "vault", "bag", "transaction", "user"];
const EVENTS = ["", "created", "updated", "deleted", "cash_in", "cash_out", "custom"];

const EVENT_META = {
  created: { color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: <Plus className="w-3 h-3" />, label: "Created" },
  updated: { color: "text-blue-700 bg-blue-50 border-blue-200", icon: <Edit3 className="w-3 h-3" />, label: "Updated" },
  deleted: { color: "text-red-700 bg-red-50 border-red-200", icon: <Trash2 className="w-3 h-3" />, label: "Deleted" },
  cash_in: { color: "text-green-700 bg-green-50 border-green-200", icon: <ArrowDownCircle className="w-3 h-3" />, label: "Cash In" },
  cash_out: { color: "text-orange-700 bg-orange-50 border-orange-200", icon: <ArrowUpCircle className="w-3 h-3" />, label: "Cash Out" },
  custom: { color: "text-purple-700 bg-purple-50 border-purple-200", icon: <Activity className="w-3 h-3" />, label: "Custom" },
};

const getEventMeta = (event) => EVENT_META[event] || { color: "text-gray-600 bg-gray-50 border-gray-200", icon: <Clock className="w-3 h-3" />, label: event };

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const LogDetailModal = ({ log, onClose }) => {
  if (!log) return null;

  const meta = getEventMeta(log.event);
  const diff = log.meta?.diff || null;
  const hasOld = log.old_values && Object.keys(log.old_values).length > 0;
  const hasNew = log.new_values && Object.keys(log.new_values).length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1 ${meta.color}`}>
              {meta.icon} {meta.label}
            </span>
            <span className="text-sm font-bold text-gray-800">{log.subject_label || `#${log.subject_id}`}</span>
            <span className="text-xs text-gray-400 uppercase tracking-wide">{log.module}</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Description */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-700">{log.description}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
              <span>
                by <span className="font-medium text-gray-600">{log.user_name || "System"}</span>
              </span>
              <span>{dayjs(log.created_at).format("DD MMM YYYY, h:mm:ss A")}</span>
              {log.ip_address && <span>IP: {log.ip_address}</span>}
            </div>
          </div>

          {/* Diff (changed fields) */}
          {diff && Object.keys(diff).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Changes</p>
              <div className="space-y-2">
                {Object.entries(diff).map(([field, { from, to }]) => (
                  <div key={field} className="flex items-center gap-3 text-sm bg-gray-50 rounded-lg px-4 py-2">
                    <span className="font-medium text-gray-700 w-40 shrink-0">{field}</span>
                    <span className="line-through text-red-400 truncate">{String(from ?? "—")}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-green-600 font-medium truncate">{String(to ?? "—")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Old / New values */}
          {(hasOld || hasNew) && (
            <div className="grid grid-cols-2 gap-4">
              {hasOld && (
                <div>
                  <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Before</p>
                  <pre className="text-xs bg-red-50 border border-red-100 rounded-xl p-3 overflow-auto max-h-48 text-gray-700">
                    {JSON.stringify(log.old_values, null, 2)}
                  </pre>
                </div>
              )}
              {hasNew && (
                <div>
                  <p className="text-xs font-semibold text-green-500 uppercase tracking-wider mb-2">After</p>
                  <pre className="text-xs bg-green-50 border border-green-100 rounded-xl p-3 overflow-auto max-h-48 text-gray-700">
                    {JSON.stringify(log.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Meta */}
          {log.meta && Object.keys(log.meta).filter((k) => k !== "diff").length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Meta</p>
              <pre className="text-xs bg-gray-50 border border-gray-100 rounded-xl p-3 overflow-auto max-h-40 text-gray-700">
                {JSON.stringify(Object.fromEntries(Object.entries(log.meta).filter(([k]) => k !== "diff")), null, 2)}
              </pre>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ─── Main Activity Log Page ───────────────────────────────────────────────────
const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 25 });
  const [selectedLog, setSelectedLog] = useState(null);

  const [filters, setFilters] = useState({
    module: "",
    event: "",
    search: "",
    from: "",
    to: "",
    per_page: 25,
  });
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, page };
      // Remove empty params
      Object.keys(params).forEach((k) => {
        if (!params[k]) delete params[k];
      });

      const res = await axiosConfig.get("/activity-logs", { params });
      const data = res.data?.data;

      setLogs(data?.data || []);
      setPagination({
        current_page: data?.current_page || 1,
        last_page: data?.last_page || 1,
        total: data?.total || 0,
        per_page: data?.per_page || 25,
      });
    } catch (err) {
      console.error("Failed to fetch activity logs:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ module: "", event: "", search: "", from: "", to: "", per_page: 25 });
    setPage(1);
  };

  const hasActiveFilters = filters.module || filters.event || filters.search || filters.from || filters.to;

  // ── Stats summary ──────────────────────────────────────────────────────────
  const stats = EVENTS.slice(1).map((ev) => ({
    event: ev,
    count: logs.filter((l) => l.event === ev).length,
    meta: getEventMeta(ev),
  }));

  return (
    <div className=" space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="ml-1">
            <p className="text-[#424242] text-lg font-medium">Activity Log</p>
            <span className="text-gray-400 text-sm">Full system audit trail — {pagination.total.toLocaleString()} total events</span>
          </div>
        </div>
        <button onClick={fetchLogs} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm rounded-lg transition">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {stats.map(({ event, count, meta }) => (
          <button
            key={event}
            onClick={() => updateFilter("event", filters.event === event ? "" : event)}
            className={`rounded-xl border p-3 text-center transition cursor-pointer ${filters.event === event ? meta.color + " ring-2 ring-offset-1" : "bg-white border-gray-200 hover:border-gray-300"}`}
          >
            <div className={`flex justify-center mb-1 ${filters.event === event ? "" : "text-gray-400"}`}>{meta.icon}</div>
            <p className="text-lg font-bold text-gray-800">{count}</p>
            <p className="text-xs text-gray-500 capitalize">{meta.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 text-gray-600 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 " />
            <input
              type="text"
              placeholder="Search description, label, user…"
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
            />
          </div>

          {/* Module */}
          <div className="relative">
            <select
              value={filters.module}
              onChange={(e) => updateFilter("module", e.target.value)}
              className="pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-indigo-400 appearance-none cursor-pointer"
            >
              <option value="">All Modules</option>
              {MODULES.slice(1).map((m) => (
                <option key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>

          {/* Event */}
          <div className="relative">
            <select
              value={filters.event}
              onChange={(e) => updateFilter("event", e.target.value)}
              className="pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-indigo-400 appearance-none cursor-pointer"
            >
              <option value="">All Events</option>
              {EVENTS.slice(1).map((e) => (
                <option key={e} value={e}>
                  {getEventMeta(e).label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>

          {/* Date range */}
          <input
            type="date"
            value={filters.from}
            onChange={(e) => updateFilter("from", e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-indigo-400"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => updateFilter("to", e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-indigo-400"
          />

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 bg-red-50 border border-red-200 text-red-500 text-sm rounded-lg hover:bg-red-100 transition"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-indigo-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No activity logs found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Event", "Module", "Description", "Subject", "User", "IP", "Time", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y text-xs divide-gray-100">
              {logs.map((log) => {
                const meta = getEventMeta(log.event);
                return (
                  <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full border flex items-center gap-1 w-fit ${meta.color}`}>
                        {meta.icon} {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md capitalize">{log.module}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{log.description}</td>
                    <td className="px-4 py-3">
                      {log.subject_label ? (
                        <span className="text-cyan-600 font-medium">{log.subject_label}</span>
                      ) : log.subject_id ? (
                        <span className="text-gray-400">#{log.subject_id}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{log.user_name || "System"}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{log.ip_address || "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{dayjs(log.created_at).format("DD MMM YY, h:mm A")}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedLog(log)} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-700">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && logs.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Page {pagination.current_page} of {pagination.last_page} — {pagination.total.toLocaleString()} total
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.current_page === 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                const p = Math.max(1, Math.min(pagination.current_page - 2, pagination.last_page - 4)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm transition ${p === pagination.current_page ? "bg-indigo-600 text-white" : "border border-gray-200 hover:bg-gray-50 text-gray-600"}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(pagination.last_page, p + 1))}
                disabled={pagination.current_page === pagination.last_page}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <AnimatePresence>{selectedLog && <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}</AnimatePresence>
    </div>
  );
};

export default ActivityLog;
