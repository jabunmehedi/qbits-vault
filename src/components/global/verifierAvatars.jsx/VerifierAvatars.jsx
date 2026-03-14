// components/global/verifierAvatars/VerifierAvatars.jsx
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Check, X } from "lucide-react";

const VerifierAvatars = ({ requiredVerifiers = [] }) => {
  const [selectedVerifier, setSelectedVerifier] = useState(null); // only one tooltip at a time

  if (requiredVerifiers.length === 0) {
    return <span className="text-gray-400 text-xs italic">No verifiers assigned</span>;
  }

  const handleAvatarClick = (verifier, event) => {
    event.stopPropagation();
    setSelectedVerifier({
      verifier,
      position: {
        x: event.clientX,
        y: event.clientY,
      },
    });
  };

  const closeTooltip = () => {
    setSelectedVerifier(null);
  };

  return (
    <div className="relative">
      {/* Avatar Stack */}
      <div className="flex items-center -space-x-4 select-none">
        {requiredVerifiers.slice(0, 6).map((verifier, index) => {
          const isVerified = verifier.verified === 1 || verifier.verified === true || verifier.approved === 1 || verifier.verified === true;
          const name = verifier.user?.name || "Unknown User";
          const initials = name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return (
            <motion.div
              key={verifier.id || verifier.user_id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.2, zIndex: 50 }}
              onClick={(e) => handleAvatarClick(verifier, e)}
              className={`
                relative w-9 h-9 rounded-full flex items-center justify-center text-xs 
                border-3 border-white cursor-pointer 
                ${isVerified ? "bg-gradient-to-br from-cyan-500 to-cyan-600 text-white" : "bg-gray-300 text-gray-500"}
              `}
            >
              {initials}
            </motion.div>
          );
        })}

        {/* +N Badge */}
        {requiredVerifiers.length > 6 && (
          <div className="w-11 h-11 rounded-full bg-gray-300 text-gray-700 text-xs font-bold flex items-center justify-center border-4 border-white shadow-lg">
            +{requiredVerifiers.length - 6}
          </div>
        )}
      </div>

      {/* Individual Tooltip */}
      <AnimatePresence>
        {selectedVerifier && (
          <>
            {/* Backdrop */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} onClick={closeTooltip} />

            {/* Tooltip Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="fixed z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 w-72"
              style={{
                top: `${selectedVerifier.position.y - 40}px`,
                left: `${Math.min(
                  selectedVerifier.position.x - 350, // half of 288px width
                  window.innerWidth - 300
                )}px`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Arrow */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 bg-white border-l border-t border-gray-200 rotate-45" />

              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div
                  className={`
                    w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl
                    ${
                      selectedVerifier.verifier.verified === 1 ||
                      selectedVerifier.verifier.verified === true ||
                      selectedVerifier.verifier.approved === 1 ||
                      selectedVerifier.verifier.approved === true
                        ? "bg-gradient-to-br from-green-500 to-emerald-600"
                        : "bg-gradient-to-br from-gray-400 to-gray-600"
                    }
                  `}
                >
                  {selectedVerifier.verifier.user?.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <p className="font-medium text-gray-800 text-sm">{selectedVerifier.verifier.user?.name || "Unknown"}</p>
                  <p className="text-xs text-gray-500">{selectedVerifier.verifier.user?.email || "N/A"}</p>

                  {/* Status */}
                  <div className="mt-3 flex items-center gap-2">
                    {selectedVerifier.verifier.verified === 1 ||
                    selectedVerifier.verifier.verified === true ||
                    selectedVerifier.verifier.approved === 1 ||
                    selectedVerifier.verifier.approved === true ? (
                      <>
                        <Check className="w-5 h-5 text-green-600" />
                        <span className="text-green-600 font-semibold">Verified</span>
                      </>
                    ) : (
                      <>
                        <X className="w-5 h-5 text-orange-600" />
                        <span className="text-orange-600 font-semibold">Pending</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button onClick={closeTooltip} className="mt-5 w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition">
                Close
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VerifierAvatars;
