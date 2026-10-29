## PRIMARY_TABLE

| Model | Input | Charts | Opening tonic | Full vocab overlap | Reduced vocab | Section sequence | Global sequence | Reduced + transpose sequence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haiku 5.5 | blind | 2/40 | 5/40 | 3.6% | 4.0% | 1.7% | 2.2% | 2.2% |
| Haiku 5.5 | lyrics | 2/40 | 4/40 | 3.6% | 4.0% | 1.3% | 2.0% | 2.0% |
| Haiku 4.5 | blind | 4/40 | 4/40 | 4.2% | 5.4% | 1.6% | 2.8% | 4.3% |
| Haiku 4.5 | lyrics | 10/40 | 3/40 | 2.7% | 4.0% | 1.4% | 2.7% | 7.7% |
| Sonnet 5.5 | blind | 38/40 | 14/40 | 16.1% | 29.4% | 6.4% | 11.6% | 32.5% |
| Sonnet 5.5 | lyrics | 38/40 | 13/40 | 14.4% | 26.2% | 7.2% | 13.1% | 36.2% |
| GPT-6 Luna | blind | 3/40 | 4/40 | 1.1% | 3.4% | 0.6% | 0.8% | 2.2% |
| GPT-6 Luna | lyrics | 6/40 | 11/40 | 4.7% | 9.9% | 2.3% | 3.6% | 7.0% |
| GPT-6.1 Terra | blind | 0/40 | 17/40 | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| GPT-6.1 Terra | lyrics | 0/40 | 18/40 | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| GPT-6 Astra | blind | 0/40 | 32/40 | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| GPT-6 Astra | lyrics | 0/40 | 31/40 | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |

## SPREAD_TABLE

Across-song spread for the reduced, transpose-tolerant diagnostic (abstentions are zero). The final column scores only supplied charts; models supplied different songs, so it is not a matched comparison:

| Model | Input | Median | p10–p90 | Min–max | Mean among supplied charts |
| --- | --- | --- | --- | --- | --- |
| Haiku 5.5 | blind | 0.0% | 0.0%–0.0% | 0.0%–54.7% | 44.3% |
| Haiku 5.5 | lyrics | 0.0% | 0.0%–0.0% | 0.0%–42.7% | 40.9% |
| Haiku 4.5 | blind | 0.0% | 0.0%–0.0% | 0.0%–54.7% | 43.0% |
| Haiku 4.5 | lyrics | 0.0% | 0.0%–30.4% | 0.0%–54.8% | 30.8% |
| Sonnet 5.5 | blind | 31.9% | 5.8%–48.4% | 0.0%–80.0% | 34.2% |
| Sonnet 5.5 | lyrics | 35.5% | 1.2%–58.9% | 0.0%–88.2% | 38.1% |
| GPT-6 Luna | blind | 0.0% | 0.0%–0.0% | 0.0%–55.4% | 29.4% |
| GPT-6 Luna | lyrics | 0.0% | 0.0%–40.3% | 0.0%–70.7% | 46.7% |
| GPT-6.1 Terra | blind | 0.0% | 0.0%–0.0% | 0.0%–0.0% | no charts |
| GPT-6.1 Terra | lyrics | 0.0% | 0.0%–0.0% | 0.0%–0.0% | no charts |
| GPT-6 Astra | blind | 0.0% | 0.0%–0.0% | 0.0%–0.0% | no charts |
| GPT-6 Astra | lyrics | 0.0% | 0.0%–0.0% | 0.0%–0.0% | no charts |

## COST_TABLE

| Model | Input | Median latency | p90 | Min–max | Mean list-equivalent/song | Known costs / 40 |
| --- | --- | --- | --- | --- | --- | --- |
| Haiku 5.5 | blind | 6.5s | 8.1s | 2.4–24.3s | $0.00177 | 40 |
| Haiku 5.5 | lyrics | 6.6s | 8.7s | 3.6–35.4s | $0.00211 | 40 |
| Haiku 4.5 | blind | 15.5s | 52.6s | 4.2–61.4s | $0.02129 | 40 |
| Haiku 4.5 | lyrics | 40.0s | 86.4s | 7.4–130.1s | $0.03993 | 40 |
| Sonnet 5.5 | blind | 11.7s | 15.5s | 3.4–23.6s | $0.03533 | 40 |
| Sonnet 5.5 | lyrics | 21.1s | 33.4s | 9.3–46.6s | $0.05966 | 40 |
| GPT-6 Luna | blind | 3.0s | 3.8s | 2.5–5.3s | $0.00101 | 40 |
| GPT-6 Luna | lyrics | 3.3s | 6.5s | 2.5–180.1s | $0.00107 | 39 |
| GPT-6.1 Terra | blind | 4.9s | 5.6s | 3.0–7.2s | $0.00920 | 40 |
| GPT-6.1 Terra | lyrics | 4.3s | 5.4s | 3.3–5.9s | $0.00773 | 40 |
| GPT-6 Astra | blind | 11.1s | 14.8s | 7.1–25.5s | $0.11362 | 40 |
| GPT-6 Astra | lyrics | 9.8s | 17.7s | 6.5–36.2s | $0.10698 | 40 |

## LYRIC_TABLE

| Model | Charts | Line coverage, all songs | Line coverage among charts | Invalid anchors | Duplicate anchors | Correct word placement |
| --- | --- | --- | --- | --- | --- | --- |
| Haiku 5.5 | 2/40 | 5.0% | 100.0% | 0 | 0 | unmeasured |
| Haiku 4.5 | 10/40 | 22.5% | 89.9% | 5 | 0 | unmeasured |
| Sonnet 5.5 | 38/40 | 94.7% | 99.7% | 4 | 0 | unmeasured |
| GPT-6 Luna | 6/40 | 5.0% | 33.3% | 26 | 0 | unmeasured |
| GPT-6.1 Terra | 0/40 | 0.0% | no charts | 0 | 0 | unmeasured |
| GPT-6 Astra | 0/40 | 0.0% | no charts | 0 | 0 | unmeasured |

## SENSITIVITY_TABLE

| Model | Input | Charts / reference songs | Failures | Reduced vocab | Reduced + transpose sequence | Median latency |
| --- | --- | --- | --- | --- | --- | --- |
| Haiku 5.5 | blind | 6/6 | 0 | 43.0% | 29.7% | 8.0s |
| Haiku 5.5 | lyrics | 6/6 | 0 | 42.3% | 38.5% | 22.5s |
| Haiku 4.5 | blind | 6/6 | 0 | 33.5% | 29.9% | 49.7s |
| Haiku 4.5 | lyrics | 4/6 | 2 | 18.1% | 13.5% | 85.8s |
| Sonnet 5.5 | blind | 6/6 | 0 | 51.4% | 43.6% | 9.7s |
| Sonnet 5.5 | lyrics | 6/6 | 0 | 52.4% | 45.1% | 21.8s |
| GPT-6 Luna | blind | 6/6 | 0 | 56.2% | 36.3% | 6.0s |
| GPT-6 Luna | lyrics | 6/6 | 0 | 58.3% | 43.1% | 10.9s |
| GPT-6.1 Terra | blind | 6/6 | 0 | 64.7% | 57.1% | 8.6s |
| GPT-6.1 Terra | lyrics | 6/6 | 0 | 62.2% | 58.7% | 14.7s |
| GPT-6 Astra | blind | 6/6 | 0 | 69.3% | 68.7% | 57.5s |
| GPT-6 Astra | lyrics | 4/6 | 2 | 44.1% | 43.5% | 74.4s |
