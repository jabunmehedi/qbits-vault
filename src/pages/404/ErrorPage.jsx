import { useNavigate, useRouteError } from "react-router-dom";
// import ButtonYellow from "../global/Button/ButtonYellow";

export default function ErrorPage() {
  const navigate = useNavigate();
  const error = useRouteError();

  return (
    <div className="min-h-screen text-white flex flex-col items-center justify-center bg-dark800 p-6">
      <h1 className="text-3xl font-bold text-white mb-4">404</h1>
      <p className="mb-2 text-red300 text-xl">{error?.message || "An unexpected error occurred."}</p>

      {error?.stack && (
        <details className="bg-gray800 border border-gray500 p-4 rounded text-xs text-green200 whitespace-pre-wrap">
          <summary className="cursor-pointer font-semibold">View stack trace</summary>
          <pre>{error.stack}</pre>
        </details>
      )}

      {/* <ButtonYellow className="mt-5" size="md" text="Back" onClick={() => navigate(-1)} /> */}
      <></>
    </div>
  );
}
