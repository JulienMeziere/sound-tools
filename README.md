# 🎵 Sound Tools - Browser Extension

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Open Source](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://opensource.org/)

A powerful **open source** Chrome and Firefox extension built with React that provides real-time audio effects for web audio/video and connects to MIDI controllers for hands-on control.

Download it [here](https://chromewebstore.google.com/detail/sound-tools/ebobkhcfenmbocmopjngeapipeldbala) from the Chrome Web Store (Firefox version coming to addons.mozilla.org).

## Features

- 🎛️ **Real-time Audio Effects**: Apply reverb, distortion, and filters to any audio/video on web pages
- 🎹 **MIDI Controller Support**: Connect your MIDI keyboard/controller for hands-on control
- 🎓 **MIDI Learn Mode**: Click any control and move a MIDI knob/slider to create instant mappings
- 💾 **Persistent Settings**: All effect parameters and MIDI mappings are automatically saved
- 🌐 **Per-Domain MIDI Permissions**: MIDI access permissions are remembered per website
- 🔄 **Auto-Restore**: MIDI controllers and mappings automatically reconnect when revisiting pages
- 🏷️ **Visual MIDI Links**: See which controls are linked with removable chips
- ⚡ **Modern UI**: Effect cards with switches and expandable sliders, dark and light themes that follow the system
- 🧭 **Helpful notices**: Tells you when a page has no audio yet or when a tab needs a reload (with Retry / Reload buttons)
- 🔄 **Hot Module Replacement**: Lightning-fast development with Vite and CRXJS
- 📱 **Content Script Integration**: Seamless integration with web pages through content scripts

## Development Setup

### Prerequisites

- Node.js 20.19+ or 22.12+ (required by Vite 8)
- npm
- Chrome and/or Firefox 140+

### Installation

1. Clone the repository:

```bash
git clone https://github.com/JulienMeziere/sound-tools.git
cd sound-tools
```

2. Install dependencies:

```bash
npm install
```

3. Start development server:

```bash
npm run dev
```

4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `dist` folder

5. Or load it in Firefox (no hot reload):
   - Run `npm run build:firefox:dev`
   - Run `npm run start:firefox` (opens a Firefox with the extension installed), or
     open `about:debugging#/runtime/this-firefox` → "Load Temporary Add-on…" →
     select `dist-firefox/manifest.json`

### Available Scripts

- `npm run dev` - Start development server with hot reload (Chrome)
- `npm run build` - Production build for Chrome in `dist/`
- `npm run build:firefox` - Production build for Firefox in `dist-firefox/`
- `npm run build:all` - Both production builds
- `npm run lint:firefox` - Validate `dist-firefox/` with Mozilla's add-on linter
- `npm run start:firefox` - Run Firefox with `dist-firefox/` installed
- `npm run prepare-publish` - Build and zip for the Chrome Web Store
- `npm run prepare-publish:firefox` - Build, lint and zip for addons.mozilla.org, plus the source archive
- `npm run type-check` - Run TypeScript type checking
- `npm run lint:check` - Check code formatting and linting
- `npm run lint` - Fix linting issues
- `npm run format` - Format the code with Prettier

Every build runs the type check, ESLint and Prettier first.

## Publishing

### Chrome Web Store

`npm run prepare-publish` produces `sound-tools-extension.zip`.

### Firefox Add-ons (addons.mozilla.org)

`npm run prepare-publish:firefox` produces:

- `sound-tools-firefox.zip` - the add-on to upload
- `sound-tools-source.zip` - the source code, required by AMO because the
  add-on is bundled and minified

The add-on ID is `sound-tools@julienmeziere.github.io`
(`vite.config.ts`). It is permanent once the first version is uploaded.

#### Build instructions for AMO reviewers

Environment: Linux, macOS or Windows (WSL), Node.js 20.19+ (tested with
20.19.2) and npm 10. From the root of the source archive:

```bash
npm ci
npm run build:firefox
```

The add-on is generated in `dist-firefox/` and is identical to the uploaded
package. The build bundles the TypeScript/React sources in `src/` with Vite
and `@crxjs/vite-plugin`; no remote code is loaded and no data is collected.
The two `innerHTML` warnings reported by the linter come from React DOM's
internal `dangerouslySetInnerHTML` support, which this project never uses
(enforced by the `react/no-danger` ESLint rule).

## Project Structure

```
src/
├── shared/                 # Code used by both the popup and the content script
│   ├── effects.ts          # Effect & parameter definitions (single source of truth)
│   ├── messages.ts         # Typed popup <-> content script protocol
│   ├── midi.ts             # MIDI types and mapping helpers
│   ├── storage.ts          # chrome.storage access (parameters, MIDI devices & mappings)
│   └── logger.ts           # Logger (info/debug only in dev builds)
├── content/                # Content script (runs in every page)
│   ├── content.ts          # Entry point
│   ├── ContentController.ts # Message router, owns audio, parameters and MIDI
│   ├── ParameterState.ts   # Parameter values, persistence and cross-tab sync
│   ├── notifications.ts    # Toast notifications shown on the page
│   ├── audio/
│   │   ├── AudioEngine.ts  # Single effect chain shared by all media elements
│   │   └── effects/        # Distortion, Reverb, Filter (one input/output each)
│   └── midi/
│       └── MidiController.ts # Web MIDI access, devices, learn mode, mappings
└── ui/                     # Popup (React)
    ├── useTabState.ts      # Mirrors the active tab state, exposes actions
    ├── components/         # Popup, EffectCard, MidiSection, Slider, Switch, Icons...
    └── popup/              # popup.html, popup.tsx, popup.css
```

## How It Works

### Audio Effects Processing

The extension uses the Web Audio API to create real-time audio effects:

- **Distortion**: Waveshaper with 4x oversampling
- **Reverb**: Convolution reverb with 20 generated room impulse responses and a dry/wet mix
- **Filter**: A high-pass then a low-pass biquad filter, each with its own frequency and resonance

The signal chain is Distortion → Reverb → Filter. Parameter changes are smoothed to avoid clicks.

### MIDI Integration

- **Device Connection**: Uses the Web MIDI API to connect to MIDI controllers
- **Learn Mode**: Click "Learn", move a MIDI knob/fader/pad, then click the switch or slider it should control
- **Flexible Mappings**: Support for both MIDI notes and CC messages with one-to-many and many-to-one relationships
- **Visual Feedback**: MIDI link chips show which controls are mapped and allow easy removal
- **Persistent Storage**: All MIDI mappings are saved per device and automatically restored
- **Per-Domain Permissions**: MIDI access permissions are remembered for each website
- **Auto-Reconnect**: Controllers and mappings automatically restore when revisiting pages or replugging the device

### Extension Architecture

- **Content Script**: owns the state of each tab (enabled effects, parameters, MIDI). Every `<audio>`/`<video>` element of the page is routed through one shared chain: `media -> input bus -> [enabled effects] -> speakers`. Effects are created once and only re-wired when toggled, so parameter changes are always applied to the audio that is playing.
- **Popup**: a view of the active tab state. It sends typed requests (`src/shared/messages.ts`) and receives the resulting state; changes made from MIDI are pushed to it as they happen.
- **Storage**: parameters are saved (debounced) to `chrome.storage.local` and shared between tabs; MIDI mappings are saved per device. MIDI permission is managed by the browser per website.
- **Cross-browser**: the same sources build for Chrome and Firefox (both Manifest V3; Firefox supports the `chrome.*` namespace with promises). The Firefox build only adds `browser_specific_settings` to the manifest (see `vite.config.ts`).

## Usage

### Getting Started with Audio Effects

1. **Open the Extension**: Click the Sound Tools icon in your browser toolbar
2. **Enable Effects**: Flip the switch of any effect (Distortion, Reverb, Filter)
3. **Adjust Parameters**: Click an effect card to expand its sliders
4. **Real-time Processing**: Effects are applied instantly to any audio/video on the page

### Setting Up MIDI Control

1. **Connect Your MIDI Controller**: Plug in your MIDI keyboard, control surface, or DJ controller
2. **Allow MIDI Access**: Click "Enable" on the MIDI card of the popup
3. **Select Your Device**: Choose your MIDI controller from the available devices list
4. **Enter Learn Mode**: Click the "Learn" button to start creating MIDI mappings

### Creating MIDI Mappings

1. **Activate Learn Mode**: Click "Learn" on the MIDI card
2. **Move MIDI Control**: Turn a knob, move a fader, or press a pad/key on your MIDI controller - the control appears (e.g. `CC74`) and the linkable switches and sliders pulse
3. **Select a Control**: Click any effect switch or parameter slider in the popup
4. **Mapping Created**: A chip appears showing the MIDI link (e.g., "CC64", "Note 36")
5. **Remove Mappings**: Click the "×" on any chip to remove that MIDI link

Pads and keys linked to an effect toggle it on each press. Knobs and faders turn it off in their lower half and on in their upper half.

### MIDI Features

- **Multiple Mappings**: One MIDI control can control multiple UI elements
- **Multiple Controls**: One UI element can be controlled by multiple MIDI controls
- **Persistent Storage**: All mappings are automatically saved per device
- **Auto-Restore**: Mappings automatically restore when you reconnect the same device
- **Per-Domain Permissions**: MIDI access is remembered separately for each website

## Browser Compatibility

- ✅ **Chrome**: Full support (Manifest V3)
- ✅ **Edge**: Full support (Chromium-based)
- ✅ **Firefox 140+**: Full support (Manifest V3), including MIDI controllers
- ❓ **Safari**: Under consideration

## Technologies Used

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **CRXJS** - Browser extension build tooling (Chrome and Firefox targets)
- **web-ext** - Firefox linting, running and packaging
- **Web Audio API** - Audio processing
- **Web MIDI API** - MIDI controller support
- **WebExtensions API** - Browser integration

## Contributing

This is an **open source project** and contributions are welcome! 🎉

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Ways to Contribute

- 🐛 **Bug Reports**: Found an issue? Open an issue on GitHub
- 💡 **Feature Requests**: Have an idea? We'd love to hear it
- 🔧 **Code Contributions**: Fix bugs, add features, improve documentation
- 🎵 **Audio Effects**: Add new audio effects or improve existing ones
- 🎹 **MIDI Features**: Enhance MIDI controller support
- 📚 **Documentation**: Help improve the README, add tutorials, or write guides

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Roadmap

- [x] ✅ **MIDI learn functionality** - Implemented with visual feedback and persistent storage
- [x] ✅ **Persistent parameter storage** - All settings automatically saved and restored
- [x] ✅ **Per-domain MIDI permissions** - MIDI access remembered per website
- [x] ✅ **Auto-restore MIDI state** - Controllers and mappings automatically reconnect
- [x] ✅ **Firefox support** - Manifest V3 build from the same sources
- [x] ✅ **MIDI in Firefox** - Same MIDI features as in Chrome
- [ ] More audio effects (delay, chorus, phaser, flanger, pitch shift)
- [ ] Visual audio analyzer with real-time frequency display
- [ ] Preset management system for saving/loading effect configurations
- [ ] Audio recording capabilities with effect processing
- [ ] Advanced MIDI features (velocity sensitivity, aftertouch, pitch bend)
- [ ] Keyboard shortcuts for quick effect toggling
