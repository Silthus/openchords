import { useRegisterSW } from "virtual:pwa-register/react";

export function NewVersionBanner() {
  const {
    needRefresh: [newVersionReady],
    updateServiceWorker,
  } = useRegisterSW();
  if (!newVersionReady) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-20 flex justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <p className="flex items-center gap-3 rounded-full bg-stone-900/90 py-2 pr-2 pl-4 text-sm text-white shadow-lg">
        New version ready.
        <button type="button" onClick={() => updateServiceWorker()} className="rounded-full bg-orange-500 px-3 py-1 font-semibold">
          Reload
        </button>
      </p>
    </div>
  );
}
