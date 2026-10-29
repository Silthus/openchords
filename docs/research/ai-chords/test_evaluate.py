import unittest
import json
from pathlib import Path
import tempfile
from unittest.mock import patch

from evaluate import chord, parse_reference, sequence_accuracy, score, pitch


class ChordScoringTests(unittest.TestCase):
    def test_enharmonics_german_and_capo_agree_in_sounding_pitch(self):
        self.assertEqual(pitch("E♭"), pitch("D#"))
        self.assertEqual(chord("F#min7/C#"), chord("Gbm7/Db"))
        self.assertEqual(chord("H7", german=True), chord("B7"))
        self.assertEqual(chord("B", german=True), chord("Bb"))
        self.assertEqual(chord("Am", shift=2), chord("B:min"))

    def test_extensions_inversions_and_chord_quality_are_not_erased(self):
        self.assertNotEqual(chord("C"), chord("Cm"))
        self.assertNotEqual(chord("C7"), chord("Cmaj7"))
        self.assertNotEqual(chord("C/E"), chord("C"))
        self.assertEqual(chord("C:maj/3"), chord("C/E"))
        self.assertEqual(chord("Bm7b5"), chord("B:hdim7"))

    def test_missing_and_extra_chords_cost_accuracy(self):
        a, b, c = chord("Am"), chord("F"), chord("G")
        self.assertEqual(sequence_accuracy([a, b, c], [a, b, c]), 1)
        self.assertEqual(sequence_accuracy([a, b, c], []), 0)
        self.assertAlmostEqual(sequence_accuracy([a, b, c], [a, c]), 2 / 3)
        self.assertEqual(sequence_accuracy([a, b], [b, a]), 0)

    def test_reference_bars_dots_and_repeats_preserve_performance_order(self):
        text = "# tonic: A\n0.0\tsilence\n1.0\tA, verse, | A:min . | F:maj G:maj | x2\n9.0\t| A:min |\n10.0\tB, chorus, | C:maj | G:maj |\n15.0\tend\n"
        reference = parse_reference(text)
        self.assertEqual(reference["tonic"], "A")
        self.assertEqual([s["name"] for s in reference["sections"]], ["verse", "chorus"])
        self.assertEqual(reference["sections"][0]["chords"], ["A:min", "A:min", "F:maj", "G:maj"] * 2 + ["A:min"])

    def test_reference_parsing_keeps_extensions_and_skips_meter_markers(self):
        reference = parse_reference("# tonic: G\n1.0\tA, verse, | (3/4) G:maj(9)/3 | C:maj7 |\n")
        self.assertEqual(reference["sections"][0]["chords"], ["G:maj(9)/3", "C:maj7"])

    def test_perfect_capo_chart_scores_fully_and_wrong_harmony_does_not(self):
        response = {"abstain": False, "key": {"tonic": "D", "mode": "major"}, "capo": 2, "sections": [{"name": "verse", "bars": [["C"], ["F"], ["G7"]], "repeat": 1}], "placements": []}
        record = {"song_id": "test", "model": "gpt-6-luna", "provider": "codex", "condition": "blind", "exit_code": 0, "response_text": json.dumps(response)}
        song = {"id": "test", "title": "Test", "artist": "Test", "reference": "test.txt"}
        with tempfile.TemporaryDirectory() as temporary, patch("evaluate.ROOT", Path(temporary)):
            (Path(temporary) / "test.txt").write_text("# tonic: D\n0.0\tA, verse, | D:maj | G:maj | A:7 |\n")
            result = score(record, song, {})
            self.assertEqual(result["vocab_jaccard"], 1)
            self.assertEqual(result["section_sequence_accuracy"], 1)
            self.assertTrue(result["tonic_correct"])
            self.assertTrue(result["playable_proxy_pass"])
            response["sections"][0]["bars"][0] = ["Cm"]
            record["response_text"] = json.dumps(response)
            result = score(record, song, {})
            self.assertLess(result["section_sequence_accuracy"], 1)
            self.assertFalse(result["playable_proxy_pass"])

    def test_abstention_with_unknown_key_and_capo_is_valid_but_has_no_chart(self):
        record = {"song_id": "test", "model": "gpt-6-luna", "provider": "codex", "condition": "blind", "exit_code": 0, "response_text": json.dumps({"abstain": True, "key": None, "capo": None, "sections": [], "placements": []})}
        result = score(record, {"title": "Test", "artist": "Test", "reference": None}, {})
        self.assertTrue(result["valid"])
        self.assertTrue(result["abstain"])
        self.assertFalse(result["playable_proxy_pass"])


if __name__ == "__main__":
    unittest.main()
