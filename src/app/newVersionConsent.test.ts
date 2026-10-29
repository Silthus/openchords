import { describe, expect, mock, test } from "bun:test";
import { newVersionConsent } from "./newVersionConsent";

function aPage() {
  const page = { reload: mock(), takeNewVersion: mock() };
  return { page, consent: newVersionConsent(page) };
}

describe("newVersionConsent", () => {
  test("her Reload takes the new version, and the page reloads once it is in charge", () => {
    const { page, consent } = aPage();
    consent.reload();
    expect(page.takeNewVersion).toHaveBeenCalledTimes(1);
    expect(page.reload).not.toHaveBeenCalled();

    consent.whenTakenOver();
    expect(page.reload).toHaveBeenCalledTimes(1);
  });

  test("a new version taken in another page leaves her Song alone", () => {
    const { page, consent } = aPage();
    consent.whenTakenOver();
    expect(page.reload).not.toHaveBeenCalled();
  });

  test("after another page took the new version, her Reload reloads at once", () => {
    const { page, consent } = aPage();
    consent.whenTakenOver();
    consent.reload();
    expect(page.reload).toHaveBeenCalledTimes(1);
    expect(page.takeNewVersion).not.toHaveBeenCalled();
  });
});
