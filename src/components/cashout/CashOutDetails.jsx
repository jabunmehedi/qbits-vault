import { HiOutlineHashtag, HiOutlineUser, HiOutlineInboxIn, HiOutlineCash, HiOutlineDownload, HiOutlineDocumentText } from "react-icons/hi";

const CashOutDetails = ({ cashOut }) => {
  if (!cashOut) return null;

  const totalAmount = parseFloat(cashOut.cash_out_amount).toLocaleString();
  const requestAmount = parseFloat(cashOut.request_amount).toLocaleString();
  const custodianReceivedFormatted = parseFloat(cashOut.custodian?.amount).toLocaleString();
  const bagBarcode = cashOut?.cash_out_bags?.map((bag) => bag?.bag?.barcode).join(", ") || "N/A";
  const tranId = cashOut.tran_id;

  return (
    <div className="w-full space-y-6 text-left">
      {/* 1. Header Section */}
      <div className="text-center pb-6 border-b border-slate-100">
        <p className="text-[10px] uppercase tracking-[2px] text-slate-400 font-bold mb-1">Total Cash Out</p>
        <h2 className="text-4xl font-black text-indigo-600 tracking-tight">৳{totalAmount}</h2>
        <div className="mt-3 flex justify-center gap-2">
          <span
            className={`px-3 py-1 ${cashOut.verifier_status == "verified" ? "bg-green-50 text-green-600" : "bg-yellow-50 text-yellow-600"} text-[10px] font-bold rounded-full border border-yellow-100 uppercase`}
          >
            Verifier: {cashOut.verifier_status}
          </span>
          <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full border border-blue-100 uppercase">
            Vault: {cashOut.vault?.name}
          </span>
        </div>
      </div>

      {/* 2. Quick Info Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <HiOutlineInboxIn className="text-sm" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Bag Barcodes</span>
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

      {/* Purpose / Note entered by the requester during cash-out submission */}
      {cashOut.note && (
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <HiOutlineDocumentText className="text-sm" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Purpose / Note</span>
          </div>
          <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap break-words">{cashOut.note}</p>
        </div>
      )}

      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
          {/* Total Cash Out (Gross) */}
          <div className="bg-white p-3 rounded-xl border border-slate-100">
            <span className="text-[9px] text-slate-400 font-semibold block uppercase mb-1">Total Cash Out</span>
            <span className="text-lg font-bold text-slate-700">৳{totalAmount || 0}</span>
          </div>

          {/* Request Money */}
          <div className="bg-white p-3 rounded-xl border border-slate-100">
            <div className="flex items-center gap-1.5 text-rose-500 mb-1">
              <HiOutlineCash className="text-sm" />
              <span className="text-[9px] font-bold uppercase">Requested Money</span>
            </div>
            <span className="text-lg font-bold text-rose-600">- ৳{requestAmount || 0}</span>
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
      </>

      {/* 4. Footer: Prepared By */}
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

export default CashOutDetails;
