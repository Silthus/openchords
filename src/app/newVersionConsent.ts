type Page = { reload: () => void; takeNewVersion: () => void };

export function newVersionConsent(page: Page) {
  let reloadAsked = false;
  let takenOverElsewhere = false;
  return {
    whenTakenOver() {
      if (reloadAsked) page.reload();
      else takenOverElsewhere = true;
    },
    reload() {
      reloadAsked = true;
      if (takenOverElsewhere) page.reload();
      else page.takeNewVersion();
    },
  };
}
