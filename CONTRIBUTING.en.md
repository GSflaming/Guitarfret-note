# Contributing

[简体中文](CONTRIBUTING.md) · **English**

Thank you for helping improve Guitarfret-note. Bug reports, feature proposals, music-theory examples, documentation improvements, and code contributions are welcome.

To use the fretboard, simply open the online link in the README once the project is published. The environment and commands below are for contributors.

## Project scope

The goal is a simple, free guitar fretboard that runs directly in a browser. Reuse the existing fretboard, music data, and playback logic wherever possible.

- Prioritize correctness and usability in pitches, chords, playback, note input, the view, shortcuts, accessibility, and platform compatibility.
- Keep vanilla JavaScript, ES Modules, and Canvas. Explain the need, size, and license of any new dependency.
- Discuss major refactors, interface redesigns, persistence-format changes, and new external services in an Issue before implementing them.
- Do not introduce mandatory paid services, automatic overage billing, or dependencies that charge the website maintainer for visitors' AI inference.

## Reporting bugs

Search existing Issues first to avoid duplicates. Use the bug-report template and include:

- Operating system, browser, and versions. For shortcut issues, include the detected system, selected interface language, and any manual overrides.
- Steps starting from opening the page, expected behavior, and actual behavior.
- A minimal input example, such as tuning, `6:0 5:2 4:2` string/fret positions, playback tempo, and direction.
- Screenshots or a recording, plus relevant console errors. Remove personal information and credentials before sharing.

For chord-identification questions, list the actual pitches and lowest note, and explain the name you expect. Several interpretations can be valid; provide reasoning rather than assuming one name must be the only correct answer.

## Proposing features

Use the feature-request template to explain the situation, the current difficulty, the interaction you would like, and why existing features do not solve it. Explicitly mention new dependencies, cloud services, uploads, or costs.

Discuss the proposal before writing a large change. A proposal is not a commitment to merge it; maintainers consider scope, complexity, and ongoing maintenance.

## Development setup

Use Node.js 24 (Node.js 22.13+ is also supported) and Git. The same npm commands work in Windows PowerShell and macOS Terminal.

1. Once the repository is available, fork it on GitHub and clone your fork using the address from its Code menu.
2. Enter the project directory and create a branch for your change.

```sh
cd Guitarfret-note
git switch -c fix/describe-the-change
npm ci
npm run dev
```

Open the development preview address printed by the terminal. This is for your own testing; the public tool uses the online link in the README. Refresh the page after editing `dist/`. Do not open the HTML file directly from disk.

The default port is 4173. To use another port:

macOS / Linux:

```sh
PORT=4175 npm run dev
```

Windows PowerShell:

```powershell
$env:PORT = "4175"
npm run dev
```

## Structure and conventions

`dist/` contains both source files and the static website. The build checks assets and module syntax; there is no framework compilation step.

| Path | Responsibility |
| --- | --- |
| `dist/app.js` | Canvas interaction and audio integration |
| `dist/music.mjs` | Tuning, string/fret positions, pitches, and input parsing |
| `dist/chords.mjs` | Chord identification |
| `dist/playback.mjs` | Chord and arpeggio scheduling |
| `dist/view.mjs` | View coordinates and transforms |
| `dist/tools.mjs` | Tool disclosure and focus navigation |
| `dist/shortcuts.mjs` | System detection, shortcuts, and hints |
| `dist/i18n.mjs` | English/Chinese copy, language detection, and switching |
| `dist/notice.mjs` | Dismissible messages |
| `tests/` | Unit and DOM tests |
| `scripts/` | Development, validation, documentation capture, and optional deployment |
| `.github/workflows/` | Cross-platform checks and Pages publishing |

Follow the existing code style. Keep changes focused; do not rewrite unrelated modules or reformat the entire project. Add new browser modules to the build's file list.

Music conventions: string 1 is the highest string, string 6 is the lowest, and fret 0 means an open string. Tuning arrays run from string 6 to string 1. Calculate pitches from the current tuning rather than assuming Standard tuning. Multiple notes may sound together; identify the bass using actual pitch.

Preserve stored-data compatibility. Discuss migrations before changing persistence formats; do not fix a bug by clearing users' scenes.

## Testing

Before submitting, run:

```sh
npm test
npm run build
```

For core logic changes, add deterministic tests that reproduce the problem and verify the expected behavior. Copy or low-impact styling changes do not need mechanical test additions. Tests must not depend on real AI calls, paid services, or personal credentials.

Verify behavior relevant to the change:

| Area | Behavior to check |
| --- | --- |
| Pitches / chords | Open strings, octaves, inversions, changed tuning, and unmatched note collections |
| Playback | Simultaneous notes, arpeggio tempo/order, stopping, and cancellation after editing notes |
| Shortcuts | Windows/macOS hints, manual override, text inputs, IME composition, system combinations, held keys, and focus restoration |
| UI / view | Narrow screens, light/dark themes, zoom, pan, keyboard navigation, and reduced motion |
| Language | Both languages, dynamic messages, errors, accessible labels, persistence, and retaining notes, inputs, and scenes when switching |

The CI workflow runs tests and builds on Windows, macOS, and Linux when the repository is published. These checks do not replace browser, trackpad, or audio testing. State which systems and browsers you actually tested, and list untested areas. Do not describe simulated results as physical-device verification.

## Updating documentation and GIFs

`README.md` and `CONTRIBUTING.md` are Chinese; the corresponding `.en.md` files are English. Keep both languages in sync and preserve their language-switch links.

Interface copy lives in `dist/i18n.mjs`. Cover menus, validation messages, and accessible labels. Switching languages must preserve notes, tuning, text input, and saved scenes. User-authored scene names are not translated.

Animated demos live in `docs/images/`. Files ending in `.en.gif` record the actual English interface; their Chinese counterparts record the Chinese interface. Do not simulate localization by editing an image.

To regenerate them, use Chrome, Node.js 24, and Python with Pillow:

```sh
node scripts/capture-docs.mjs
```

Set `CHROME_BIN` if Chrome is not in a standard location, and `DOCS_PYTHON` if the Python interpreter with Pillow has a different path. Python only encodes recorded frames into GIFs; the website itself runs JavaScript in the browser. GIFs have no audio. See [capture details](docs/images/README.md) for filenames and the recording workflow.

## Submitting a Pull Request

1. Keep a PR focused on one problem or closely related changes. Link the discussed Issue for a large change.
2. Write a clear commit message, push to a branch in your fork, and open a PR targeting `main`.
3. Use the PR template to explain the problem, resulting behavior, checks, and related Issues. For UI changes, include before/after images or a short recording when possible.
4. Wait for automated checks and maintainer review. Add follow-up commits to the same branch instead of repeatedly opening new PRs.

Passing tests does not guarantee a merge. Maintainers also review correctness, usability, scope, and maintenance cost. Once publishing resumes, the existing workflow deploys GitHub Pages after a merge to `main`; contributors do not need production credentials or access to the official deployment.

Do not commit `node_modules/`, local backups, runtime caches, account configuration, keys, tokens, or third-party scores without permission.

## Collaboration and licensing

Keep discussion focused on behavior and code. Respect contributors with different experience levels, avoid personal attacks, and support feedback with reproduction steps or reasoning.

Original contributions are provided under this project's [MIT license](LICENSE). For third-party code, verify compatibility, retain required copyright and license notices, and identify the source in the PR.
