import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import dayjs from "dayjs";

const FMT = "YYYY-MM-DD";

// Preset key -> { label, range() => { from, to } }. `all` clears the date filter.
const PRESETS = [
  { key: "all", label: "All Time", range: () => ({ from: "", to: "" }) },
  { key: "today", label: "Today", range: () => ({ from: dayjs().format(FMT), to: dayjs().format(FMT) }) },
  { key: "yesterday", label: "Yesterday", range: () => ({ from: dayjs().subtract(1, "day").format(FMT), to: dayjs().subtract(1, "day").format(FMT) }) },
  { key: "last7", label: "Last 7 Days", range: () => ({ from: dayjs().subtract(6, "day").format(FMT), to: dayjs().format(FMT) }) },
  { key: "last30", label: "Last 30 Days", range: () => ({ from: dayjs().subtract(29, "day").format(FMT), to: dayjs().format(FMT) }) },
  { key: "this_month", label: "This Month", range: () => ({ from: dayjs().startOf("month").format(FMT), to: dayjs().endOf("month").format(FMT) }) },
  { key: "last_month", label: "Last Month", range: () => ({ from: dayjs().subtract(1, "month").startOf("month").format(FMT), to: dayjs().subtract(1, "month").endOf("month").format(FMT) }) },
  { key: "custom", label: "Custom Range", range: null },
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// 6-week grid (null cells pad the days outside the visible month).
const buildMonth = (monthStart) => {
  const start = monthStart.startOf("month");
  const offset = start.day();
  const daysInMonth = monthStart.daysInMonth();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(start.date(d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

const buttonLabel = (preset, from, to) => {
  const match = PRESETS.find((p) => p.key === preset);
  if (preset && preset !== "custom" && preset !== "all" && match) return match.label;
  if (from && to) {
    return from === to ? dayjs(from).format("DD MMM, YYYY") : `${dayjs(from).format("DD MMM, YYYY")} - ${dayjs(to).format("DD MMM, YYYY")}`;
  }
  return "All Time";
};

const MonthGrid = ({ monthStart, from, to, onPick }) => {
  const cells = useMemo(() => buildMonth(monthStart), [monthStart]);
  const fromD = from ? dayjs(from) : null;
  const toD = to ? dayjs(to) : null;

  return (
    <div className="w-[230px]">
      <p className="text-center text-xs font-bold text-slate-700 mb-2">{monthStart.format("MMM YYYY")}</p>
      <div className="grid grid-cols-7 gap-y-1">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-center text-[10px] font-bold text-slate-400 uppercase">{w}</span>
        ))}
        {cells.map((day, i) => {
          if (!day) return <span key={i} />;
          const isStart = fromD && day.isSame(fromD, "day");
          const isEnd = toD && day.isSame(toD, "day");
          const inRange = fromD && toD && day.isAfter(fromD, "day") && day.isBefore(toD, "day");
          const isEdge = isStart || isEnd;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(day)}
              className={`h-7 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                isEdge
                  ? "bg-[#1a73e8] text-white"
                  : inRange
                  ? "bg-blue-50 text-[#1a73e8]"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {day.date()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * @param {{from_date:string,to_date:string}} value
 * @param {string} preset
 * @param {(next:{from_date:string,to_date:string,preset:string}) => void} onChange
 */
const DateRangePicker = ({ value = { from_date: "", to_date: "" }, preset = "all", onChange }) => {
  const [open, setOpen] = useState(false);
  // Anchor the popover by its top + right edge. Right-anchoring keeps the wide
  // dual-calendar on-screen and, unlike a transform, isn't clobbered by Framer
  // Motion's animated transform.
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  const [viewMonth, setViewMonth] = useState(dayjs().startOf("month"));
  // Draft selection while the popover is open (committed on range complete / preset click).
  const [draft, setDraft] = useState({ from: value.from_date, to: value.to_date });
  const triggerRef = useRef(null);

  const openPopover = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) });
    }
    setViewMonth(dayjs(value.from_date || undefined).startOf("month"));
    setDraft({ from: value.from_date, to: value.to_date });
    setOpen(true);
  };

  const commit = (from, to, presetKey) => {
    onChange?.({ from_date: from, to_date: to, preset: presetKey });
    setOpen(false);
  };

  const handlePreset = (p) => {
    if (p.key === "custom") {
      setDraft({ from: "", to: "" });
      return;
    }
    const { from, to } = p.range();
    commit(from, to, p.key);
  };

  const handlePick = (day) => {
    const picked = day.format(FMT);
    // No start yet, or a complete range exists -> begin a fresh range.
    if (!draft.from || (draft.from && draft.to)) {
      setDraft({ from: picked, to: "" });
      return;
    }
    // Have a start, choosing the end.
    if (dayjs(picked).isBefore(dayjs(draft.from))) {
      setDraft({ from: picked, to: "" });
      return;
    }
    commit(draft.from, picked, "custom");
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPopover())}
        className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:border-indigo-400 transition-colors cursor-pointer"
      >
        <Calendar size={15} className="text-[#1a73e8]" />
        <span className="text-sm font-bold text-gray-700 whitespace-nowrap">{buttonLabel(preset, value.from_date, value.to_date)}</span>
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0" style={{ zIndex: 999999 }}>
            <div className="absolute inset-0" onClick={() => setOpen(false)} />
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: -6 }}
                transition={{ duration: 0.15 }}
                style={{ position: "fixed", top: coords.top, right: coords.right }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white border border-slate-200 rounded-2xl shadow-2xl flex overflow-hidden"
              >
                {/* Presets */}
                <div className="w-[150px] border-r border-slate-100 py-2 bg-slate-50/40">
                  {PRESETS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handlePreset(p)}
                      className={`block w-full text-left px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                        preset === p.key ? "bg-[#1a73e8] text-white" : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Calendars */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <button type="button" onClick={() => setViewMonth((m) => m.subtract(1, "month"))} className="p-1 rounded-md hover:bg-slate-100 text-slate-500 cursor-pointer">
                      <ChevronLeft size={16} />
                    </button>
                    <button type="button" onClick={() => setViewMonth((m) => m.add(1, "month"))} className="p-1 rounded-md hover:bg-slate-100 text-slate-500 cursor-pointer">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="flex gap-6">
                    <MonthGrid monthStart={viewMonth} from={draft.from} to={draft.to} onPick={handlePick} />
                    <MonthGrid monthStart={viewMonth.add(1, "month")} from={draft.from} to={draft.to} onPick={handlePick} />
                  </div>
                  <p className="mt-3 text-[11px] font-semibold text-slate-400">
                    {draft.from ? `${dayjs(draft.from).format("DD MMM YYYY")} ${draft.to ? "→ " + dayjs(draft.to).format("DD MMM YYYY") : "→ select end date"}` : "Select a start date"}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>,
          document.body,
        )}
    </>
  );
};

export default DateRangePicker;
