import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, CheckCircle, Loader2, Camera } from "lucide-react";
import { useRef, useState } from "react";
import { UpdateUser } from "../../services/User";
import { useDispatch, useSelector } from "react-redux";
import { patchAuthUser, selectAuthUser } from "../../store/authSlice";
import { useToast } from "../../hooks/useToast";

const storageUrl = import.meta.env.VITE_REACT_APP_STORAGE_URL;

const toUrl = (path) => (path ? `${storageUrl}/${path}` : null);

const ImageUploadSlot = ({ label, hint, file, preview, onChange, isAvatar }) => {
  const ref = useRef();
  const hasExisting = !!preview && !file;

  if (isAvatar) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div
          onClick={() => ref.current.click()}
          className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-all group"
        >
          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onChange} />
          {preview ? (
            <>
              <img src={preview} alt="Profile" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </>
          ) : (
            <Camera className="w-8 h-8 text-gray-300 group-hover:text-blue-400 transition-colors" />
          )}
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">{label}</p>
          {preview ? (
            <p className="text-xs text-green-600 font-medium flex items-center justify-center gap-1 mt-0.5">
              <CheckCircle className="w-3 h-3" />
              {file ? file.name : "Already set"}
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">Click to upload</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => ref.current.click()}
      className="flex-1 border-2 border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-all group min-h-[140px]"
    >
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onChange} />
      {preview ? (
        <div className="relative w-full flex flex-col items-center gap-2">
          <div className="relative w-full">
            <img src={preview} alt={label} className="w-full h-28 object-cover rounded-xl" />
            <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <Camera className="w-4 h-4 text-white" />
              <span className="text-white text-xs font-medium">Change</span>
            </div>
          </div>
          <p className="text-xs text-green-600 font-semibold flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            {file ? file.name : (hasExisting ? "Already set" : "Uploaded")}
          </p>
        </div>
      ) : (
        <>
          <div className="w-10 h-10 bg-gray-100 group-hover:bg-blue-100 rounded-xl flex items-center justify-center transition-colors">
            <Upload className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700">{label}</p>
            {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
            <p className="text-xs text-gray-400">Click to upload</p>
          </div>
        </>
      )}
    </div>
  );
};

const KYCUploadModal = ({ isOpen, onClose, onSuccess }) => {
  const user = useSelector(selectAuthUser);
  const dispatch = useDispatch();
  const { addToast } = useToast();

  const [profileFile, setProfileFile] = useState(null);
  const [nidFront, setNidFront] = useState(null);
  const [nidBack, setNidBack] = useState(null);

  const [previewProfile, setPreviewProfile] = useState(() => toUrl(user?.img));
  const [previewFront, setPreviewFront] = useState(() => toUrl(user?.nid_front_img));
  const [previewBack, setPreviewBack] = useState(() => toUrl(user?.nid_back_img));

  const [loading, setLoading] = useState(false);

  const handleFile = (fileSetter, previewSetter) => (e) => {
    const file = e.target.files[0];
    if (!file) return;
    fileSetter(file);
    previewSetter(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      if (profileFile) formData.append("img", profileFile);
      if (nidFront) formData.append("nid_front_img", nidFront);
      if (nidBack) formData.append("nid_back_img", nidBack);

      const res = await UpdateUser(user.id, formData);

      if (!res || res?.status >= 400) {
        addToast({ type: "error", message: res?.data?.message || res?.message || "Failed to upload documents." });
        return;
      }

      // Patch Redux with uploaded image paths so the next modal open shows previews.
      // kyc_verified_at is NOT set here — admin must verify first.
      const updated = res?.data ?? {};
      dispatch(patchAuthUser({
        img: updated.img ?? user.img,
        nid_front_img: updated.nid_front_img ?? user.nid_front_img,
        nid_back_img: updated.nid_back_img ?? user.nid_back_img,
      }));
      addToast({ type: "success", message: "Documents submitted. Pending admin verification." });
      onSuccess?.();
      onClose();
    } catch {
      addToast({ type: "error", message: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  // A slot is satisfied if user already has the image set OR has selected a new file.
  const canSubmit = !!previewProfile && !!previewFront && !!previewBack;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[32px] p-8 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-[#1e293b] mb-1">Upload KYC Documents</h2>
            <p className="text-sm text-gray-400 mb-6">
              Upload your profile photo and a clear photo of the front and back of your National ID card.
            </p>

            <div className="flex justify-center mb-6">
              <ImageUploadSlot
                label="Profile Photo"
                file={profileFile}
                preview={previewProfile}
                onChange={handleFile(setProfileFile, setPreviewProfile)}
                isAvatar
              />
            </div>

            <div className="flex gap-4 mb-6">
              <ImageUploadSlot
                label="NID Front"
                hint="National ID – front side"
                file={nidFront}
                preview={previewFront}
                onChange={handleFile(setNidFront, setPreviewFront)}
              />
              <ImageUploadSlot
                label="NID Back"
                hint="National ID – back side"
                file={nidBack}
                preview={previewBack}
                onChange={handleFile(setNidBack, setPreviewBack)}
              />
            </div>

            {!canSubmit && (
              <p className="text-xs text-red-400 text-center mb-4">All three fields are required.</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || loading}
                className="flex-1 py-3 rounded-2xl bg-[#0f172a] text-white text-sm font-semibold hover:bg-[#1e293b] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : "Submit KYC"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default KYCUploadModal;
