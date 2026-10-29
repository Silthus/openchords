import hashlib
import json
from pathlib import Path

from evaluate import parse_response
from experiment import prompt_for


ROOT = Path(__file__).resolve().parent


def validate():
    songs = json.loads((ROOT / "songs.json").read_text())
    models = json.loads((ROOT / "models.json").read_text())
    manifest = json.loads((ROOT / "lyrics-manifest.json").read_text())
    assert len(songs) == 44
    assert sum(bool(s.get("reference")) for s in songs) == 40
    assert len(manifest) == 44 and all(r["lrclib_id"] and not r["error"] for r in manifest)
    for song in songs:
        if song.get("reference"):
            assert hashlib.sha256((ROOT / song["reference"]).read_bytes()).hexdigest() == song["reference_sha256"]
    counts = {}
    for model in models:
        for song in songs:
            for condition in ("blind", "lyrics"):
                path = ROOT / "raw" / model["model"] / f"{song['id']}-{condition}.json"
                record = json.loads(path.read_text())
                assert record["song_id"] == song["id"] and record["model"] == model["model"]
                assert record["condition"] == condition
                assert not record.get("tool_calls"), path
                prompt = prompt_for(song, condition)
                assert hashlib.sha256(prompt.encode()).hexdigest() == record["prompt_sha256"], path
                if record["exit_code"] != 0:
                    assert record.get("is_error") and record.get("error"), path
                    counts[model["model"]] = counts.get(model["model"], 0) + 1
                    continue
                response = parse_response(record)
                assert set(response) == {"abstain", "key", "capo", "sections", "placements"}, path
                assert type(response["abstain"]) is bool
                assert response["key"] is None or set(response["key"]) == {"tonic", "mode"} or (response["abstain"] and response["key"] == {})
                for section in response["sections"]:
                    assert set(section) <= {"name", "bars", "repeat"}, path
                    assert len(section["name"]) < 40, path
                for placement in response["placements"]:
                    assert set(placement) == {"line", "word", "chord"}, path
                if record["provider"] == "claude":
                    assert set(record["model_usage"]) == {model["model"]}, path
                counts[model["model"]] = counts.get(model["model"], 0) + 1
    scores = json.loads((ROOT / "scores.json").read_text())
    assert len(scores) == 528
    assert all(s["valid"] or s.get("error") for s in scores)
    summary = json.loads((ROOT / "summary.json").read_text())
    assert len(summary) == 12 and all(s["n"] == 40 for s in summary)
    assert all(s.get("word_placement_accuracy") is None for s in scores if s["condition"] == "lyrics")
    selection = json.loads((ROOT / "sensitivity-selection.json").read_text())["song_ids"]
    song_by_id = {s["id"]: s for s in songs}
    sensitivity_count = 0
    for model in models:
        for song_id in selection:
            for condition in ("blind", "lyrics"):
                path = ROOT / "raw-best-effort" / model["model"] / f"{song_id}-{condition}.json"
                record = json.loads(path.read_text())
                prompt = prompt_for(song_by_id[song_id], condition, ROOT / "prompt-best-effort.txt")
                assert record["model"] == model["model"] and record["song_id"] == song_id and record["condition"] == condition
                assert hashlib.sha256(prompt.encode()).hexdigest() == record["prompt_sha256"], path
                assert not record.get("tool_calls"), path
                if record["exit_code"] != 0:
                    assert record.get("is_error") and record.get("error"), path
                sensitivity_count += 1
    sensitivity_scores = json.loads((ROOT / "best-effort" / "scores.json").read_text())
    assert len(sensitivity_scores) == sensitivity_count == 96
    assert all(s["valid"] or s.get("error") for s in sensitivity_scores)
    sensitivity_summary = json.loads((ROOT / "best-effort" / "summary.json").read_text())
    assert len(sensitivity_summary) == 12 and all(s["n"] == 6 for s in sensitivity_summary)
    print(json.dumps({"validated_primary_outputs": sum(counts.values()), "outputs_per_model": counts, "reference_files": 40, "lyric_records": 44, "summary_groups": 12, "validated_sensitivity_outputs": sensitivity_count, "sensitivity_summary_groups": 12}, indent=2))


if __name__ == "__main__":
    validate()
