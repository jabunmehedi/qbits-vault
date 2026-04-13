import { UserIcon } from "lucide-react";
const baseStorageUrl = import.meta.env.VITE_REACT_APP_STORAGE_URL;

const Avatar = ({ src, name, size = "sm" }) => {
  const dim = size === "lg" ? "w-13 h-13" : "w-9 h-9";
  const icon = size === "lg" ? "w-6 h-6" : "w-4 h-4";

  return src ? (
    <img src={baseStorageUrl + "/" + src} alt={name} className={`${dim} rounded-xl object-cover border border-gray-200`} />
  ) : (
    <div className={`${dim} rounded-xl border border-gray-200 bg-white flex items-center justify-center`}>
      <UserIcon className={`${icon} text-gray-400`} />
    </div>
  );
};

export default Avatar;
