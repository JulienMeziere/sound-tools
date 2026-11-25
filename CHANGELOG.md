# Changelog

## 1.1.0 – 2026-11-25

First release on Firefox Add-ons, and a large update of the Chrome version.

### Fixed

- **Sliders change the sound in real time again.** Before, on pages with
  several `<audio>`/`<video>` elements (YouTube keeps several on the page), a
  new slider value only applied after the effect was turned off and on.
  Each element had its own copy of the effects, and only the last copy got the
  slider changes. All media of a page now go through one shared effect chain,
  so every change applies to the audio that is playing.
- Parameter changes are smoothed: dragging a slider or turning a knob no longer
  clicks or crackles.
- Changing the reverb Room Size only switches the room when it actually changes,
  instead of restarting the reverb tail on every slider move.
- Cancelling a "Leave site?" dialog no longer stops the page's audio.
- Removing a MIDI link chip could delete another link when one control was
  linked to several targets.
- MIDI links on CC 0 and note 0 didn't work.
- A pad linked to an effect could only turn it on (a soft press turned it off,
  a hard one on): pads and keys now toggle the effect on each press.
- The popup no longer reacts to MIDI activity coming from other tabs.
- Moving a slider sent each change twice and saved to storage on every move:
  changes are now sent once per frame and saved after a short pause.

### New

- **Firefox 140+** version (Manifest V3) with the same features as Chrome,
  MIDI included.
- **New popup design**
  - Dark and light themes that follow the system setting
  - Effect cards with an icon, a short description, an on/off switch and
    expandable sliders
  - Sliders of an effect that is off are shown in grey
  - Header pill showing how many effects are active ("2 active" / "Bypassed")
  - MIDI card: device list with Connect buttons, connection status, Learn and
    Disconnect
  - Learn mode shows the control you moved (e.g. `CC74`, channel 1) and
    highlights everything that can be linked
  - Keyboard support for sliders (arrow keys, Home/End)
- **Notices in the popup**
  - "No audio or video found on this page" with a Retry button (disappears by
    itself as soon as media starts playing)
  - "Sound Tools isn't running on this page yet" for tabs opened before the
    extension was installed or updated, with Reload tab and Retry buttons
  - "Click anywhere on the page to start audio processing" when the browser's
    autoplay policy holds the audio
- Effect settings changed in one tab are applied live to the other tabs.
- MIDI controllers reconnect automatically when unplugged and plugged back in.
- After linking a slider in learn mode, its effect card stays open so the new
  link chip is visible.
- Restyled notifications on the page, protected from the site's own CSS.

### Changed

- MIDI permission is read from the browser's own per-site setting (MIDI is
  restored silently on sites where it was already allowed).
- Pitch bend can no longer be linked: it never worked reliably.
- Removed the unused `activeTab` permission. No new permission is requested.
- Effects are only created when one is first turned on: pages where Sound Tools
  isn't used are left untouched.
- Reverb rooms are generated on demand instead of all at once.

### Under the hood

- The content script owns the state of each tab; the popup is a view of it
  with typed messages (`src/shared/messages.ts`).
- Effect and parameter definitions shared by the popup and the content script
  (`src/shared/`).
- Production builds only log warnings and errors.
- Packaging for addons.mozilla.org, including the source archive required for
  review (`npm run prepare-publish:firefox`).

## 1.0.0

First public release on the Chrome Web Store.

- Real-time Distortion, Reverb (20 rooms, dry/wet mix) and Filter (high-pass +
  low-pass) on any web page
- MIDI controller support with learn mode and removable link chips
- Effect settings and MIDI mappings saved automatically
