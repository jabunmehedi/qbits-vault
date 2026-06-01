import { useEffect, useMemo, useState } from "react";
import Drawer from "../../global/drawer/Drawer";
import { ArrowRight, ClockIcon, UserIcon } from "lucide-react";
import dayjs from "dayjs";
// import { GetOrderHistory } from "../../../services/Orders";

// --- STATIC DEMO DATA FOR HISTORY ---
const demoHistories = [
  {
    id: 1,
    installment_no: 1,
    payment_status: "pending",
    amount: 15000,
    partial_percentage: 50,
    created_at: "2026-05-10T10:00:00.000Z",
    user: { name: "John Doe" }
  },
  {
    id: 2,
    installment_no: 1,
    payment_status: "received",
    amount: 15000,
    partial_percentage: 0,
    created_at: "2026-05-11T12:30:00.000Z",
    user: { name: "Jane Smith" }
  },
  {
    id: 3,
    installment_no: 2,
    payment_status: "pending",
    amount: 20000,
    partial_percentage: 100,
    created_at: "2026-05-12T09:15:00.000Z",
    user: { name: "Alex Kumar" }
  }
];

const StatusBadge = ({ status, className = "" }) => {
  const map = {
    pending: { label: "Pending", color: "text-orange-600 bg-orange-100" },
    received: { label: "Received By ST", color: "text-green-600 bg-green-50" },
    deduction: { label: "Deduction", color: "text-red-500 bg-red-50" },
    addition: { label: "Addition", color: "text-green-600 bg-green-50" },
    received_from_ST: { label: "Received By AT", color: "text-indigo-500 bg-indigo-50" },
    deposit: { label: "Deposited In Bank by AT", color: "text-green-600 bg-green-50" },
    complete: { label: "Bank Deposition Confirmed", color: "text-indigo-500 bg-indigo-50" },
  };
  const entry = map[status] || { label: status, color: "text-gray-600 bg-gray-100" };
  return <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${entry.color} ${className}`}>{entry.label}</span>;
};

const OrderDetailsDrawer = ({ orderId, isOpen, onClose, payment_type, onEdit }) => {
  const [activeIndex, setActiveIndex] = useState(null);
  const [histories, setHistories] = useState([]);


  useEffect(() => {
    // --- COMMENTED OUT API CALL ---
    /*
    GetOrderHistory(orderId).then((res) => {
      if (res?.success === true) {
        setHistories(res?.data?.data);
      }
    });
    */

    // --- USING STATIC DATA FOR NOW ---
    setHistories(demoHistories);
  }, [orderId]);

  const paymentGroups = useMemo(() => {
    if (!histories || !Array.isArray(histories)) return [];

    const sortedHistories = [...histories].sort((a, b) => {
      if (a.installment_no !== b.installment_no) return a.installment_no - b.installment_no;
      return new Date(a.created_at) - new Date(b.created_at);
    });

    const groupMap = {};
    sortedHistories.forEach((item) => {
      const key = item.installment_no ?? "unknown";
      if (!groupMap[key]) groupMap[key] = [];
      groupMap[key].push(item);
    });

    return Object.entries(groupMap)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([installment_no, items]) => ({ installment_no, items }));
  }, [histories]);

  // if (paymentGroups.length === 0) return null;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={<span className="text-gray-600">Order Tracking History</span>} className="bg-[#F8FAFC]">
      <div className="flex flex-col lg:flex-row gap-6 py-4 px-6">
        <div className="flex-1 space-y-3">
          {paymentGroups?.map((group, idx) => {
            const { installment_no, items } = group;
            const lastStatus = items[items.length - 1];
            const isSelected = activeIndex === idx;

            return (
              <div
                key={installment_no}
                onClick={() => setActiveIndex((prev) => (prev === idx ? null : idx))}
                className={`cursor-pointer bg-white p-4 rounded-xl shadow transition-all ${
                  isSelected ? "border-blue-500 bg-white shadow-md ring-1 ring-blue-100" : "border-gray-100 bg-gray-50 hover:border-gray-200"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {payment_type == "partial" && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-blue-50 text-blue-600 rounded">Installment #{installment_no}</span>
                        )}
                        <StatusBadge status={lastStatus.payment_status} />
                        <h4 className="font-bold text-gray-800">BDT {Number(lastStatus.amount || 0).toLocaleString()}</h4>
                      </div>
                      <p className="text-xs font-medium flex items-center text-gray-400 ml-1 mt-1">
                        {dayjs(lastStatus.date || lastStatus.created_at).format("DD MMM, YYYY")} •{" "}
                        <span className="flex items-center gap-1">
                          {" "}
                          <UserIcon className="w-3 h-4 " /> {lastStatus.user?.name}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-6 h-6 flex items-center justify-center text-sm flex-shrink-0 transition-all duration-300 ${
                      isSelected
                        ? "bg-indigo-600 p-4 text-white rotate-45 rounded-lg" // Diamond: rotate + small radius
                        : "bg-gray-100 p-4 text-gray-400 rounded-lg" // Circle
                    }`}
                  >
                    <span className={isSelected ? "-rotate-45" : ""}>{isSelected ? "✕" : "+"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {activeIndex !== null ? (
          <div className="lg:w-90">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 ">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Detailed Trackings</h3>

              <p className="text-xs text-blue-500 font-semibold mb-6">
                {" "}
                {paymentGroups[activeIndex].installment_no > 1 ? "Installment #" + paymentGroups[activeIndex].installment_no : ""}
              </p>

              <div className="relative border-l-2 border-gray-100 ml-3 space-y-8">
                {paymentGroups[activeIndex].items.map((item, i) => (
                  <div key={item.id} className="relative pl-8">
                    <div
                      className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white ring-1 ${
                        i === 0 ? "bg-blue-600 ring-blue-100" : "bg-gray-300 ring-gray-100"
                      }`}
                    />
                    <div>
                      <p className="text-[10px] font-bold uppercase mb-1">
                        <StatusBadge status={item.payment_status} />
                      </p>
                      <p className="font-bold text-gray-900 mt-1">
                        BDT {Number(item.amount || 0).toLocaleString()}
                        <span className="text-gray-400 font-normal text-xs ml-1 italic">Cash</span>
                        {item?.partial_percentage > 0 && (
                          <span className="text-orange-400 font-normal text-xs ml-1 italic">(Partial {item?.partial_percentage}% Pay)</span>
                        )}
                      </p>
                      <div className="text-[10px] flex items-center text-gray-400 mt-1 uppercase">
                        <span className="flex items-center gap-1">{dayjs(item?.date || item.created_at).format("DD MMM, YYYY h:mm A")}</span>
                        {" • "}
                        <span className="flex items-center font-semibold text-indigo-500">
                          <UserIcon className="w-4 h-3" /> {item.user?.name}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="border bg-white text-center flex h-[200px]  gap-4 flex-col justify-center items-center border-dashed border-slate-200 lg:w-90 rounded-2xl p-6">
            <div className="bg-gray-50/50 p-4 rounded-full">
              <ArrowRight className="w-6 h-6 text-gray-300  " />
            </div>
            <p className="text-slate-300 text-center text-xs  uppercase">Select History Entry</p>
          </div>
        )}
      </div>
    </Drawer>
  );
};

export default OrderDetailsDrawer;