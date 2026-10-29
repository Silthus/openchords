import argparse
import concurrent.futures
import csv
import hashlib
import io
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import tempfile
import threading
import time
import urllib.parse
import urllib.request


ROOT = Path(__file__).resolve().parent
CACHE = Path(os.environ.get("CHORD_BENCH_CACHE", "/tmp/openchords-chord-bench"))
CHOCO_REV = "5fe168fd55be5c84512abcfbc4e6f1b1f8f0092a"
CHOCO = f"https://raw.githubusercontent.com/smashub/choco/{CHOCO_REV}/"
BILLBOARD_IDS = [6, 19, 26, 34, 48, 53, 64, 74, 79, 81, 87, 93, 103, 120, 121, 137, 147, 160, 179, 190, 196, 203, 216, 220, 224, 226, 240, 249, 261, 265, 273, 277, 298, 306, 309, 323, 344, 347, 368, 663]
PROVIDER_LIMITS = {"claude": threading.Semaphore(3), "codex": threading.Semaphore(6)}


def read_json(path):
    return json.loads(path.read_text())


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "OpenChords-research/1.0 (https://github.com/Silthus/openchords)"})
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read()


def digest(data):
    return hashlib.sha256(data).hexdigest()


def prepare():
    metadata = list(csv.DictReader(io.StringIO(fetch(CHOCO + "partitions/billboard/choco/meta.csv").decode())))
    index = {row["id"]: row for row in metadata}
    dates = {row["id"]: row for row in csv.DictReader(io.StringIO(fetch(CHOCO + "partitions/billboard/raw/billboard-2.0-index.csv").decode()))}

    def reference(number):
        row = index[f"billboard_{number}"]
        source = row["file_path"].removeprefix("../../")
        jams = row["jams_path"].removeprefix("../../")
        raw = fetch(CHOCO + source)
        annotation = json.loads(fetch(CHOCO + jams))
        target = ROOT / "references" / f"billboard_{number}.txt"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(raw)
        simplified = [{"namespace": a["namespace"], "data": a["data"]} for a in annotation["annotations"]]
        write_json(target.with_suffix(".json"), simplified)
        return {
            "id": f"billboard_{number}", "title": row["track_title"], "artist": row["track_performer"],
            "chart_date": dates[str(int(row["billboard_id"]))]["chart_date"],
            "reference": str(target.relative_to(ROOT)), "reference_url": CHOCO + source,
            "jams_url": CHOCO + jams, "reference_sha256": digest(raw),
            "source": "McGill Billboard 2.0 via ChoCo", "source_license": "CC0 (original); CC BY 4.0 (ChoCo packaging)",
        }

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        songs = list(pool.map(reference, BILLBOARD_IDS))
    songs.extend([
        {"id": "extra_riverside", "title": "Riverside", "artist": "Agnes Obel", "reference": None},
        {"id": "extra_follow", "title": "I Will Follow You into the Dark", "artist": "Death Cab for Cutie", "reference": None},
        {"id": "extra_water", "title": "Down by the Water", "artist": "The Decemberists", "reference": None},
        {"id": "extra_nothing", "title": "Nothing Else Matters", "artist": "Metallica", "reference": None},
    ])
    for song in songs:
        if song["reference"]:
            annotations = read_json(ROOT / song["reference"].replace(".txt", ".json"))
            vocab = {d["value"] for a in annotations if a["namespace"] == "chord" for d in a["data"] if d["value"] not in ("N", "X")}
            song["reference_vocabulary_size"] = len(vocab)
            song["difficulty_proxy"] = "complex" if len(vocab) >= 12 else "moderate" if len(vocab) >= 6 else "simple"
    write_json(ROOT / "songs.json", songs)
    print(f"Prepared {len(songs)} songs, {sum(bool(s['reference']) for s in songs)} references", flush=True)


def lyric_path(song):
    return CACHE / "lyrics" / (song["id"] + ".json")


def lyrics_for(song, retry=False):
    path = lyric_path(song)
    manifest_path = ROOT / "lyrics-manifest.json"
    pinned = next((r for r in read_json(manifest_path) if r["song_id"] == song["id"] and r.get("record_url")), None) if manifest_path.exists() else None
    if path.exists():
        cached = read_json(path)
        if not retry or cached.get("plainLyrics"):
            if not pinned or digest(cached.get("plainLyrics", "").encode()) == pinned["plain_sha256"]:
                return cached
    query = urllib.parse.urlencode({"track_name": song["title"], "artist_name": song["artist"]})
    url = pinned["record_url"] if pinned else "https://lrclib.net/api/get?" + query
    try:
        record = json.loads(fetch(url))
        if not record.get("plainLyrics"):
            raise ValueError("no plain lyrics")
        if pinned and digest(record["plainLyrics"].encode()) != pinned["plain_sha256"]:
            raise ValueError("pinned lyric input changed; refusing to silently replace it")
        record["request_url"] = url
    except Exception as error:
        record = {"error": str(error), "request_url": url}
    write_json(path, record)
    return record


def fetch_lyrics():
    songs = read_json(ROOT / "songs.json")
    records = []
    for song in songs:
        path = lyric_path(song)
        if not path.exists() or not read_json(path).get("plainLyrics"):
            time.sleep(4)
        record = lyrics_for(song, retry=True)
        records.append(record)
        print(f"Lyrics {song['id']}: {'available' if record.get('plainLyrics') else record.get('error')}", flush=True)
    manifest = []
    for song, record in zip(songs, records):
        lines = record.get("plainLyrics", "").splitlines()
        manifest.append({
            "song_id": song["id"], "lrclib_id": record.get("id"), "request_url": record["request_url"],
            "record_url": f"https://lrclib.net/api/get/{record['id']}" if record.get("id") else None,
            "title": record.get("trackName"), "artist": record.get("artistName"), "album": record.get("albumName"),
            "duration": record.get("duration"), "error": record.get("error"), "line_count": len(lines),
            "word_counts": [len(line.split()) for line in lines],
            "plain_sha256": digest(record.get("plainLyrics", "").encode()),
            "has_synced": bool(record.get("syncedLyrics")),
            "selection": record.get("selection", "LRCLIB title-and-artist best match"),
        })
    write_json(ROOT / "lyrics-manifest.json", manifest)
    print(f"Lyrics available: {sum(bool(r.get('plainLyrics')) for r in records)}/{len(songs)}", flush=True)


def prompt_for(song, condition, prompt_file=None):
    lyrics = ""
    if condition == "lyrics":
        record = lyrics_for(song)
        if not record.get("plainLyrics"):
            return None
        lyrics = "NUMBERED LYRIC LINES:\n" + "\n".join(f"{i}: {line}" for i, line in enumerate(record["plainLyrics"].splitlines()))
    return (prompt_file or ROOT / "prompt.txt").read_text().replace("{title}", song["title"]).replace("{artist}", song["artist"]).replace("{condition}", condition).replace("{lyrics}", lyrics)


def command_for(config):
    model, effort = config["model"], config["effort"]
    if config["provider"] == "claude":
        return ["claude", "-p", "--model", model, "--effort", effort, "--output-format", "json", "--tools", "", "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}', "--disable-slash-commands", "--no-session-persistence", "--settings", '{"disableAllHooks":true}', "--system-prompt", "Answer the supplied benchmark prompt. Never use tools. Output only the requested JSON."]
    return ["codex", "exec", "--ignore-user-config", "--ignore-rules", "--skip-git-repo-check", "--ephemeral", "-s", "read-only", "-m", model, "-c", f'model_reasoning_effort="{effort}"', "-c", 'web_search="disabled"', "-c", "project_doc_max_bytes=0", "--json", "-"]


def extract_result(provider, stdout):
    if provider == "claude":
        obj = json.loads(stdout)
        return {"response_text": obj.get("result", ""), "usage": obj.get("usage"), "model_usage": obj.get("modelUsage"), "list_cost_usd": obj.get("total_cost_usd"), "duration_api_ms": obj.get("duration_api_ms"), "is_error": obj.get("is_error", False), "tool_calls": []}
    events = [json.loads(line) for line in stdout.splitlines() if line.startswith("{")]
    messages = [e["item"]["text"] for e in events if e.get("type") == "item.completed" and e.get("item", {}).get("type") == "agent_message"]
    usage = next((e["usage"] for e in events if e.get("type") == "turn.completed"), None)
    tools = [e["item"].get("type") for e in events if e.get("type") == "item.completed" and e.get("item", {}).get("type") not in ("agent_message", "reasoning")]
    errors = [e for e in events if e.get("type") in ("error", "turn.failed")]
    return {"response_text": messages[-1] if messages else "", "usage": usage, "list_cost_usd": None, "is_error": bool(errors), "tool_calls": tools, "errors": errors}


def run_one(job, timeout, prompt_file=None, output=None):
    song, config, condition = job
    path = (output or ROOT / "raw") / config["model"] / (song["id"] + "-" + condition + ".json")
    if path.exists():
        return
    prompt = prompt_for(song, condition, prompt_file)
    if prompt is None:
        return
    env = os.environ.copy()
    for key in list(env):
        if key.endswith("API_KEY"):
            env.pop(key, None)
    record = {"song_id": song["id"], "condition": condition, **config, "prompt_sha256": digest(prompt.encode()), "started_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    started = time.monotonic()
    with tempfile.TemporaryDirectory(prefix="chord-blind-") as cwd:
        process = subprocess.Popen(command_for(config), stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env, cwd=cwd, start_new_session=True)
        try:
            stdout, stderr = process.communicate(prompt, timeout=timeout)
            record.update(extract_result(config["provider"], stdout))
            record["exit_code"] = process.returncode
            record["stderr_present"] = bool(stderr)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGTERM)
            try:
                process.communicate(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                process.communicate()
            record.update({"exit_code": 124, "is_error": True, "error": "timeout"})
        except Exception as error:
            if process.poll() is None:
                os.killpg(process.pid, signal.SIGKILL)
                process.communicate()
            record.update({"exit_code": process.returncode, "is_error": True, "error": str(error)})
    record["elapsed_seconds"] = round(time.monotonic() - started, 3)
    write_json(path, record)
    print(f"{config['model']} {song['id']} {condition}: exit={record['exit_code']} {record['elapsed_seconds']}s", flush=True)


def limited_run(job, timeout, prompt_file=None, output=None):
    with PROVIDER_LIMITS[job[1]["provider"]]:
        run_one(job, timeout, prompt_file, output)


def run(args):
    songs = read_json(ROOT / "songs.json")
    models = read_json(ROOT / "models.json")
    if args.models:
        models = [m for m in models if m["model"] in args.models]
    if args.song_ids:
        songs = [s for s in songs if s["id"] in args.song_ids]
    conditions = args.conditions or ["blind", "lyrics"]
    jobs = [(song, config, condition) for song in songs for condition in conditions for config in models]
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        list(pool.map(lambda job: limited_run(job, args.timeout, args.prompt_file, args.output), jobs))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["prepare", "lyrics", "run"])
    parser.add_argument("--models", nargs="*")
    parser.add_argument("--song-ids", nargs="*")
    parser.add_argument("--conditions", nargs="*", choices=["blind", "lyrics"])
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--timeout", type=int, default=150)
    parser.add_argument("--prompt-file", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if args.action == "prepare":
        prepare()
    elif args.action == "lyrics":
        fetch_lyrics()
    else:
        run(args)


if __name__ == "__main__":
    main()
