import { test } from "@e2e-dev/web";
import { expect } from "e2e";

const legend = "Dots: where your fingers go. Numbers: which finger. O: play the string open. X: skip it.";

test("She learns the shapes before she plays", async ({ agent, app, screen }) => {
  await app.open("/");
  await agent.act("Open House of the Rising Sun");
  await agent.waitFor("the Song's title is shown");
  await expect(screen.getByText("Traditional · Classic · Key Am · No capo")).toBeVisible();
  const chordsInThisSong = screen.getByRole("region", "Chords in this song");
  for (const chord of ["Am", "C", "D", "F", "E"]) {
    await expect(chordsInThisSong.getByRole("img", `${chord} chord diagram`)).toBeVisible();
  }
  await expect(chordsInThisSong.getByRole("img")).toHaveCount(5);
  await expect(chordsInThisSong.getByText(legend)).toBeVisible();
  await agent.assert("a block titled Chords in this song shows a diagram for each chord of the Song with a legend under it", { vision: true });
  await app.screenshot("Every Chord diagram of the Song sits above the lyrics");

  await agent.act("Tap the first Am chord over the lyrics");
  await expect(screen.getByRole("dialog", "Am large").getByRole("img", "Am chord diagram")).toBeVisible();
  await agent.assert("a large Am diagram covers the Song", { vision: true });
  await app.screenshot("Tapping a chord shows its diagram large");

  await agent.act("Tap the large diagram");
  await expect(screen.getByRole("dialog")).toBeHidden();
  await agent.assert("the large diagram no longer covers the Song and the lyrics are visible", { vision: true });
  await app.screenshot("One tap closes the diagram");
});
