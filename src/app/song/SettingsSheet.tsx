import { useConvexAuth } from "convex/react";
import { parse, type View } from "../../sheet";
import { SignOutButton } from "../signIn";
import { textSizes, useLook, useTextSize, type Look } from "../deviceSettings";
import { useModalDialog } from "../useModalDialog";
import { describeCapo, describeChordSheet, type Origin } from "./describeChordSheet";
import { SongLink } from "./SongLink";

export type ChordSheetChoice = { chordSheetId: string; name: string; origin: Origin; chordPro: string; replaces: string[] };
export const speeds = { slowest: 1, fastest: 10 };
export const transpositions = { lowest: -11, highest: 11 };
export const capos = { none: 0, highest: 11 };

type SettingsSheetProps<Sheet extends ChordSheetChoice> = {
  songId: string;
  sheets: Sheet[];
  chosenId: string;
  onChordSheet: (picked: Sheet) => void;
  shownKey: string | undefined;
  view: View;
  easierCapo: number | null;
  onView: (view: View) => void;
  speed: number;
  onSpeed: (speed: number) => void;
  onFixChords: () => void;
  onClose: () => void;
};

export function SettingsSheet<Sheet extends ChordSheetChoice>({
  songId,
  sheets,
  chosenId,
  onChordSheet,
  shownKey,
  view,
  easierCapo,
  onView,
  speed,
  onSpeed,
  onFixChords,
  onClose,
}: SettingsSheetProps<Sheet>) {
  const dialog = useModalDialog();
  const [textSize, setTextSize] = useTextSize();
  const close = () => dialog.current?.close();
  return (
    <dialog
      ref={dialog}
      aria-label="Settings"
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && close()}
      className="mx-auto mt-auto mb-0 max-h-[85%] w-full max-w-2xl bg-transparent text-ink backdrop:bg-black/50"
    >
      <div className="rounded-t-3xl bg-page p-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <h2 className="mb-2 text-sm font-bold tracking-wide text-muted uppercase">Chord sheet</h2>
        <ChordSheetCards songId={songId} sheets={sheets} chosenId={chosenId} onPick={onChordSheet} />
        <FixChordsButton onClick={onFixChords} />
        <div className="mt-4 divide-y divide-line">
          <LookSwitch />
          <Stepper
            label="Key"
            value={shownKey ?? signed(view.transpose)}
            hint="Moves the whole song higher or lower to suit your voice."
            step={(by) => onView({ ...view, transpose: view.transpose + by })}
            lowest={view.transpose <= transpositions.lowest}
            highest={view.transpose >= transpositions.highest}
          />
          <Stepper
            label="Capo"
            value={describeCapo(view.capo)}
            hint="A clamp across the neck: same key, easier finger shapes."
            step={(by) => onView({ ...view, capo: view.capo + by })}
            lowest={view.capo <= capos.none}
            highest={view.capo >= capos.highest}
          />
          {easierCapo !== null && (
            <button type="button" onClick={() => onView({ ...view, capo: easierCapo })} className="mb-3 w-full rounded-xl bg-orange-500 py-2 font-semibold text-white">
              Make it easier: {describeCapo(easierCapo).toLowerCase()}
            </button>
          )}
          <Stepper label="Scroll speed" value={String(speed)} hint="How fast the lyrics move while playing." step={(by) => onSpeed(speed + by)} lowest={speed <= speeds.slowest} highest={speed >= speeds.fastest} />
          <Stepper
            label="Text size"
            value={`${textSize}%`}
            hint="Bigger text to read from further away."
            step={(by) => setTextSize(textSize + by * textSizes.step)}
            lowest={textSize <= textSizes.smallest}
            highest={textSize >= textSizes.largest}
          />
        </div>
        <button type="button" onClick={close} className="mt-4 w-full rounded-xl bg-panel py-3 font-semibold">
          Done
        </button>
        <SignOutButton />
      </div>
    </dialog>
  );
}

type ChordSheetCardsProps<Sheet> = { songId: string; sheets: Sheet[]; chosenId: string; onPick: (picked: Sheet) => void };

function ChordSheetCards<Sheet extends ChordSheetChoice>({ songId, sheets, chosenId, onPick }: ChordSheetCardsProps<Sheet>) {
  return (
    <ul className="flex flex-col gap-2">
      {sheets.map((sheet) => {
        const chosen = sheet.chordSheetId === chosenId;
        return (
          <li key={sheet.chordSheetId}>
            <SongLink
              songId={songId}
              chordSheetId={sheet.chordSheetId}
              inPlace
              current={chosen}
              onClick={() => onPick(sheet)}
              className={`block rounded-xl border p-3 ${chosen ? "border-accent bg-accent/10" : "border-line"}`}
            >
              <span className="block font-semibold">{sheet.name}</span>
              <span className="block text-sm text-muted">{describeChordSheet(sheet.origin, parse(sheet.chordPro).meta)}</span>
            </SongLink>
          </li>
        );
      })}
    </ul>
  );
}

function FixChordsButton({ onClick }: { onClick: () => void }) {
  const { isAuthenticated } = useConvexAuth();
  if (!isAuthenticated) return null;
  return (
    <button type="button" onClick={onClick} className="mt-2 w-full rounded-xl border border-line py-3 font-semibold">
      Fix chords
    </button>
  );
}

function signed(semitones: number) {
  return semitones > 0 ? `+${semitones}` : String(semitones);
}

const looks: Array<[Look, string]> = [
  ["light", "☀︎ Light"],
  ["dark", "☾ Dark"],
];

function LookSwitch() {
  const [look, setLook] = useLook();
  return (
    <div className="flex items-center justify-between py-3">
      <span className="font-semibold">Look</span>
      <div className="flex rounded-full bg-panel p-1">
        {looks.map(([choice, label]) => (
          <button
            key={choice}
            type="button"
            aria-pressed={look === choice}
            onClick={() => setLook(choice)}
            className={`rounded-full px-4 py-1.5 font-semibold ${look === choice ? "bg-orange-500 text-white" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

type StepperProps = { label: string; value: string; hint: string; step: (by: number) => void; lowest: boolean; highest: boolean };

function Stepper({ label, value, hint, step, lowest, highest }: StepperProps) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{label}</span>
        <div className="flex items-center gap-3">
          <StepButton label={`${label} −`} disabled={lowest} onClick={() => step(-1)}>
            −
          </StepButton>
          <span className="w-28 text-center text-lg font-bold">{value}</span>
          <StepButton label={`${label} +`} disabled={highest} onClick={() => step(1)}>
            +
          </StepButton>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">{hint}</p>
    </div>
  );
}

function StepButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="size-11 rounded-full bg-panel text-2xl disabled:opacity-40">
      {children}
    </button>
  );
}
