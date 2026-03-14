const StatusBadge = ({ status }) => {
  const map = {
    active: "bg-emerald-50 text-emerald-600 border-emerald-200",
    inactive: "bg-yellow-50 text-yellow-600 border-yellow-200",
    disabled: "bg-red-50 text-red-500 border-red-200",
  };
  return <span className={`capitalize text-xs px-2.5 py-1 rounded-full border ${map[status] || map.inactive}`}>{status}</span>;
};

export default StatusBadge;
