import { HiOutlineHashtag, HiOutlineUser, HiOutlineInboxIn } from "react-icons/hi";

const CashInDetails = ({ cashIn }) => {
  if (!cashIn) return null;

  //   console.log({cashIn})

  const totalAmount = parseFloat(cashIn.cash_in_amount).toLocaleString();
  const bagBarcode = cashIn.bags?.barcode || "N/A";
  const tranId = cashIn.tran_id;

  return (
    <div className="w-full space-y-6 text-left">
      {/* 1. Header Section */}
      <div className="text-center pb-6 border-b border-slate-100">
        <p className="text-[10px] uppercase tracking-[2px] text-slate-400 font-bold mb-1">Total Cash In</p>
        <h2 className="text-4xl font-black text-indigo-600 tracking-tight">৳{totalAmount}</h2>
        <div className="mt-3 flex justify-center gap-2">
          <span className="px-3 py-1 bg-yellow-50 text-yellow-600 text-[10px] font-bold rounded-full border border-yellow-100 uppercase">
            Verifier: {cashIn.verifier_status}
          </span>
          <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full border border-blue-100 uppercase">
            Vault: {cashIn.vault?.name}
          </span>
        </div>
      </div>

      {/* 2. Quick Info Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <HiOutlineInboxIn className="text-sm" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Bag Barcode</span>
          </div>
          <p className="text-sm font-mono font-bold text-slate-700 truncate">{bagBarcode}</p>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <HiOutlineHashtag className="text-sm" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Tran ID</span>
          </div>
          <p className="text-sm font-mono font-bold text-slate-700 truncate">{tranId}</p>
        </div>
      </div>

      {/* 3. Side-by-Side Section (Linked Orders & Denominations) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
        {/* Left Column: Linked Orders */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Linked Orders</h4>
          <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {cashIn.orders?.map((order) => (
              <div key={order.id} className="p-3 rounded-xl border border-slate-100 bg-white hover:border-indigo-100 transition-all">
                <div className="flex items-center gap-3 mb-1">
                  {/* <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-[10px] font-bold uppercase">
                    {order.customer_name?.charAt(0)}
                  </div> */}
                  <p className="text-[11px] font-bold text-slate-700 truncate">{order.customer_name}</p>
                </div>
                <div className="flex justify-between items-end">
                  <p className="text-xs text-gray-500 font-mono tracking-tighter">{order.order_id}</p>
                  <p className="text-xs font-black text-slate-600">৳{parseFloat(order.total_cash_in_amount).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Denominations Table */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Denominations</h4>
          <div className="overflow-hidden border border-slate-100 rounded-2xl bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase">Note</th>
                  <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase text-center">Qty</th>
                  <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {Object.entries(cashIn.denominations || {})
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
                  <td className="px-3 py-2 text-xs font-black text-indigo-600 text-right">৳{totalAmount}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* 4. Footer: Prepared By */}
      <div className="pt-4 flex items-center justify-between text-slate-400 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <HiOutlineUser className="text-sm" />
          <span className="text-[10px]">
            Prepared by <span className="font-bold text-slate-600">{cashIn.user?.name}</span>
          </span>
        </div>
        <span className="text-[9px] font-mono opacity-50">{new Date(cashIn.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
};

export default CashInDetails;
