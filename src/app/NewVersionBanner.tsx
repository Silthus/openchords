import { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { newVersionConsent } from "./newVersionConsent";

export function NewVersionBanner() {
  const { ready, reload } = useNewVersion();
  if (!ready) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-28 z-20 flex justify-center px-3 pb-[env(safe-area-inset-bottom)]">
      <p className="flex items-center gap-3 rounded-full bg-stone-900/90 py-2 pr-2 pl-4 text-sm text-white shadow-lg">
        New version ready.
        <button type="button" onClick={reload} className="rounded-full bg-orange-500 px-3 py-1 font-semibold">
          Reload
        </button>
      </p>
    </div>
  );
}

function useNewVersion() {
  const [consent] = useState(() =>
    newVersionConsent({ reload: () => window.location.reload(), takeNewVersion: () => void updateServiceWorker() }),
  );
  const {
    needRefresh: [ready],
    updateServiceWorker,
  } = useRegisterSW({ onNeedReload: () => consent.whenTakenOver() });
  return { ready, reload: consent.reload };
}
