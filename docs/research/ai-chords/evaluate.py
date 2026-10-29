from collections import Counter, defaultdict
import csv
import json
from pathlib import Path
import re
import statistics


ROOT = Path(__file__).resolve().parent
PITCHES = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11, "H": 11}
QUALITIES = {
    "maj": [0, 4, 7], "min": [0, 3, 7], "dim": [0, 3, 6], "aug": [0, 4, 8],
    "sus2": [0, 2, 7], "sus4": [0, 5, 7], "1": [0], "5": [0, 7],
    "maj6": [0, 4, 7, 9], "min6": [0, 3, 7, 9],
    "7": [0, 4, 7, 10], "maj7": [0, 4, 7, 11], "min7": [0, 3, 7, 10],
    "minmaj7": [0, 3, 7, 11], "dim7": [0, 3, 6, 9], "hdim7": [0, 3, 6, 10],
    "9": [0, 2, 4, 7, 10], "maj9": [0, 2, 4, 7, 11], "min9": [0, 2, 3, 7, 10],
    "11": [0, 2, 4, 5, 7, 10], "maj11": [0, 2, 4, 5, 7, 11], "min11": [0, 2, 3, 5, 7, 10],
    "13": [0, 2, 4, 5, 7, 9, 10], "maj13": [0, 2, 4, 5, 7, 9, 11], "min13": [0, 2, 3, 5, 7, 9, 10],
}
PRICES = {
    "gpt-6-luna": (0.10, 0.01, 0.50),
    "gpt-6.1-terra": (1.00, 0.05, 5.00),
    "gpt-6-astra": (10.00, 1.00, 50.00),
}


def pitch(note, german=False):
    note = note.replace("♯", "#").replace("♭", "b")
    match = re.fullmatch(r"([A-H])([#b]*)", note)
    if not match:
        raise ValueError(f"Invalid pitch: {note}")
    letter, accidentals = match.groups()
    base = 10 if german and letter == "B" else PITCHES[letter]
    return (base + accidentals.count("#") - accidentals.count("b")) % 12


def degree(value):
    match = re.fullmatch(r"([#b]*)(\d+)", value)
    if not match:
        raise ValueError(f"Invalid degree: {value}")
    accidentals, number = match.groups()
    return ([0, 2, 4, 5, 7, 9, 11][(int(number) - 1) % 7] + accidentals.count("#") - accidentals.count("b")) % 12


def chord(label, shift=0, german=False, reduced=False):
    label = label.strip().replace("♯", "#").replace("♭", "b").replace("−", "-").replace("Δ", "maj").replace("△", "maj")
    if label in ("N", "X", "NC", "N.C.", "*", "&pause"):
        return None
    match = re.fullmatch(r"([A-H][#b]*)(.*)", label)
    if not match:
        raise ValueError(f"Invalid chord: {label}")
    root_text, suffix = match.groups()
    root = (pitch(root_text, german) + shift) % 12
    quality_text, slash, bass_text = suffix.partition("/")
    harte = quality_text.startswith(":")
    quality_text = quality_text.removeprefix(":")
    match = re.fullmatch(r"([^()]*)(?:\(([^()]*)\))?", quality_text)
    if not match:
        raise ValueError(f"Invalid chord quality: {label}")
    quality, modifiers = match.groups()
    modifiers = modifiers.split(",") if modifiers else []
    if not harte:
        quality = quality.replace("m7b5", "hdim7").replace("ø7", "hdim7").replace("ø", "hdim7").replace("°7", "dim7").replace("°", "dim").replace("+", "aug")
        if quality.startswith("M"):
            quality = "maj" + quality[1:]
        elif quality.startswith("m") and not quality.startswith(("maj", "min")):
            quality = "min" + quality[1:]
        elif quality.startswith("-"):
            quality = "min" + quality[1:]
        quality = quality.replace("mMaj", "minmaj").replace("minMaj", "minmaj")
        if quality == "6":
            quality = "maj6"
        if quality == "sus":
            quality = "sus4"
        extra = re.fullmatch(r"(.*?)(add\d+|[#b]\d+|sus[24])", quality)
        if quality not in QUALITIES and extra:
            quality, addition = extra.groups()
            if addition.startswith("sus"):
                modifiers.extend(["*3", "2" if addition == "sus2" else "4"])
            elif addition.startswith("add"):
                modifiers.append(addition[3:])
            else:
                modifiers.extend(["*" + addition.lstrip("#b"), addition])
    quality = quality or ("1" if harte and modifiers else "maj")
    if quality not in QUALITIES:
        raise ValueError(f"Unknown quality: {label} => {quality}")
    intervals = set(QUALITIES[quality])
    for modifier in modifiers:
        if modifier.startswith("*"):
            intervals.discard(degree(modifier[1:]))
        else:
            intervals.add(degree(modifier))
    bass = root
    if slash:
        bass = (root + degree(bass_text)) % 12 if harte else (pitch(bass_text, german) + shift) % 12
    if reduced:
        intervals = next((set(shape) for shape in ([0, 3, 6], [0, 4, 8], [0, 4, 7], [0, 3, 7], [0, 5, 7], [0, 2, 7], [0, 7]) if set(shape).issubset(intervals)), intervals)
        bass = root
    return root, tuple(sorted(intervals)), bass


def section_name(name):
    name = re.sub(r"[^a-z]", "", name.lower())
    aliases = {"refrain": "chorus", "prechorus": "verse", "instrumental": "interlude", "instrumentalsolo": "solo", "ending": "outro", "coda": "outro", "fadeout": "outro", "introduction": "intro"}
    return aliases.get(name, name or "other")


def parse_reference(text):
    sections = []
    tonic = None
    previous = "N"
    for line in text.splitlines():
        if line.startswith("# tonic:") and tonic is None:
            tonic = line.partition(":")[2].strip()
        if "\t" not in line or "|" not in line:
            continue
        _, body = line.split("\t", 1)
        prefix = body.split("|", 1)[0].strip().rstrip(",").strip()
        if prefix:
            labels = [x.strip() for x in prefix.split(",")]
            names = [x for x in labels if x and not re.fullmatch(r"[A-Z]['′]*", x) and not x.startswith("(")]
            sections.append({"name": section_name(names[0] if names else "other"), "chords": []})
        if not sections:
            sections.append({"name": "other", "chords": []})
        bars = body.split("|")[1:-1]
        phrase = []
        for bar in bars:
            for token in re.sub(r"\(\d+/\d+\)", "", bar).split():
                if token == ".":
                    phrase.append(previous)
                elif re.match(r"^[A-H][#b]*(?::|$)|^[NX]$", token):
                    phrase.append(token)
                    previous = token
        repeat_match = re.search(r"\|\s*x\s*(\d+)", body)
        repeat = int(repeat_match[1]) if repeat_match else 1
        sections[-1]["chords"].extend(phrase * repeat)
    return {"tonic": tonic, "sections": sections}


def collapse(sequence):
    result = []
    for value in sequence:
        if value is not None and (not result or result[-1] != value):
            result.append(value)
    return result


def sequence_accuracy(reference, estimated):
    if not reference and not estimated:
        return 1.0
    previous = list(range(len(estimated) + 1))
    for i, expected in enumerate(reference, 1):
        current = [i]
        for j, actual in enumerate(estimated, 1):
            current.append(min(previous[j] + 1, current[-1] + 1, previous[j - 1] + (expected != actual)))
        previous = current
    return 1 - previous[-1] / max(len(reference), len(estimated))


def sections_from_response(response):
    sections = []
    for section in response["sections"]:
        repeats = section.get("repeat", 1)
        if not isinstance(repeats, int) or not 1 <= repeats <= 100:
            raise ValueError("Invalid repeat count")
        bars = section["bars"]
        if not isinstance(bars, list) or any(not isinstance(bar, list) for bar in bars):
            raise ValueError("Bars must be arrays of chord symbols")
        sections.append({"name": section_name(section["name"]), "chords": [str(c) for bar in bars for c in bar] * repeats})
    return sections


def normalized_sections(sections, shift=0, reduced=False):
    german = any(re.match(r"^H", c) for s in sections for c in s["chords"])
    return [{"name": s["name"], "chords": collapse([chord(c, shift=shift, german=german, reduced=reduced) for c in s["chords"]])} for s in sections]


def compare_sections(reference, estimated):
    reference_by_name = defaultdict(list)
    estimated_by_name = defaultdict(list)
    for section in reference:
        reference_by_name[section["name"]].append(section["chords"])
    for section in estimated:
        estimated_by_name[section["name"]].append(section["chords"])
    distance, size = 0.0, 0
    details = []
    for name in sorted(reference_by_name.keys() | estimated_by_name.keys()):
        refs, preds = reference_by_name[name], estimated_by_name[name]
        for i in range(max(len(refs), len(preds))):
            ref = refs[i] if i < len(refs) else []
            pred = preds[i] if i < len(preds) else []
            weight = max(len(ref), len(pred))
            score = sequence_accuracy(ref, pred)
            distance += (1 - score) * weight
            size += weight
            details.append({"name": name, "occurrence": i, "reference_changes": len(ref), "predicted_changes": len(pred), "accuracy": score})
    return (1 - distance / size if size else 0.0), details


def flatten(sections):
    return [c for s in sections for c in s["chords"]]


def list_cost(record):
    usage = record.get("usage") or {}
    if record["provider"] == "claude":
        return record.get("list_cost_usd")
    if not usage:
        return None
    input_price, cache_price, output_price = PRICES[record["model"]]
    cached = usage.get("cached_input_tokens", 0)
    return ((usage["input_tokens"] - cached) * input_price + cached * cache_price + usage["output_tokens"] * output_price) / 1_000_000


def parse_response(record):
    text = record.get("response_text", "").strip()
    if text.startswith("```"):
        match = re.match(r"^```(?:json)?\s*(.*?)\s*```", text, re.S)
        if not match:
            raise ValueError("Unclosed JSON code fence")
        text = match[1]
    return json.loads(text)


def placements_score(response, manifest):
    counts = manifest.get("word_counts", [])
    nonblank = {i for i, count in enumerate(counts) if count}
    positions = []
    valid_lines = set()
    invalid = 0
    for anchor in response.get("placements", []):
        line, word = anchor.get("line"), anchor.get("word")
        if type(line) != int or type(word) != int or not 0 <= line < len(counts) or not 0 <= word < counts[line]:
            invalid += 1
            continue
        chord(anchor["chord"], shift=response.get("capo", 0))
        positions.append((line, word))
        valid_lines.add(line)
    return {
        "placement_count": len(response.get("placements", [])), "invalid_placements": invalid,
        "duplicate_placements": len(positions) - len(set(positions)),
        "placements_in_order": positions == sorted(positions),
        "lyric_line_coverage": len(valid_lines & nonblank) / len(nonblank) if nonblank else None,
        "word_placement_accuracy": None,
    }


def supplementary_score(response):
    source = json.loads((ROOT / "supplementary-reference.json").read_text())
    reference = {chord(d["value"], reduced=True) for a in source["annotations"] if a["namespace"] == "chord_harte" for d in a["data"]}
    reference.discard(None)
    estimated = set(flatten(normalized_sections(sections_from_response(response), shift=response.get("capo") or 0, reduced=True)))
    overlap = len(reference & estimated) / len(reference | estimated) if estimated else 0.0
    return {"supplementary_triad_vocab_jaccard": overlap, "supplementary_reference": source["source_url"]}


def score(record, song, manifest):
    row = {k: record.get(k) for k in ("song_id", "model", "provider", "condition", "effort", "elapsed_seconds", "exit_code")}
    row.update({"title": song["title"], "artist": song["artist"], "difficulty_proxy": song.get("difficulty_proxy"), "list_equivalent_usd": list_cost(record), "has_reference": bool(song.get("reference"))})
    row.update({"valid": False, "abstain": False, "tonic_correct": False, "vocab_jaccard": 0.0, "triad_vocab_jaccard": 0.0, "section_sequence_accuracy": 0.0, "global_sequence_accuracy": 0.0, "transposition_invariant_sequence": 0.0, "playable_as_is": "unverified", "playable_proxy_pass": False})
    try:
        if record.get("is_error") or record.get("exit_code") != 0 or record.get("tool_calls"):
            raise ValueError(record.get("error", "CLI failure or tool use"))
        response = parse_response(record)
        text = record.get("response_text", "").strip()
        row["format_compliant"] = bool(re.fullmatch(r"```(?:json)?\s*.*?\s*```", text, re.S)) if text.startswith("```") else True
        abstain = bool(response["abstain"])
        sections = sections_from_response(response)
        capo = response["capo"] if not abstain else 0
        if type(capo) != int or not 0 <= capo <= 12:
            raise ValueError("Invalid capo")
        estimated = normalized_sections(sections, shift=capo)
        row.update({"valid": True, "abstain": abstain, "predicted_section_count": len(sections), "predicted_key": response["key"], "capo": response["capo"]})
        if record["condition"] == "lyrics":
            row.update(placements_score(response, manifest))
        if not song.get("reference"):
            if song.get("id") == "extra_nothing":
                row.update(supplementary_score(response))
            row["playable_as_is"] = "no reference; unverified"
            return row
        reference = parse_reference((ROOT / song["reference"]).read_text())
        tonic = (response.get("key") or {}).get("tonic")
        if tonic and reference["tonic"] != "?":
            row["sounding_tonic_correct"] = pitch(tonic) == pitch(reference["tonic"])
            row["tonic_correct"] = row["sounding_tonic_correct"] or (pitch(tonic) + capo) % 12 == pitch(reference["tonic"])
        if row["abstain"] or not estimated:
            row["playable_as_is"] = "no chart (abstention)"
            return row
        ref = normalized_sections(reference["sections"])
        ref_triads = normalized_sections(reference["sections"], reduced=True)
        estimated_triads = normalized_sections(sections, shift=capo, reduced=True)
        ref_vocab, pred_vocab = set(flatten(ref)), set(flatten(estimated))
        ref_tri_vocab, pred_tri_vocab = set(flatten(ref_triads)), set(flatten(estimated_triads))
        row["vocab_jaccard"] = len(ref_vocab & pred_vocab) / len(ref_vocab | pred_vocab)
        row["triad_vocab_jaccard"] = len(ref_tri_vocab & pred_tri_vocab) / len(ref_tri_vocab | pred_tri_vocab)
        row["section_sequence_accuracy"], row["section_scores"] = compare_sections(ref, estimated)
        row["global_sequence_accuracy"] = sequence_accuracy(flatten(ref), flatten(estimated))
        row["triad_global_sequence_accuracy"] = sequence_accuracy(flatten(ref_triads), flatten(estimated_triads))
        best = max((sequence_accuracy(flatten(ref_triads), flatten(normalized_sections(sections, shift=capo + shift, reduced=True))), shift) for shift in range(12))
        row["transposition_invariant_sequence"], row["best_extra_transpose"] = best
        ref_names, pred_names = Counter(s["name"] for s in ref), Counter(s["name"] for s in estimated)
        row["missing_sections"] = dict(ref_names - pred_names)
        row["extra_sections"] = dict(pred_names - ref_names)
        row["reference_section_count"] = len(ref)
        row["section_order_exact"] = [s["name"] for s in ref] == [s["name"] for s in estimated]
        row["playable_proxy_pass"] = row["tonic_correct"] and row["triad_vocab_jaccard"] >= 0.8 and row["triad_global_sequence_accuracy"] >= 0.85 and row["section_order_exact"] and not row.get("invalid_placements", 0) and (record["condition"] != "lyrics" or row.get("lyric_line_coverage", 0) >= 0.9)
        row["playable_as_is"] = "needs musician/audio check" if row["playable_proxy_pass"] else "fails conservative reference-fidelity screen"
    except (ValueError, TypeError, KeyError, ZeroDivisionError) as error:
        row["valid"] = False
        row["error"] = str(error)
        row["playable_as_is"] = "invalid output"
    return row


def distribution(values):
    values = sorted(v for v in values if v is not None)
    if not values:
        return None
    return {"n": len(values), "mean": statistics.mean(values), "median": statistics.median(values), "min": min(values), "max": max(values), "p10": values[int((len(values) - 1) * 0.1)], "p90": values[int((len(values) - 1) * 0.9)]}


def evaluate(raw_root=None, output_root=None):
    raw_root = raw_root or ROOT / "raw"
    output_root = output_root or ROOT
    output_root.mkdir(parents=True, exist_ok=True)
    songs = {s["id"]: s for s in json.loads((ROOT / "songs.json").read_text())}
    manifests = {s["song_id"]: s for s in json.loads((ROOT / "lyrics-manifest.json").read_text())}
    rows = []
    for path in sorted(raw_root.glob("*/*.json")):
        record = json.loads(path.read_text())
        rows.append(score(record, songs[record["song_id"]], manifests.get(record["song_id"], {})))
    (output_root / "scores.json").write_text(json.dumps(rows, indent=2) + "\n")
    score_columns = ["song_id", "title", "artist", "model", "condition", "valid", "abstain", "tonic_correct", "vocab_jaccard", "triad_vocab_jaccard", "section_sequence_accuracy", "global_sequence_accuracy", "triad_global_sequence_accuracy", "transposition_invariant_sequence", "predicted_section_count", "reference_section_count", "section_order_exact", "lyric_line_coverage", "invalid_placements", "duplicate_placements", "playable_as_is", "playable_proxy_pass", "elapsed_seconds", "list_equivalent_usd", "supplementary_triad_vocab_jaccard"]
    with (output_root / "scores.csv").open("w") as handle:
        writer = csv.DictWriter(handle, fieldnames=score_columns, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    groups = defaultdict(list)
    for row in rows:
        if row["has_reference"]:
            groups[row["model"], row["condition"]].append(row)
    summary = []
    for (model, condition), group in sorted(groups.items()):
        valid_charts = [r for r in group if r["valid"] and not r["abstain"] and r.get("predicted_section_count", 0)]
        entry = {"model": model, "condition": condition, "n": len(group), "charts": len(valid_charts), "abstentions": sum(r["abstain"] for r in group), "errors": sum(not r["valid"] for r in group), "tonic_correct": sum(r["tonic_correct"] for r in group), "playable_proxy_passes": sum(r["playable_proxy_pass"] for r in group)}
        for metric in ("vocab_jaccard", "triad_vocab_jaccard", "section_sequence_accuracy", "global_sequence_accuracy", "triad_global_sequence_accuracy", "transposition_invariant_sequence", "elapsed_seconds", "list_equivalent_usd", "lyric_line_coverage"):
            entry[metric] = distribution([r.get(metric) for r in group])
        entry["conditional_chart_section_accuracy"] = distribution([r["section_sequence_accuracy"] for r in valid_charts])
        entry["conditional_chart_transposition_sequence"] = distribution([r["transposition_invariant_sequence"] for r in valid_charts])
        entry["conditional_chart_reduced_vocabulary"] = distribution([r["triad_vocab_jaccard"] for r in valid_charts])
        entry["songs_with_missing_sections"] = sum(bool(r.get("missing_sections")) for r in valid_charts)
        entry["songs_with_extra_sections"] = sum(bool(r.get("extra_sections")) for r in valid_charts)
        entry["section_order_exact"] = sum(bool(r.get("section_order_exact")) for r in valid_charts)
        summary.append(entry)
    (output_root / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    columns = ["model", "condition", "n", "charts", "abstentions", "errors", "tonic_correct", "playable_proxy_passes", "songs_with_missing_sections", "songs_with_extra_sections", "section_order_exact"]
    metrics = ["vocab_jaccard", "triad_vocab_jaccard", "section_sequence_accuracy", "global_sequence_accuracy", "transposition_invariant_sequence", "elapsed_seconds", "list_equivalent_usd", "lyric_line_coverage"]
    with (output_root / "summary.csv").open("w") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns + metrics, lineterminator="\n")
        writer.writeheader()
        for entry in summary:
            writer.writerow({**{k: entry[k] for k in columns}, **{k: entry[k]["mean"] if entry.get(k) else None for k in metrics}})
    print(f"Scored {len(rows)} outputs in {len(summary)} model/condition groups")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw-root", type=Path)
    parser.add_argument("--output-root", type=Path)
    args = parser.parse_args()
    evaluate(args.raw_root, args.output_root)
