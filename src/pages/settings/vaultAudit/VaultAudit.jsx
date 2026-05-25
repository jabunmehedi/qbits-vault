import { useEffect, useState } from "react";
import DataTable from "../../../components/global/dataTable/DataTable";
import VaultAuditEditConfigModal from "../../../components/settings/vaultAudit/VaultAuditEditConfigModal";
import { GetVaultAuditConfig } from "../../../services/VaultAudit";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

// Initialize plugin outside render cycles
dayjs.extend(customParseFormat);


const isEditLocked = (interval, dayName, timeStr, lastAuditDate) => {
  if (!timeStr) return false;

  const now = dayjs();
  const parsedTime = dayjs(timeStr, "HH:mm:ss");

  const daysMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  const targetDayNumber = dayName ? daysMap[dayName.toLowerCase()] : null;

  let targetDateTime;
  const type = interval?.toLowerCase();

  switch (type) {
    case "daily":
      targetDateTime = now.hour(parsedTime.hour()).minute(parsedTime.minute()).second(0).millisecond(0);

      // If we are closer to tomorrow's execution point than yesterday's trailing window, roll forward
      if (now.diff(targetDateTime, "hours") > 6) {
        targetDateTime = targetDateTime.add(1, "day");
      } else if (targetDateTime.diff(now, "hours") > 18) {
        // If "now" is early morning and target hasn't hit yet but yesterday's trailing window applies
        targetDateTime = targetDateTime.subtract(1, "day");
      }
      break;

    case "weekly":
      if (targetDayNumber === null) return false;
      targetDateTime = now.day(targetDayNumber).hour(parsedTime.hour()).minute(parsedTime.minute()).second(0).millisecond(0);

      // Roll forward or backward dynamically depending on which week boundary is closest
      if (now.diff(targetDateTime, "hours") > 6) {
        targetDateTime = targetDateTime.add(1, "week");
      } else if (targetDateTime.diff(now, "hours") > 162) {
        targetDateTime = targetDateTime.subtract(1, "week");
      }
      break;

    case "bi-weekly":
    case "biweekly":
      if (targetDayNumber === null) return false;
      const baseDate = lastAuditDate ? dayjs(lastAuditDate) : now;
      targetDateTime = baseDate.add(2, "weeks").day(targetDayNumber).hour(parsedTime.hour()).minute(parsedTime.minute()).second(0).millisecond(0);

      // Find the nearest execution window block
      while (now.diff(targetDateTime, "hours") > 6) {
        targetDateTime = targetDateTime.add(2, "weeks");
      }
      while (targetDateTime.diff(now, "hours") > 2 * 168 - 6) {
        targetDateTime = targetDateTime.subtract(2, "weeks");
      }
      break;

    case "monthly":
    case "quarterly":
    case "quaterly":
      if (targetDayNumber === null) return false;

      const getSubsequentLastDay = (referenceDate) => {
        let lastDay = referenceDate.endOf("month");
        while (lastDay.day() !== targetDayNumber) {
          lastDay = lastDay.subtract(1, "day");
        }
        return lastDay.hour(parsedTime.hour()).minute(parsedTime.minute()).second(0).millisecond(0);
      };

      targetDateTime = getSubsequentLastDay(now);
      const monthsStep = type === "monthly" ? 1 : 3;

      if (now.diff(targetDateTime, "hours") > 6) {
        targetDateTime = getSubsequentLastDay(now.add(monthsStep, "month"));
      } else if (targetDateTime.diff(now, "hours") > monthsStep * 30 * 24 - 6) {
        targetDateTime = getSubsequentLastDay(now.subtract(monthsStep, "month"));
      }
      break;

    default:
      return false;
  }

  // Define full locking limits: 6 hours before up to 6 hours after target runtime
  const bufferStart = targetDateTime.subtract(6, "hours");
  const bufferEnd = targetDateTime.add(6, "hours");

  return now.isAfter(bufferStart) && now.isBefore(bufferEnd);
};

const VaultAudit = () => {
  const [vaultsConfig, setVaultsConfig] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVault, setSelectedVault] = useState(null);

  const fetchVaultsConfig = () => {
    GetVaultAuditConfig()
      .then((res) => {
        setVaultsConfig(res?.data?.data || []);
      })
      .catch((err) => {
        console.error("Error pulling standard vaults list data:", err);
      });
  };

  useEffect(() => {
    fetchVaultsConfig();
  }, []);

  const openEditModal = (row) => {
    setSelectedVault(row);
    setIsModalOpen(true);
  };

  const columns = [
    {
      title: "Vault name",
      key: "name",
      className: "w-24",
      render: (row) => <span className="text-indigo-600 font-semibold">{row?.vault?.name}</span>,
    },
    {
      title: "Vault Type",
      key: "vault_type",
      className: "w-32",
      render: (row) => <span className="text-gray-400">{row?.vault_type || "-"}</span>,
    },
    {
      title: "Location",
      key: "address",
      className: "w-32",
      render: (row) => <span className="text-gray-400">{row?.vault?.address || "-"}</span>,
    },
    {
      title: "Audit Interval",
      key: "interval",
      className: "w-32",
      render: (row) => <span className="text-gray-600 font-medium capitalize">{row?.interval || "-"}</span>,
    },
    {
      title: "Day",
      key: "day",
      className: "w-32",
      render: (row) => <span className="text-gray-600 font-medium capitalize">{row?.day || "-"}</span>,
    },
    {
      title: "Time",
      key: "time",
      className: "w-32",
      render: (row) => {
        const timeStr = row?.time;
        const formattedTime = timeStr ? dayjs(timeStr, "HH:mm:ss").format("hh:mm A") : "N/A";
        return <span className="text-gray-600 font-medium capitalize">{formattedTime}</span>;
      },
    },
    {
      title: "Last Audit Date",
      key: "last_audit_date",
      className: "w-32",
      render: (row) => <span className="text-gray-400">{row?.last_audit_date || "-"}</span>,
    },
    {
      title: "Failed Audit",
      key: "failed_audits",
      className: "w-32",
      render: (row) => <span className="text-gray-400">{row?.failed_audits || "-"}</span>,
    },
    {
      title: "Status",
      key: "status",
      className: "w-32",
      render: (row) => (
        <span
          className={`text-xs px-3 py-1.5 rounded-full font-medium ${row?.status === "configured" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
        >
          {row?.status || "-"}
        </span>
      ),
    },
    {
      title: "Action",
      key: "action",
      className: "w-32",
      render: (row) => {
        const locked = isEditLocked(row?.interval, row?.day, row?.time, row?.last_audit_date);

        return (
          <div className="relative group flex flex-col">
            <button
              onClick={() => !locked && openEditModal(row)}
              disabled={locked}
              className={`font-medium transition-colors ${locked ? "text-gray-400 cursor-not-allowed hidden" : "text-indigo-600 hover:underline cursor-pointer"}`}
            >
              Edit Config
            </button>

            {locked && <span className="text-[11px] text-left text-gray-400">You cannot edit config within 6 hours of running time.</span>}
          </div>
        );
      },
    },
  ];

  return (
    <div className="relative">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-600 uppercase">Audit Inventory</h1>
            <p className="text-xs text-gray-400">Manage and schedule compliance audits for all secure locations.</p>
          </div>
        </div>

        <DataTable columns={columns} data={vaultsConfig} className="h-[calc(100vh-100px)]" />
      </div>

      {isModalOpen && <VaultAuditEditConfigModal auditConfig={selectedVault} setIsModalOpen={setIsModalOpen} refetchData={fetchVaultsConfig} />}
    </div>
  );
};

export default VaultAudit;
