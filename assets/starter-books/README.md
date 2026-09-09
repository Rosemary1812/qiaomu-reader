# Offline starter books

These books are separate from the plugin’s GPL license. Each EPUB retains its complete source text, credits, original publication information, and full Project Gutenberg license. Catalog entries identify these editions as public domain in the USA; copyright status elsewhere depends on jurisdiction. No modern Chinese translation is included.

The source text was downloaded on 2026-09-09. EPUBs contain no body illustrations or embedded fonts. Each includes an actual JPEG cover: historic Chinese book scans and Standard Ebooks cover editions. [Cover sources and permissions](covers/README.md) are recorded separately; artwork identifies the work and does not imply that the Gutenberg text reproduces that pictured edition. The books remain full works, including the complete 世说新语. English editions retain English titles.

| Edition | Language | EPUB bytes | Source |
|---|---|---:|---|
| 道德经 | zh | 71399 | [7337](https://www.gutenberg.org/ebooks/7337) |
| 唐诗三百首 | zh | 86410 | [52323](https://www.gutenberg.org/ebooks/52323) |
| Jekyll and Hyde | en | 89333 | [43](https://www.gutenberg.org/ebooks/43) |
| Alice in Wonderland | en | 99073 | [11](https://www.gutenberg.org/ebooks/11) |
| 世说新语 | zh | 172303 | [24047](https://www.gutenberg.org/ebooks/24047) |
| Meditations | en | 207504 | [2680](https://www.gutenberg.org/ebooks/2680) |

Total EPUB payload: 726,022 bytes, including six JPEG covers (121,452 bytes total).

## Reproduction

`npm run build:books` rebuilds deterministically from the checked-in TXT sources. The builder checks pinned text and cover hashes. `catalog.json` records source URL, download URL, byte count and SHA-256; `editions.json` additionally records output byte counts and SHA-256. Normal plugin builds do not fetch anything from the network.

`python3 scripts/fetch-starter-books.py` is an explicit maintenance operation that refreshes the sources and catalog; review source/rights changes before running the builder.

References: [Project Gutenberg license](https://www.gutenberg.org/policy/license.html). Distribution of the books retains that license and is separate from licensing the software. No Project Gutenberg endorsement is claimed.
