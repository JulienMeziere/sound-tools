# Sound Tools – Release Test Plan (v1.1.0)

Manual checks to run before publishing to the Chrome Web Store. Each step lists
what to do (→) and what you should see (✅). Budget ~20 min without MIDI and
~35 min with a MIDI controller.

## 0. Setup

1. `npm ci && npm run build && npm run package`
2. Open `chrome://extensions`, **disable the Web Store version of Sound Tools**
   (two copies would fight over the same media elements), enable _Developer
   mode_, then **Load unpacked** → select `dist/`.
3. Check that the card shows **version 1.1.0**.
4. Have these tabs ready (open them _after_ loading the extension):
   - **A**: a YouTube video
   - **B**: any other site with audio/video (SoundCloud, Bandcamp, a podcast, a news video…)
   - **C**: a page without media (e.g. wikipedia.org)
5. Keep the page DevTools console open on tab A (F12) during the whole session.

> The unpacked build has a different extension ID from the store version, so it
> starts with default settings. Loading settings and MIDI mappings saved by
> v1.0 is covered by the automated tests (storage keys and format are unchanged).

## 1. Real-time sliders (the reported bug)

On tab **A**, play the video, open the popup.

| #    | Step                                                             | Expected                                                                                                  |
| ---- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1.1  | → Flip **Filter**'s switch                                       | ✅ Switch turns on, card gets a violet border, header pill "1 active", toast "Filter enabled" on the page |
| 1.2  | → Click the Filter card, drag **Low-Pass Frequency** slowly to 0 | ✅ Sound gets muffled **while dragging**, no need to toggle the effect                                    |
| 1.3  | → Drag it back to 100                                            | ✅ Sound opens up progressively, no clicks/crackles                                                       |
| 1.4  | → Drag **High-Pass Frequency** up                                | ✅ Bass disappears live                                                                                   |
| 1.5  | → Set Low-Pass ~40, move **Low-Pass Resonance (Q)** up           | ✅ Resonant "whistle" peak appears live                                                                   |
| 1.6  | → Same for **High-Pass Resonance (Q)**                           | ✅ Live change                                                                                            |
| 1.7  | → Enable **Distortion**, move **Distortion Amount** 0 → 100      | ✅ Grit increases live                                                                                    |
| 1.8  | → Enable **Reverb**, move **Reverb Mix** 0 → 100                 | ✅ Goes from dry to fully wet live                                                                        |
| 1.9  | → Move **Room Size** 0 → 100                                     | ✅ Room grows in steps (20 rooms); a brief tail reset at each step is expected                            |
| 1.10 | → Use keyboard: click a slider, press ←/→, Home/End              | ✅ Slider moves and audio follows                                                                         |
| 1.11 | → Repeat 1.1–1.3 on tab **B**                                    | ✅ Same behaviour                                                                                         |

## 2. Effect chain

| #   | Step                                                     | Expected                                           |
| --- | -------------------------------------------------------- | -------------------------------------------------- |
| 2.1 | → With all 3 effects ON, toggle each OFF/ON in any order | ✅ Each toggle is heard immediately, toasts appear |
| 2.2 | → Turn all effects OFF                                   | ✅ Audio sounds exactly like the original          |
| 2.3 | → With an effect OFF, move its sliders, then turn it ON  | ✅ The effect starts with the values you just set  |

## 3. Persistence & sync

| #   | Step                                                                  | Expected                                                    |
| --- | --------------------------------------------------------------------- | ----------------------------------------------------------- |
| 3.1 | → Close the popup, reopen it                                          | ✅ Same ON/OFF states and slider values                     |
| 3.2 | → Reload tab A, reopen popup                                          | ✅ All effects OFF (by design), slider values kept          |
| 3.3 | → On tab B enable Filter, then on tab A change Low-Pass, go back to B | ✅ Tab B's sound changed too; B's popup shows the new value |
| 3.4 | → Restart Chrome, reopen popup on any page                            | ✅ Slider values kept                                       |

## 4. Dynamic pages

| #   | Step                                                                     | Expected                                            |
| --- | ------------------------------------------------------------------------ | --------------------------------------------------- |
| 4.1 | → Tab A, Filter ON, click another YouTube video (no page reload)         | ✅ Effect still applied, sliders still live         |
| 4.2 | → On YouTube home, hover thumbnails (inline previews), then open a video | ✅ Effects and sliders still work on the main video |
| 4.3 | → If an ad plays, move a slider during the ad and after it               | ✅ Live in both cases                               |
| 4.4 | → Open a YouTube Short with effects ON                                   | ✅ Effects apply                                    |

## 5. Pages where it can't run

| #   | Step                                                                                                                 | Expected                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 5.1 | → Open the popup on `chrome://extensions`                                                                            | ✅ Yellow notice "Sound Tools isn’t running on this page…" after ~1 s, no blank popup |
| 5.2 | → Click **reload** on the extension card in `chrome://extensions`, then open the popup on tab A without reloading it | ✅ Same notice; after reloading tab A the popup works                                 |
| 5.3 | → Tab C (no media): open popup, toggle effects, move sliders                                                         | ✅ Notice "No audio or video found…" + Retry; no errors; the page is unaffected       |

## 6. Autoplay policy (may not reproduce on every site)

1. → Paste a YouTube video URL in a **new tab** and **don't click the page**.
2. → Open the popup and enable an effect.
3. ✅ Either audio keeps playing with the effect, **or** the popup shows
   "Click anywhere on the page to start audio processing". If it does, click the page:
   ✅ audio comes back with the effect and the notice disappears when you reopen the popup.

## 7. MIDI (needs a controller with at least one knob/fader and one pad/key)

Plug the controller in **before** starting. Use tab A.

| #    | Step                                                                            | Expected                                                                                   |
| ---- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 7.1  | → Popup → MIDI card → **Enable**                                                | ✅ Chrome permission prompt for the site; after accepting, toast "MIDI permission granted" |
| 7.2  | → Reopen the popup                                                              | ✅ The MIDI card is open and lists your device                                             |
| 7.3  | → Click **Connect** next to your device                                         | ✅ Card shows the device name with a green dot "Connected", toast                          |
| 7.4  | → Click **Learn**                                                               | ✅ Button "Stop learning", text "Move a knob, fader or pad…"                               |
| 7.5  | → Turn a knob                                                                   | ✅ Tag `CCxx` + channel shown, all effect cards expand, switches and sliders pulse         |
| 7.6  | → Click the **Low-Pass Frequency** slider                                       | ✅ Pulsing stops, Filter panel stays open, chip `CCxx` under the slider                    |
| 7.7  | → Enable Filter, turn the knob                                                  | ✅ Sound changes live **and** the popup slider follows the knob                            |
| 7.8  | → Learn → press a pad/key → click **Reverb**'s switch                           | ✅ Chip `Note nn` under Reverb                                                             |
| 7.9  | → Press the pad several times (soft and hard)                                   | ✅ Reverb toggles ON/OFF on each press, popup follows                                      |
| 7.10 | → Learn → turn the **same** knob as 7.5 → click **Reverb Mix**                  | ✅ The knob now drives both Low-Pass and Reverb Mix                                        |
| 7.11 | → Remove the chip under **Reverb Mix** (×)                                      | ✅ Only that chip disappears; the knob still drives Low-Pass                               |
| 7.12 | → Learn → turn a fader → click **Distortion**'s switch; move the fader low/high | ✅ Distortion OFF in the lower half, ON in the upper half                                  |
| 7.13 | → Learn, then click **Stop learning** without linking                           | ✅ Learn mode exits, nothing linked                                                        |
| 7.14 | → Close and reopen the popup                                                    | ✅ All chips are still there                                                               |
| 7.15 | → Reload tab A                                                                  | ✅ No permission prompt; toast "MIDI controller restored"; knob works right away           |
| 7.16 | → Open YouTube in another tab (same site), use the knob there                   | ✅ Restored there too (MIDI permission is per site)                                        |
| 7.17 | → On tab B (another site) open the popup                                        | ✅ MIDI card shows **Enable** (permission not granted for that site yet)                   |
| 7.18 | → Unplug the controller with the popup open on tab A                            | ✅ MIDI card switches to "Not connected"                                                   |
| 7.19 | → Plug it back in                                                               | ✅ Reconnects automatically, chips come back                                               |
| 7.20 | → Click **Disconnect**, reload the page                                         | ✅ Toast "MIDI device disconnected"; after reload the device is **not** auto-connected     |
| 7.21 | → Connect the device again manually                                             | ✅ All previous mappings are back                                                          |

## 8. Final checks

- [ ] Tab A's DevTools console shows no red errors from "🎵 Sound Tools" (yellow warnings
      such as "Cannot process this media element" on a site that uses its own Web
      Audio are acceptable)
- [ ] Popup looks right: no layout overflow, buttons have hover states, check both the dark and the light OS theme
- [ ] `chrome://extensions` shows no "Errors" button on the Sound Tools card
- [ ] Re-enable the Web Store version afterwards (or remove the unpacked one)

## 9. Publish

1. Upload `sound-tools-extension.zip` (version **1.1.0**) in the developer dashboard.
2. Permissions: `activeTab` was removed (it was unused); `storage` and
   `<all_urls>` are unchanged, so users won't see a new permission prompt.

## 10. Firefox (before the first addons.mozilla.org upload)

An automated headless run already covered the popup ↔ content script flow,
the three effects, sliders, persistence, late-added media, page reload and MIDI
device listing (with Firefox's virtual test devices). These steps cover what it
can't: the real toolbar popup, real sites and the install flow.

Setup: `npm ci && npm run prepare-publish:firefox`, then in Firefox 140+ open
`about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** →
`dist-firefox/manifest.json` (or run `npm run start:firefox`).

| #    | Step                                                                       | Expected                                                                             |
| ---- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 10.1 | → Run sections 1–4 on YouTube and another media site                       | ✅ Same results as in Chrome                                                         |
| 10.2 | → Open the popup on `about:addons` and on addons.mozilla.org               | ✅ Notice "Sound Tools isn’t running on this page…"                                  |
| 10.3 | → `about:addons` → Sound Tools → Permissions: turn off "Access your data…" | ✅ Popup shows the "isn’t running" notice on every site; turning it back on fixes it |
| 10.4 | → Run section 7 (MIDI) with a controller plugged in                        | ✅ Same results as in Chrome (Firefox shows its own permission prompt)               |
| 10.5 | → Open a private window (allow the add-on in private windows first)        | ✅ Effects work                                                                      |
| 10.6 | → Browser Console (Ctrl+Shift+J) during the whole session                  | ✅ No errors from "🎵 Sound Tools" or from `moz-extension://`                        |
| 10.7 | → Upload `sound-tools-firefox.zip` + `sound-tools-source.zip` to AMO       | ✅ Validation shows 0 errors (2 known React DOM `innerHTML` warnings)                |
| 10.8 | → In the AMO "Notes to reviewer", paste the build steps from the README    | ✅ "Build instructions for AMO reviewers" section copied                             |
