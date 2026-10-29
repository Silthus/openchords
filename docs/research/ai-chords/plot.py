import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np


ROOT = Path(__file__).resolve().parent
MODELS = [
    ("claude-haiku-5-5", "Haiku 5.5"),
    ("claude-haiku-4-5-20251001", "Haiku 4.5"),
    ("claude-sonnet-5-5", "Sonnet 5.5"),
    ("gpt-6-luna", "GPT-6 Luna"),
    ("gpt-6.1-terra", "GPT-6.1 Terra"),
    ("gpt-6-astra", "GPT-6 Astra"),
]


def plot():
    summary = {(r["model"], r["condition"]): r for r in json.loads((ROOT / "summary.json").read_text())}
    fig, axes = plt.subplots(1, 2, figsize=(12, 5.2), layout="constrained")
    positions = np.arange(len(MODELS))
    for condition, label, offset, color in [("blind", "Title + artist", -0.18, "#1864ab"), ("lyrics", "Title + artist + lyrics", 0.18, "#d9480f")]:
        coverage = [100 * summary[model, condition]["charts"] / summary[model, condition]["n"] for model, _ in MODELS]
        sequence = [100 * summary[model, condition]["transposition_invariant_sequence"]["mean"] for model, _ in MODELS]
        for ax, values in zip(axes, [coverage, sequence]):
            bars = ax.barh(positions + offset, values, height=0.34, color=color, label=label)
            ax.bar_label(bars, labels=[f"{v:.0f}%" for v in values], padding=3, fontsize=9)
    for ax in axes:
        ax.set_yticks(positions, [name for _, name in MODELS])
        ax.invert_yaxis()
        ax.set_xlim(0, 108)
        ax.set_xticks([0, 25, 50, 75, 100], ["0%", "25%", "50%", "75%", "100%"])
        ax.grid(axis="x", alpha=0.15)
        ax.set_axisbelow(True)
        ax.spines[["top", "right", "left"]].set_visible(False)
        ax.tick_params(axis="y", length=0)
    axes[0].set_title("Supplied a chart", loc="left", fontweight="bold", pad=14)
    axes[1].set_title("Chord-change sequence score", loc="left", fontweight="bold", pad=14)
    axes[0].legend(loc="lower right", frameon=False, fontsize=9)
    fig.suptitle("40 reference songs per condition. Conservative prompt permits abstention.", fontsize=12)
    fig.supxlabel("Sequence score drops extensions and bass inversions, allows global transposition, and counts abstentions as zero.\nIt does not measure rhythm or correct chord-to-word placement.", fontsize=9)
    fig.savefig(ROOT / "results.png", dpi=160, facecolor="white")
    fig.savefig(ROOT / "results.svg", facecolor="white")
    svg = ROOT / "results.svg"
    svg.write_text("\n".join(line.rstrip() for line in svg.read_text().splitlines()) + "\n")
    print("Saved results.png and results.svg")


if __name__ == "__main__":
    plot()
