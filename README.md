# 🎵 Sound Tools - Chrome Extension

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Open Source](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://opensource.org/)

A powerful **open source** Chrome extension built with React that provides real-time audio effects for web audio/video and connects to MIDI controllers for hands-on control.

Download it [here](https://chromewebstore.google.com/detail/sound-tools/ebobkhcfenmbocmopjngeapipeldbala) from the Chrome Web Store.

## Features

- 🎛️ **Real-time Audio Effects**: Apply reverb, distortion, and filters to any audio/video on web pages
- 🎹 **MIDI Controller Support**: Connect your MIDI keyboard/controller for hands-on control
- 🎓 **MIDI Learn Mode**: Click any control and move a MIDI knob/slider to create instant mappings
- 💾 **Persistent Settings**: All effect parameters and MIDI mappings are automatically saved
- 🌐 **Per-Domain MIDI Permissions**: MIDI access permissions are remembered per website
- 🔄 **Auto-Restore**: MIDI controllers and mappings automatically reconnect when revisiting pages
- 🏷️ **Visual MIDI Links**: See which controls are linked with removable chips
- ⚡ **Modern React UI**: Beautiful, responsive popup interface built with React and TypeScript
- 🔄 **Hot Module Replacement**: Lightning-fast development with Vite and CRXJS
- 📱 **Content Script Integration**: Seamless integration with web pages through content scripts

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Chrome browser

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

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript type checking
- `npm run lint:check` - Check code formatting and linting
- `npm run lint:fix` - Fix code formatting and linting issues

## Project Structure

```
src/
├── ParameterStore/         # Centralized parameter management
│   ├── BaseParameterStore.ts    # Base parameter store class
│   ├── ContentParameterStore.ts # Content script parameter store
│   └── PopupParameterStore.ts   # Popup parameter store
├── content/                # Content scripts
│   ├── content.ts          # Main content script entry point
│   ├── content.css         # Content script styles
│   ├── ContentScriptManager.ts # Content script orchestrator
│   ├── audio/              # Audio processing
│   │   ├── AudioEffect.ts       # Base effect interface & class
│   │   ├── AudioProcessor.ts    # Audio chain management
│   │   └── effects/             # Individual effect implementations
│   │       ├── ReverbEffect.ts
│   │       ├── DistortionEffect.ts
│   │       └── FilterEffect.ts
│   └── notifications/      # Notification system
│       └── NotificationManager.ts # Toast notifications
├── midi/                   # MIDI controller integration
│   └── MidiController.ts   # MIDI device & mapping management
├── storage/                # Chrome storage management
│   └── MidiStorageManager.ts # MIDI state & permissions storage
├── logger/                 # Logging system
│   └── index.ts           # Logger with dev/prod modes
├── ui/                     # React UI components
│   ├── components/         # React components
│   │   ├── Popup.tsx           # Main popup container
│   │   ├── Header.tsx          # App header component
│   │   ├── AudioEffect/        # Audio effect components
│   │   │   ├── index.tsx           # Effects grid container
│   │   │   ├── EffectRow.tsx       # Individual effect row
│   │   │   ├── EffectButton.tsx    # Effect toggle button
│   │   │   ├── Slider.tsx          # Parameter slider
│   │   │   ├── MidiLinkChip.tsx    # MIDI link indicator
│   │   │   └── SettingsButton.tsx  # Settings toggle
│   │   └── Midi/               # MIDI components
│   │       ├── index.tsx           # MIDI controller container
│   │       ├── MidiRow.tsx         # MIDI connection row
│   │       └── MidiButton.tsx      # MIDI action button
│   ├── hooks/              # Custom React hooks
│   │   ├── useSoundTools.ts    # Audio effects logic
│   │   └── useMidiController.ts # MIDI controller logic
│   └── popup/              # Popup entry point
│       ├── popup.html      # Popup HTML template
│       ├── popup.tsx       # Popup React entry point
│       └── popup.css       # Popup styles
```

## How It Works

### Audio Effects Processing

The extension uses the Web Audio API to create real-time audio effects:

- **Reverb**: Convolution reverb using impulse responses
- **Distortion**: Waveshaper-based distortion
- **Filter**: Biquad filters (lowpass, highpass, etc.)

### MIDI Integration

- **Device Connection**: Uses the Web MIDI API to connect to MIDI controllers
- **Learn Mode**: Click "Learn" button, then click any UI control and move a MIDI knob/slider to create mappings
- **Flexible Mappings**: Support for both MIDI notes and CC messages with one-to-many and many-to-one relationships
- **Visual Feedback**: MIDI link chips show which controls are mapped and allow easy removal
- **Persistent Storage**: All MIDI mappings are saved per device and automatically restored
- **Per-Domain Permissions**: MIDI access permissions are remembered for each website
- **Auto-Reconnect**: Controllers and mappings automatically restore when revisiting pages

### Extension Architecture

- **Popup**: React-based UI with real-time parameter control and MIDI learning
- **Content Script**: Injected into web pages to process audio and handle MIDI events
- **Parameter Store**: Cross-context parameter synchronization between popup and content script
- **Storage Manager**: Persistent storage for MIDI mappings, device configurations, and permissions
- **Message Passing**: Chrome extension messaging for real-time UI updates and MIDI events

## Usage

### Getting Started with Audio Effects

1. **Open the Extension**: Click the Sound Tools icon in your browser toolbar
2. **Enable Effects**: Toggle any effect (Reverb, Distortion, Filter) on or off
3. **Adjust Parameters**: Use the sliders to fine-tune effect settings
4. **Real-time Processing**: Effects are applied instantly to any audio/video on the page

### Setting Up MIDI Control

1. **Connect Your MIDI Controller**: Plug in your MIDI keyboard, control surface, or DJ controller
2. **Request MIDI Access**: Click "Request MIDI Access" in the extension popup
3. **Select Your Device**: Choose your MIDI controller from the available devices list
4. **Enter Learn Mode**: Click the "Learn" button to start creating MIDI mappings

### Creating MIDI Mappings

1. **Activate Learn Mode**: Click "Learn" - the button will show "Learning..."
2. **Select a Control**: Click any effect button or parameter slider in the UI
3. **Move MIDI Control**: Turn a knob, move a slider, or press a key on your MIDI controller
4. **Mapping Created**: A chip will appear showing the MIDI link (e.g., "CC64", "Note C4")
5. **Remove Mappings**: Click the "×" on any chip to remove that MIDI link

### MIDI Features

- **Multiple Mappings**: One MIDI control can control multiple UI elements
- **Multiple Controls**: One UI element can be controlled by multiple MIDI controls
- **Persistent Storage**: All mappings are automatically saved per device
- **Auto-Restore**: Mappings automatically restore when you reconnect the same device
- **Per-Domain Permissions**: MIDI access is remembered separately for each website

## Browser Compatibility

- ✅ **Chrome**: Full support (Manifest V3)
- 🔄 **Firefox**: Planned support (will require Manifest V2 adaptation)
- ❓ **Safari**: Under consideration
- ❓ **Edge**: Should work (Chromium-based)

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **CRXJS** - Chrome extension build tooling
- **Web Audio API** - Audio processing
- **Web MIDI API** - MIDI controller support
- **Chrome Extensions API** - Browser integration

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
- [ ] Firefox extension support (Manifest V2 adaptation)
- [ ] More audio effects (delay, chorus, phaser, flanger, pitch shift)
- [ ] Visual audio analyzer with real-time frequency display
- [ ] Preset management system for saving/loading effect configurations
- [ ] Audio recording capabilities with effect processing
- [ ] Advanced MIDI features (velocity sensitivity, aftertouch, pitch bend)
- [ ] Keyboard shortcuts for quick effect toggling
