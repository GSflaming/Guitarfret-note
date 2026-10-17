# Guitarfret-note

[简体中文](README.md) · **English**

A minimal guitar fretboard for exploring notes and chords, demonstrating fingerings, and preparing clean screen recordings. Built with vanilla JavaScript and Canvas. Open it in your browser; no account or installation required.

**[Use online](https://gsflaming.github.io/Guitarfret-note/?lang=en)** · [Alternative address](https://fret-note-studio.gsflaming86.workers.dev/?lang=en) · [Shortcut reference](docs/SHORTCUTS.en.md) · [Deployment guide (Chinese)](docs/DEPLOYMENT.md)

[![Check and publish](https://github.com/GSflaming/Guitarfret-note/actions/workflows/check-and-publish.yml/badge.svg)](https://github.com/GSflaming/Guitarfret-note/actions/workflows/check-and-publish.yml)

![A C major chord on the fretboard with the circular tools expanded](docs/images/overview.en.gif)

The fretboard is the main workspace. Use the white button at the bottom right to expand or collapse the tools. The complete interface is available in English and Chinese. On the first visit it follows your browser language; use **Language** at the bottom of the expanded tools to switch. Your choice is remembered.

## Features

- Six strings and 24 frets, including open strings, multiple-note selection, and single-note preview.
- Chord identification based on the current tuning, actual pitches, and lowest note, including common extensions and inversions. Unmatched combinations are shown as note names.
- Play selected notes together or as an eighth-note arpeggio, with adjustable tempo and order.
- Pan, zoom, focus on a fret range, follow-mouse tilt, and light or dark themes.
- Standard and alternative tunings, custom tuning, and input by string/fret or note name.
- Saved scenes and a clean recording mode that hides the tools.
- Complete English and Chinese interfaces, automatic language selection, and a manual language switch.
- Automatic Windows/macOS detection for shortcut hints, with a manual override.

Recording mode only hides the interface; it does not record video. Sound uses browser-synthesized plucked strings, not recorded guitar samples. This release focuses on fretboard demonstrations and does not include PDF or AI score recognition.

## Illustrated quick start

Open the **Use online** link above. There is no need to download the source or start a development server. These GIFs record the actual application using fixed examples. GIFs do not contain audio.

### Select notes and identify chords

![The note-selection panel lists five selected positions and identifies a C major chord](docs/images/selection.en.gif)

Click the fretboard to select a note; click it again to remove it. The separate circles on the left select open strings. Strings run from string 1 at the top to string 6 at the bottom. Open **Tools → Notes** to see selected positions and the identified chord, or switch to **Single-note preview**.

Try the C major chord shown above: open **Tools → Input**, choose string/fret input, enter `x 3 2 0 1 0`, and apply it. The six positions run from string 6 to string 1; `x` means muted and `0` means an open string. You can also enter `5:3 4:2 3:0 2:1 1:0`. Note-name input accepts `C E G`, or a pitch with an octave such as `E4`.

### Play chords and arpeggios

![The playback panel offers simultaneous playback, arpeggios, a 110 BPM tempo, and low-to-high order](docs/images/playback.en.gif)

Press **Space** to play the selected notes together, or **A** to arpeggiate them. Open **Tools → Playback** to change the tempo and order. The animation shows 110 BPM, low to high, with an eighth note between successive notes. Click **Stop** to interrupt playback.

### Change tuning and appearance

![Drop D tuning in the dark theme, with three open strings forming D5](docs/images/tuning.en.gif)

**Tools → Tuning** offers presets such as Standard and Drop D, as well as custom pitches with octave numbers. Note names, chord identification, and sound are recalculated for the new tuning. In the animation, Drop D lowers string 6 to D2. Tuning fields run from string 6 to string 1.

Switch light/dark themes in **Tools → Appearance**. This panel also controls note labels, chord names, sound, and the follow-mouse effect.

### Windows and macOS shortcuts

![Windows and macOS shortcut chart covering playback, recording mode, focus navigation, and zoom](docs/images/shortcuts.en.gif)

Expand the tools and choose **Shortcuts**, or press **?**. The guide detects your system automatically; you can manually switch the displayed system if detection is incorrect. Windows shows **Ctrl + scroll wheel**, and Mac shows **⌘ + scroll wheel**. Trackpads support two-finger panning and pinch-to-zoom; touchscreens support two-finger gestures.

Press letter shortcuts directly, without Ctrl or ⌘. Typing, input-method composition, and system key combinations do not trigger playback. For focus navigation and the contextual behavior of Esc, see the [full shortcut reference](docs/SHORTCUTS.en.md).

### Other useful tools

| Tool | What it does |
| --- | --- |
| View / Frets | Adjust position and size, reset the view, or focus on a fret range. |
| Scenes | Save selected notes, tuning, fret range, and view settings, then load them in the same browser. |
| Recording | Press P to hide the tools and P again to restore them. Use your operating system's screen recorder to capture video. |

## Data and privacy

Notes, tuning, scenes, and interface settings are stored in the current browser's localStorage. They do not transfer automatically between browsers or domains. System detection runs locally. The app does not send scores, notes, or platform information to a server and does not call AI or other external APIs. The static hosting provider still handles normal web requests.

## Contributing

[Report a problem or suggest a feature](https://github.com/GSflaming/Guitarfret-note/issues). Contributions to music theory, interaction, accessibility, and documentation are welcome.

Before opening an Issue or Pull Request, read the [English contribution guide](CONTRIBUTING.en.md). It explains the project scope, development environment, submission requirements, testing, and review process. To use the tool, simply open the online version.

For self-hosting, see the [deployment guide (Chinese)](docs/DEPLOYMENT.md). The code is licensed under [MIT](LICENSE).
