import { describe, expect, test } from "bun:test";
import { InvalidChordLayer, compose, layerOf, lyricsOf, parse, type ChordLayer } from ".";

const risingSun = `{title: House of the Rising Sun}
{artist: Traditional}
{key: Am}
{capo: 5}

{comment: Verse 1}
[Am]There is a [C]house in New Or[F]leans
And [Am]me, oh [E]Lord, for [Am]one [E]

{comment: Verse 2}
If I had listened what Mama said
`;

describe("parse", () => {
  const sheet = parse(risingSun);

  test("reads the title, artist, key and capo", () => {
    expect(sheet.meta).toEqual({ title: "House of the Rising Sun", artist: "Traditional", key: "Am", capo: 5 });
  });

  test("puts each chord over the word it starts or sits in", () => {
    expect(sheet.sections[0]?.lines[0]?.words).toEqual([
      { text: "There", chords: ["Am"] },
      { text: "is", chords: [] },
      { text: "a", chords: [] },
      { text: "house", chords: ["C"] },
      { text: "in", chords: [] },
      { text: "New", chords: [] },
      { text: "Orleans", chords: ["F"] },
    ]);
  });

  test("keeps a chord after the last word as a chord over no word", () => {
    expect(sheet.sections[0]?.lines[1]?.words.slice(-2)).toEqual([
      { text: "one", chords: ["Am"] },
      { text: "", chords: ["E"] },
    ]);
  });

  test("starts a section at each comment", () => {
    expect(sheet.sections.map((section) => [section.label, section.lines.length])).toEqual([
      ["Verse 1", 2],
      ["Verse 2", 1],
    ]);
  });

  test("defaults to no capo and an unlabelled section", () => {
    const plain = parse("{title: Song}\n{artist: Someone}\n[G]Hello");
    expect(plain.meta).toEqual({ title: "Song", artist: "Someone", capo: 0 });
    expect(plain.sections).toEqual([{ label: "", lines: [{ words: [{ text: "Hello", chords: ["G"] }] }] }]);
  });
});

describe("lyricsOf and layerOf split a sheet into its words and its chords", () => {
  const sheet = parse(risingSun);

  test("lyricsOf returns every lyric line without chords", () => {
    expect(lyricsOf(sheet)).toEqual([
      "There is a house in New Orleans",
      "And me, oh Lord, for one",
      "If I had listened what Mama said",
    ]);
  });

  test("layerOf anchors every chord to a line and a word", () => {
    expect(layerOf(sheet)).toEqual({
      key: "Am",
      capo: 5,
      sections: [
        { label: "Verse 1", fromLine: 0 },
        { label: "Verse 2", fromLine: 2 },
      ],
      lines: [
        { lyricLine: 0, chords: [{ word: 0, chord: "Am" }, { word: 3, chord: "C" }, { word: 6, chord: "F" }] },
        { lyricLine: 1, chords: [{ word: 1, chord: "Am" }, { word: 3, chord: "E" }, { word: 5, chord: "Am" }, { word: 6, chord: "E" }] },
        { lyricLine: 2, chords: [] },
      ],
    });
  });
});

describe("compose", () => {
  const meta = { title: "Amazing Grace", artist: "John Newton" };
  const lyrics = ["Amazing grace, how sweet the sound", "That saved a wretch like me"];
  const layer: ChordLayer = {
    key: "G",
    capo: 0,
    sections: [{ label: "Verse 1", fromLine: 0 }],
    lines: [{ lyricLine: 0, chords: [{ word: 0, chord: "G" }, { word: 3, chord: "C" }, { word: 5, chord: "G" }] }],
  };

  test("writes ChordPro with the chords over their words", () => {
    expect(compose(lyrics, layer, meta)).toBe(
      [
        "{title: Amazing Grace}",
        "{artist: John Newton}",
        "{key: G}",
        "{capo: 0}",
        "",
        "{comment: Verse 1}",
        "[G]Amazing grace, how [C]sweet the [G]sound",
        "That saved a wretch like me",
        "",
      ].join("\n"),
    );
  });

  test("starts an unlabelled section at each verse her words start", () => {
    const words = ["One", "Still one", "Two", "Three"];
    const chorusAtLastLine: ChordLayer = { capo: 0, sections: [{ label: "Chorus", fromLine: 3 }], lines: [] };
    const sections = parse(compose(words, chorusAtLastLine, meta, [2, 3])).sections;
    expect(sections.map((section) => [section.label, section.lines.length])).toEqual([
      ["", 2],
      ["", 1],
      ["Chorus", 1],
    ]);
  });

  test("gives back the same sheet that layerOf and lyricsOf took apart", () => {
    const sheet = parse(risingSun);
    expect(parse(compose(lyricsOf(sheet), layerOf(sheet), sheet.meta))).toEqual(sheet);
  });

  test("keeps brackets, braces and backslashes in her words as words, not chords or directives", () => {
    const words = ["[Chorus]", "I fell into a [burning] ring", "{spoken: come home}", "back\\slash"];
    const sheet = parse(compose(words, { capo: 0, sections: [], lines: [{ lyricLine: 1, chords: [{ word: 0, chord: "G" }] }] }, meta));
    expect(lyricsOf(sheet)).toEqual(words);
    expect(layerOf(sheet).lines.flatMap((line) => line.chords)).toEqual([{ word: 0, chord: "G" }]);
  });

  test.each([
    ["a line past the lyrics", { lyricLine: 2, chords: [] }],
    ["a word past the end of its line", { lyricLine: 1, chords: [{ word: 7, chord: "D" }] }],
  ])("refuses %s", (_, line) => {
    expect(() => compose(lyrics, { ...layer, lines: [line] }, meta)).toThrow(InvalidChordLayer);
  });
});
