# 🎵 Sound Tools - Chrome Extension

A powerful Chrome extension built with React that provides real-time audio effects for web audio/video and connects to MIDI controllers for hands-on control.

## Features

- 🎛️ **Real-time Audio Effects**: Apply reverb, distortion, and filters to any audio/video on web pages
- 🎹 **MIDI Controller Support**: Connect your MIDI keyboard/controller to trigger effects with physical controls
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

## Project Structure

```
src/
├── popup/           # Extension popup UI
│   ├── popup.html   # Popup HTML template
│   ├── popup.tsx    # Popup React entry point
│   └── popup.css    # Popup styles
├── content/         # Content scripts
│   ├── content.ts   # Main content script entry point
│   ├── content.css  # Content script styles
│   └── ContentScriptManager.ts # Content script orchestrator
├── background/      # Background service worker
│   └── background.ts
├── components/      # React components
│   ├── Popup.tsx    # Main popup container
│   ├── Header.tsx   # App header component
│   ├── MidiController.tsx # MIDI connection UI
│   ├── AudioEffects.tsx   # Effects grid container
│   └── EffectButton.tsx   # Individual effect button
├── hooks/           # Custom React hooks
│   └── useSoundTools.ts   # Main extension logic hook
├── audio/           # Audio processing modules
│   ├── AudioEffect.ts     # Base effect interface & class
│   ├── AudioProcessor.ts  # Audio chain management
│   └── effects/           # Individual effect implementations
│       ├── ReverbEffect.ts
│       ├── DistortionEffect.ts
│       └── FilterEffect.ts
├── midi/            # MIDI controller integration
│   └── MidiController.ts  # MIDI device management
├── notifications/   # Notification system
│   └── NotificationManager.ts # Toast notifications
└── utils/          # Utility functions
```

## How It Works

### Audio Effects Processing

The extension uses the Web Audio API to create real-time audio effects:

- **Reverb**: Convolution reverb using impulse responses
- **Distortion**: Waveshaper-based distortion
- **Filter**: Biquad filters (lowpass, highpass, etc.)

### MIDI Integration

- Uses the Web MIDI API to connect to MIDI devices
- Maps MIDI notes to different effects (C4=Reverb, E4=Distortion, F4=Filter)
- Real-time control of effect parameters through MIDI CC messages

### Extension Architecture

- **Popup**: React-based UI for manual control
- **Content Script**: Injected into web pages to process audio
- **Background Script**: Manages extension lifecycle and tab communication

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

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Roadmap

- [ ] Firefox extension support
- [ ] More audio effects (delay, chorus, phaser, flanger, pitch shift)
- [ ] Visual audio analyzer
- [ ] Preset management
- [ ] MIDI learn functionality
- [ ] Audio recording capabilities
