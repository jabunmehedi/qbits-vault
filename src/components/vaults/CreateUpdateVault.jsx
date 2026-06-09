import { GoDatabase } from "react-icons/go";
import CustomModal from "../global/modal/CustomModal";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { FiBox } from "react-icons/fi";
import { AiOutlinePlus } from "react-icons/ai";

const CreateUpdateVault = ({
  isEditMode,
  isCloseModal,
  generatedVaultCode,
  handleSubmit,
  register,
  errors,
  onSubmit,
  deleteErrors,
  bags,
  setBags,
  addBag,
  setRackErrors,
  rackErrors,
  removeBag,
  watchedBagLimit,
  isLoading,
  watchedTotalRacks,
}) => {
  return (
    <CustomModal
      title={
        <div className="flex items-center gap-2">
          <GoDatabase className="text-blue-700" /> {isEditMode ? "Edit Vault Configuration" : "New Vault Configuration"}
        </div>
      }
      isCloseModal={isCloseModal}
      className="max-w-5xl"
    >
      <form className="space-y-6 mt-6" onSubmit={handleSubmit(onSubmit)}>
        {/* Delete errors banner */}
        {deleteErrors.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <p className="text-sm font-semibold text-amber-700">Some bags could not be deleted</p>
            </div>
            <ul className="space-y-1">
              {deleteErrors.map((err, i) => (
                <li key={i} className="text-xs text-amber-600">
                  • {err.message}
                </li>
              ))}
            </ul>
            <p className="text-xs text-amber-500 mt-2">Zero the bag amount first, then save again.</p>
          </div>
        )}

        <div className="space-y-5">
          <div className="">
            <div>
              <label className="block  uppercase tracking-wider font-semibold text-xs text-gray-400 mb-2">Vault Name *</label>
              <input
                {...register("name", { required: "Vault name is required" })}
                className={`w-full px-4 py-2 bg-[#F8FAFC] border ${errors.name ? "border-red-500" : "border-gray-100"} rounded-lg placeholder:text-xs focus:border-blue-300 focus:outline-none transition`}
                placeholder="e.g. SM Office"
              />
              {errors.name && <span className="text-[10px] text-red-500 mt-1">{errors.name.message}</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block  uppercase tracking-wider font-semibold text-xs text-gray-400 mb-2">Total Racks (optional)</label>
              <input
                type="number"
                {...register("total_racks")}
                className="w-full px-4 py-2 bg-[#F8FAFC] border border-gray-100 placeholder:text-xs rounded-lg focus:outline-none focus:border-blue-300"
                placeholder="e.g. 10"
              />
            </div>
            <div>
              <label className="block  uppercase tracking-wider font-semibold text-xs text-gray-400 mb-2">Vault Code (AUTO)</label>
              <input
                value={generatedVaultCode}
                // type="number"
                readOnly
                {...register("vault_code")}
                className="w-full px-4 py-2 font-semibold read-only bg-[#F8FAFC] border border-gray-100 placeholder:text-xs rounded-lg focus:outline-none focus:border-blue-300"
                placeholder="e.g. 10"
              />
            </div>
          </div>
          <div>
            <label className="block  uppercase tracking-wider font-semibold text-xs text-gray-400 mb-2">Address *</label>
            <textarea
              {...register("address", { required: "Address is required" })}
              className={`w-full px-4 py-2 bg-[#F8FAFC] border ${errors.address ? "border-red-500" : "border-gray-100"} rounded-lg placeholder:text-xs focus:outline-none focus:border-blue-300`}
              placeholder="123 Bank Street..."
            />
            {errors.address && <span className="text-[10px] text-red-500 mt-1">{errors.address.message}</span>}
          </div>

          {/* Bags */}
          <div className="bg-[#F7FBFF] p-4 rounded-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <FiBox className="w-6 h-6 text-blue-600" />
                <label className="text-sm font-semibold text-gray-600">Bags Association</label>
              </div>
              <div className="flex uppercase font-semibold items-center gap-2 cursor-pointer px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-xs text-blue-400 ">
                Limit
                <input
                  type="text"
                  {...register("bag_limit")}
                  placeholder="∞"
                  className="p-2 px-4 w-24 text-center bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {/* Grid Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {bags.map((bag) => {
                  const amount = parseFloat(bag.current_amount || 0);
                  const hasAmt = amount > 0;
                  const isError = deleteErrors.some((e) => e.barcode === bag.barcode);

                  return (
                    <motion.div
                      key={bag.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={`relative group flex items-center justify-between p-5 bg-white rounded-2xl border transition-all ${
                        isError ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-blue-200"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-50 w-10 h-10 flex justify-center items-center rounded-xl">
                          <FiBox className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="uppercase text-[10px] font-bold text-gray-400 tracking-wider">Bag ID</p>
                          <p className="text-[#1A335E] text-sm font-bold">{bag.barcode || "707_000"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="uppercase text-[10px] font-bold text-blue-400 tracking-wider">Initial Amount</p>
                          <p className="text-[#1A335E] text-sm font-bold">৳ {amount.toFixed(2)}</p>
                        </div>
                        <div className="text-left">
                          <p className="uppercase text-[10px] font-bold text-indigo-400 tracking-wider">Rack Number</p>
                          <input
                            type="text"
                            placeholder="Rack Number"
                            // Show visually "1" if total rack constraint isn't provided
                            value={!watchedTotalRacks || watchedTotalRacks <= 0 ? "1" : bag.rack_number || ""}
                            disabled={!watchedTotalRacks || watchedTotalRacks <= 0}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              setBags((prev) => prev.map((b) => (b.id === bag.id ? { ...b, rack_number: val } : b)));
                              setRackErrors((prev) => {
                                const u = { ...prev };
                                delete u[bag.id];
                                return u;
                              });
                            }}
                            className={`max-w-[100px] h-[34px] px-2 py-1 placeholder:text-xs rounded-lg focus:outline-none border transition-colors ${
                              !watchedTotalRacks || watchedTotalRacks <= 0
                                ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed select-none"
                                : `bg-[#F8FAFC] focus:border-blue-300 ${rackErrors[bag.id] ? "border-red-400" : "border-gray-200"}`
                            }`}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeBag(bag.id)}
                          className={`transition-colors ${hasAmt ? "text-gray-200 cursor-not-allowed" : "text-gray-300 hover:text-red-500"}`}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Add Bag Button Styled as a Card */}
                <motion.button
                  layout
                  onClick={addBag}
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex flex-col items-center justify-center p-6 border-2 border-dashed border-blue-200 rounded-2xl bg-blue-50/30 hover:bg-blue-50 transition-colors min-h-[92px] ${watchedBagLimit > 0 && bags?.length >= watchedBagLimit ? "cursor-not-allowed border-gray-300 bg-gray-100 hover:bg-gray-100" : "cursor-pointer"}`}
                >
                  <div className="flex  items-center gap-2 text-blue-400 font-semibold">
                    <AiOutlinePlus className="w-5 h-5" />
                    <span className=" text-sm font-bold text-blue-600">
                      {watchedBagLimit > 0 && bags.length >= watchedBagLimit ? <span className="text-red-400">Limit Reached</span> : "Add New Bag"}
                    </span>
                    {watchedBagLimit > 0 && (
                      <span className="text-[10px] text-gray-400 uppercase mt-1">
                        {bags.length} / {watchedBagLimit} Used
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-blue-300 mt-1 font-medium">Auto-generated ID with ৳ 0.00 base</p>
                </motion.button>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-10 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={isCloseModal}
            className="flex-1 text-black py-3 border border-gray-200 rounded-xl  hover:text-red-400 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`flex-1 py-3 flex justify-center items-center  text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition ${isLoading ? "cursor-not-allowed bg-[#f7fbff] border border-blue-100" : " bg-gradient-to-r from-blue-600 to-purple-600"}`}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin text-blue-400" /> : isEditMode ? "Save Changes" : "Create Vault"}
          </button>
        </div>
      </form>
    </CustomModal>
  );
};

export default CreateUpdateVault;
