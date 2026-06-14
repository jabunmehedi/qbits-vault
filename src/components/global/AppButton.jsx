import { Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * Unified button component. Base style mirrors the "New User" button on the User page.
 *
 * variant="primary"   — blue fill  (default)
 * variant="secondary" — white/bordered cancel style
 * variant="ghost"     — no border, text only (for inline actions like Back/Reset)
 */
const AppButton = ({ children, variant = "primary", loading = false, loadingText, icon, className = "", ...props }) => {
  const base = "inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-[#1a73e8] hover:bg-blue-600 text-white shadow-lg shadow-blue-200",
    secondary: "bg-white border border-gray-200 text-gray-600 hover:text-red-400 hover:bg-gray-50",
    ghost: "text-gray-500 hover:text-gray-800 hover:bg-gray-50",
  };

  return (
    <button {...props} disabled={props.disabled || loading} className={cn(base, variants[variant], className)}>
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {loadingText ?? children}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
};

export default AppButton;
