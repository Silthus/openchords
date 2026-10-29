# Reference annotation provenance

The OpenChords repository licence does not replace the licences of these research inputs.

`references/billboard_*.txt` contains selected **McGill Billboard 2.0** annotations. McGill releases its annotations under **CC0**. Files were retrieved from the original-data partition of ChoCo at commit `5fe168fd55be5c84512abcfbc4e6f1b1f8f0092a`. `references/billboard_*.json` contains only the annotation namespaces and observations extracted from ChoCo's corresponding JAMS files. The complete per-song source URLs and text-file SHA-256 hashes are in `songs.json`. ChoCo's packaging and transformations are released under **CC BY 4.0** for these partitions. Retain this attribution when reusing the extracted files.

Sources:

- [McGill's release and CC0 declaration](https://ddmal.ca/research/The_McGill_Billboard_Project_(Chord_Analysis_Dataset)/).
- John Ashley Burgoyne, Jonathan Wild, and Ichiro Fujinaga. **An Expert Ground Truth Set for Audio Chord Recognition and Music Analysis.** Proceedings of ISMIR 2011, pp. 633–638. [Paper](https://ismir2011.ismir.net/papers/OS8-1.pdf).
- Jacopo de Berardinis, Albert Meroño-Peñuela, Andrea Poltronieri, and Valentina Presutti. **ChoCo: a Chord Corpus and a Data Transformation Workflow for Musical Harmony Knowledge Graphs.** Scientific Data 10, 641 (2023). [Project](https://github.com/smashub/choco), [licence at the pinned commit](https://github.com/smashub/choco/blob/5fe168fd55be5c84512abcfbc4e6f1b1f8f0092a/LICENSE.md), [CC BY 4.0 terms](https://creativecommons.org/licenses/by/4.0/).

`supplementary-reference.json` contains extracted observations from ChoCo's **Wikifonia** lead-sheet annotation for *Nothing Else Matters*, credited in the source metadata to Lars Ulrich and James Hetfield. It has the same ChoCo CC BY 4.0 attribution above. The JSON records its exact source URL and limitations.

Original reference text files retain upstream whitespace so their recorded hashes remain verifiable.

The dataset licences concern annotation data. McGill explicitly excludes the underlying copyrighted audio from its download. No recordings or lyric text are redistributed in this branch. LRCLIB identifiers, metadata and input hashes identify separately fetched research inputs; access to its API is not a licence to redistribute the words.
