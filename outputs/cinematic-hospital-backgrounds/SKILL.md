---
name: cinematic-hospital-backgrounds
description: Add realistic hospital photography and cinematic video backgrounds to web applications, including asset generation, lightweight integration, user toggles, readability overlays, reduced-motion behavior, and validation. Use when a user requests cinematic, photographic, hospital, healthcare, people, or video backgrounds for an app.
---

# Cinematic Hospital Backgrounds

## Workflow

1. Inspect the target app shell, login screen, theme system, public asset directory, and build commands before editing.
2. Ask only for missing visual constraints. Default to realistic hospital interiors, diverse adult staff, medical supplies, no logos, no readable text, calm camera movement, and dark negative space behind UI.
3. Generate 2–3 wide still images for the authenticated app and one short landscape login video. Use `seedream-5.5` for photorealistic stills. For free-plan video use `minimax-h3`, 768p, 5 seconds, muted unless audio is explicitly requested.
4. Store assets under the frontend public directory, for example `public/backgrounds/`. Use local files for production; do not depend on signed session URLs.
5. Add a subtle rotating image layer to the authenticated app shell. Use low opacity, `background-size: cover`, a dark/readability overlay, and an 15–20 second rotation interval. Keep sidebars, cards, tables, and forms above the layer.
6. Add the video behind the login form with `autoPlay`, `muted`, `loop`, `playsInline`, a poster image, and a dark gradient overlay. Keep login content above it.
7. Add a user preference toggle on Home or Dashboard. Persist it in `localStorage` using a stable key such as `cinematic-background-enabled`; dispatch a custom event so the shared shell updates immediately. Default to enabled. Respect `prefers-reduced-motion` by disabling rotation/video motion or using the poster image.
8. Keep performance bounded: compress images, avoid more than three rotating stills, preload only the poster, and do not autoplay audio.
9. Validate asset existence, backend/frontend syntax as applicable, focused TypeScript, and responsive readability in dark and light themes.

## Integration Pattern

Use a shared shell state:

```ts
const [cinematicEnabled, setCinematicEnabled] = useState(() =>
  localStorage.getItem("cinematic-background-enabled") !== "false"
);
useEffect(() => {
  const sync = () => setCinematicEnabled(localStorage.getItem("cinematic-background-enabled") !== "false");
  window.addEventListener("cinematic-background-change", sync);
  return () => window.removeEventListener("cinematic-background-change", sync);
}, []);
```

The Home/Dashboard toggle should update the same key and event:

```ts
const next = !cinematicEnabled;
localStorage.setItem("cinematic-background-enabled", String(next));
window.dispatchEvent(new Event("cinematic-background-change"));
```

Render the background layer only when enabled. Always retain a solid theme background underneath it.

## Prompt Defaults

Still image prompt: photorealistic cinematic wide hospital medical stores or logistics interior, diverse adult healthcare staff in navy and teal scrubs, organized sterile supply shelves, clean modern hospital, soft teal and warm light, no logos, no readable text, natural anatomy, documentary photography, generous dark negative space for UI, 16:9.

Video prompt: photorealistic hospital medical stores at dawn, diverse adult supply staff calmly organizing sterile cartons and checking shelves, slow gentle dolly movement, professional trustworthy mood, no logos, no readable text, quiet background suitable for login UI.

## Safety and UX

Do not use identifiable patients or imply a real person endorses the product. Prefer staff and non-sensitive clinical spaces. Never let moving imagery reduce text contrast. Provide a poster/gradient fallback when video fails, and preserve all functionality when media is disabled.

## Validation

Check that every referenced asset exists under `public/`, the login video is playable, no UI text is hidden, the toggle persists after refresh, disabling removes both image rotation and video motion, reduced-motion users receive a static fallback, and focused TypeScript/build checks pass. Keep Git commands separate from implementation and provide them only after requested.
