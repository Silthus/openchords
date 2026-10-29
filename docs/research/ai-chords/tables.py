from collections import defaultdict
import json
from pathlib import Path
import statistics


ROOT = Path(__file__).resolve().parent
NAMES = {
    "claude-haiku-5-5": "Haiku 5.5",
    "claude-haiku-4-5-20251001": "Haiku 4.5",
    "claude-sonnet-5-5": "Sonnet 5.5",
    "gpt-6-luna": "GPT-6 Luna",
    "gpt-6.1-terra": "GPT-6.1 Terra",
    "gpt-6-astra": "GPT-6 Astra",
}


def table(headers, rows):
    return "\n".join(["| " + " | ".join(headers) + " |", "| " + " | ".join("---" for _ in headers) + " |"] + ["| " + " | ".join(str(v) for v in row) + " |" for row in rows])


def pct(value):
    return f"{100 * value:.1f}%"


def metric(row, key, stat="mean"):
    value = row.get(key)
    return value[stat] if value else None


def build():
    summaries = {(r["model"], r["condition"]): r for r in json.loads((ROOT / "summary.json").read_text())}
    scores = json.loads((ROOT / "scores.json").read_text())
    primary, spread, cost, lyric = [], [], [], []
    for model, name in NAMES.items():
        for condition in ("blind", "lyrics"):
            r = summaries[model, condition]
            primary.append([name, condition, f"{r['charts']}/{r['n']}", f"{r['tonic_correct']}/{r['n']}", pct(metric(r, "vocab_jaccard")), pct(metric(r, "triad_vocab_jaccard")), pct(metric(r, "section_sequence_accuracy")), pct(metric(r, "global_sequence_accuracy")), pct(metric(r, "transposition_invariant_sequence"))])
            d = r["transposition_invariant_sequence"]
            conditional = r["conditional_chart_transposition_sequence"]
            spread.append([name, condition, pct(d["median"]), f"{pct(d['p10'])}–{pct(d['p90'])}", f"{pct(d['min'])}–{pct(d['max'])}", pct(conditional["mean"]) if conditional else "no charts"])
            latency = r["elapsed_seconds"]
            dollars = r["list_equivalent_usd"]
            cost.append([name, condition, f"{latency['median']:.1f}s", f"{latency['p90']:.1f}s", f"{latency['min']:.1f}–{latency['max']:.1f}s", f"${dollars['mean']:.5f}" if dollars else "unknown", dollars["n"] if dollars else 0])
        group = [r for r in scores if r["model"] == model and r["condition"] == "lyrics" and r["has_reference"]]
        charts = [r for r in group if r["valid"] and not r["abstain"] and r.get("predicted_section_count", 0)]
        valid = [r.get("lyric_line_coverage", 0) or 0 for r in charts]
        lyric.append([name, f"{len(charts)}/{len(group)}", pct(sum(r.get("lyric_line_coverage", 0) or 0 for r in group) / len(group)), pct(statistics.mean(valid)) if valid else "no charts", sum(r.get("invalid_placements", 0) for r in group), sum(r.get("duplicate_placements", 0) for r in group), "unmeasured"])
    strata = []
    for model in NAMES:
        for condition in ("blind", "lyrics"):
            for difficulty in ("simple", "moderate", "complex"):
                group = [r for r in scores if r["model"] == model and r["condition"] == condition and r["difficulty_proxy"] == difficulty]
                strata.append({"model": model, "condition": condition, "difficulty": difficulty, "n": len(group), "charts": sum(r["valid"] and not r["abstain"] and bool(r.get("predicted_section_count")) for r in group), "mean_transposition_invariant_sequence": statistics.mean(r["transposition_invariant_sequence"] for r in group)})
    (ROOT / "difficulty-strata.json").write_text(json.dumps(strata, indent=2) + "\n")
    result = {
        "PRIMARY_TABLE": table(["Model", "Input", "Charts", "Opening tonic", "Full vocab overlap", "Reduced vocab", "Section sequence", "Global sequence", "Reduced + transpose sequence"], primary),
        "SPREAD_TABLE": "Across-song spread for the reduced, transpose-tolerant diagnostic (abstentions are zero). The final column scores only supplied charts; models supplied different songs, so it is not a matched comparison:\n\n" + table(["Model", "Input", "Median", "p10–p90", "Min–max", "Mean among supplied charts"], spread),
        "COST_TABLE": table(["Model", "Input", "Median latency", "p90", "Min–max", "Mean list-equivalent/song", "Known costs / 40"], cost),
        "LYRIC_TABLE": table(["Model", "Charts", "Line coverage, all songs", "Line coverage among charts", "Invalid anchors", "Duplicate anchors", "Correct word placement"], lyric),
    }
    sensitivity_path = ROOT / "best-effort" / "summary.json"
    if sensitivity_path.exists():
        sensitivity = {(r["model"], r["condition"]): r for r in json.loads(sensitivity_path.read_text())}
        rows = []
        for model, name in NAMES.items():
            for condition in ("blind", "lyrics"):
                if (model, condition) not in sensitivity:
                    continue
                r = sensitivity[model, condition]
                rows.append([name, condition, f"{r['charts']}/{r['n']}", r["errors"], pct(metric(r, "triad_vocab_jaccard")), pct(metric(r, "transposition_invariant_sequence")), f"{metric(r, 'elapsed_seconds', 'median'):.1f}s"])
        result["SENSITIVITY_TABLE"] = table(["Model", "Input", "Charts / reference songs", "Failures", "Reduced vocab", "Reduced + transpose sequence", "Median latency"], rows)
    (ROOT / "tables.json").write_text(json.dumps(result, indent=2) + "\n")
    (ROOT / "tables.md").write_text("\n\n".join(f"## {key}\n\n{value}" for key, value in result.items()) + "\n")
    print("Wrote tables.md, tables.json and difficulty-strata.json")


if __name__ == "__main__":
    build()
