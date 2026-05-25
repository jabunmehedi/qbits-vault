import { HiOutlineHashtag, HiOutlineUser, HiOutlineInboxIn, HiOutlineLibrary, HiOutlineCash, HiOutlineDownload } from "react-icons/hi";

const CashOutCustodianModal = ({ cashOut }) => {
  if (!cashOut) return null;

  console.log({ cashOut });

  // Fallbacks & Parsing
  const rawCashOutAmount = parseFloat(cashOut.cash_out_amount) || 0;
  const rawRequestMoney = parseFloat(cashOut.request_amount) || 0; // Adjust property name if different in API
  const rawCustodianReceived = rawCashOutAmount - rawRequestMoney;

  const totalAmount = rawCashOutAmount.toLocaleString();
  const requestMoneyFormatted = rawRequestMoney.toLocaleString();
  const custodianReceivedFormatted = rawCustodianReceived.toLocaleString();

  const bagBarcode = cashOut?.cash_out_bags?.map((bag) => bag?.bag?.barcode).join(", ") || "N/A";
  const tranId = cashOut.tran_id;

  console.log({ rawRequestMoney });

  return (
    <div className="w-full space-y-6 text-left">
      {/* 1. Header Section */}
      <div className="text-center pb-6 border-b border-slate-100">
        <p className="text-[10px] uppercase tracking-[2px] text-slate-400 font-bold mb-1">Total Cash Out</p>
        <h2 className="text-4xl font-black text-indigo-600 tracking-tight">৳{totalAmount}</h2>
        <div className="mt-3 flex justify-center gap-2">
          <span
            className={`px-3 py-1 ${cashOut.verifier_status === "verified" ? "bg-green-50 text-green-600" : "bg-yellow-50 text-yellow-600"} text-[10px] font-bold rounded-full border border-yellow-100 uppercase`}
          >
            Verifier: {cashOut.verifier_status}
          </span>
        </div>
      </div>

      {/* 2. Core Operational Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
        {/* Bag Info */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <HiOutlineInboxIn className="text-sm" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Bag Info</span>
          </div>
          <p className="text-sm font-mono font-bold text-slate-700 truncate" title={bagBarcode}>
            {bagBarcode}
          </p>
        </div>

        {/* Vault Info */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <HiOutlineLibrary className="text-sm" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Vault</span>
          </div>
          <p className="text-sm font-bold text-slate-700 truncate">{cashOut.vault?.name || "N/A"}</p>
        </div>

        {/* Transaction ID */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <HiOutlineHashtag className="text-sm" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Tran ID</span>
          </div>
          <p className="text-sm font-mono font-bold text-slate-700 truncate">{tranId}</p>
        </div>
      </div>

      {/* 3. Financial & Custodian breakdown */}
      <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-4">
        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Custodian Info & Settlement</h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
          {/* Total Cash Out (Gross) */}
          <div className="bg-white p-3 rounded-xl border border-slate-100">
            <span className="text-[9px] text-slate-400 font-semibold block uppercase mb-1">Total Cash Out</span>
            <span className="text-lg font-bold text-slate-700">৳{totalAmount}</span>
          </div>

          {/* Request Money */}
          <div className="bg-white p-3 rounded-xl border border-slate-100">
            <div className="flex items-center gap-1.5 text-rose-500 mb-1">
              <HiOutlineCash className="text-sm" />
              <span className="text-[9px] font-bold uppercase">Requested Money</span>
            </div>
            <span className="text-lg font-bold text-rose-600">- ৳{requestMoneyFormatted}</span>
          </div>

          {/* Custodian Net Received */}
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
              <HiOutlineDownload className="text-sm" />
              <span className="text-[9px] font-semibold uppercase">Custodian Received</span>
            </div>
            <span className="text-xl font-black text-emerald-700">৳{custodianReceivedFormatted}</span>
          </div>
        </div>
      </div>

      {/* 4. Side-by-Side Section (Linked Orders & Denominations) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Left Column: Linked Orders */}
        {/* <div className="space-y-3">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Linked Orders</h4>
          <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {cashOut.orders?.map((order) => (
              <div key={order.id} className="p-3 rounded-xl border border-slate-100 bg-white hover:border-indigo-100 transition-all">
                <div className="flex items-center gap-3 mb-1">
                  <p className="text-[11px] font-bold text-slate-700 truncate">{order.customer_name}</p>
                </div>
                <div className="flex justify-between items-end">
                  <p className="text-xs text-gray-500 font-mono tracking-tighter">{order.order_id}</p>
                  <p className="text-xs font-black text-slate-600">৳{parseFloat(order.total_cash_in_amount).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div> */}

        {/* Right Column: Denominations Table */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Total Withdraw</h4>
          <div className="overflow-hidden border border-slate-100 rounded-2xl bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase">Requested</th>
                  <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase text-center"></th>
                  <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {Object.entries(cashOut.denominations || {})
                  .filter(([_, count]) => count > 0)
                  .sort((a, b) => b[0] - a[0])
                  .map(([note, count]) => (
                    <tr key={note}>
                      <td className="px-3 py-2 text-[11px] font-bold text-slate-600">৳{note}</td>
                      <td className="px-3 py-2 text-[11px] text-center">
                        <span className="text-slate-500 font-medium">{count}</span>
                      </td>
                      <td className="px-3 py-2 text-[11px] font-black text-indigo-600 text-right">৳{(note * count).toLocaleString()}</td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="bg-indigo-50/30 border-t border-indigo-100">
                  <td colSpan="2" className="px-3 py-2 text-[9px] font-bold text-indigo-400 uppercase">
                    Sub Total
                  </td>
                  <td className="px-3 py-2 text-xs font-black text-indigo-600 text-right">৳{requestMoneyFormatted}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* 5. Footer: Prepared By */}
      <div className="pt-4 flex items-center justify-between text-slate-400 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <HiOutlineUser className="text-sm" />
          <span className="text-[10px]">
            Prepared by <span className="font-bold text-slate-600">{cashOut.user?.name}</span>
          </span>
        </div>
        <span className="text-[9px] font-mono opacity-50">{new Date(cashOut.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
};

export default CashOutCustodianModal;
