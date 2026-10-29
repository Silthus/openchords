export type BuiltInSheet = { name: string; chordPro: string };
export type BuiltInSong = { builtInId: string; sheets: [BuiltInSheet, ...BuiltInSheet[]] };
