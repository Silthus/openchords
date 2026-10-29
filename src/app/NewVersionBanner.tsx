import { useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

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
  const reloadAsked = useRef(false);
  const takenOverElsewhere = useRef(false);
  const {
    needRefresh: [ready],
    updateServiceWorker,
  } = useRegisterSW({
    onNeedReload() {
      if (reloadAsked.current) window.location.reload();
      else takenOverElsewhere.current = true;
    },
  });
  return {
    ready,
    reload() {
      reloadAsked.current = true;
      if (takenOverElsewhere.current) window.location.reload();
      else void updateServiceWorker();
    },
  };
}
