const appEnv = import.meta.env.VITE_APP_ENV;

export function DevBanner() {
  if (appEnv === "prod" || appEnv === undefined) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-accent-danger px-3 py-1 text-xs font-semibold text-white">
      {appEnv.toUpperCase()} ENVIRONMENT
    </div>
  );
}
