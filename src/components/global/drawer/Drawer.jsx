import { AnimatePresence, motion } from "framer-motion";
import { AiOutlineClose } from "react-icons/ai";

const Drawer = ({ isOpen, onClose, children, title = "Drawer" }) => {
  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeInOut" }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[60]"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 220,
              mass: 0.8,
            }}
            className="fixed right-0 top-0 h-full w-[40%] bg-white z-[70] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            {/* <div className="flex items-center justify-between p-6 border-b border-[#353857]">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <AiOutlineClose className="w-6 h-6 text-gray-400" />
          </button>
        </div> */}

            {/* Content */}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Drawer;
