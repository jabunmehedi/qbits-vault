import { LuBox } from "react-icons/lu";
import Drawer from "../../global/drawer/Drawer";

const BagDetailsDrawer = ({ bag, isOpen, onClose }) => {
//   console.log({ bag });
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2 rounded-md">
            <LuBox className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-gray-600">Bag Details</span>
            <span className="text-gray-400 text-sm font-medium">{bag?.bag?.barcode}</span>
          </div>
        </div>
      }
      className="bg-[#fff] max-w-md"
    >
      <div className="flex flex-col gap-6 py-2 px-6">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 block">Information</span>
        <div className="flex items-center justify-between gap-4">
          <div className="bg-slate-50/70 border border-gray-200 py-2 px-4 rounded-lg w-full">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Status</span>
            <span className="text-green-800 uppercase text-sm font-semibold">{bag?.status}</span>
          </div>
          <div className="bg-slate-50/70 border border-gray-200 py-2 px-4 rounded-lg w-full">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Weight</span>
            <span className="text-gray-800 uppercase text-sm font-semibold">1.25 KG</span>
          </div>
        </div>
      </div>
    </Drawer>
  );
};

export default BagDetailsDrawer;
