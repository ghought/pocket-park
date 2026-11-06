# Pocket Park

Miniature golf in weird little places. Twelve holes built from kitchen counters,
laundromats, diners and a rooftop skate spot, played three at a time.

## Run it

```bash
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server, also on your network for phone testing |
| `npm run build` | Typecheck, then a static build in `dist/` with hashed assets |
| `npm run check` | Plays every hole headlessly and fails if one breaks |

`npm run check` is the safety net for course design. Run it after changing physics
or a hole. For each hole it finds the fewest strokes, scores a decent but imperfect
player, confirms a birdie and the bank-shot medal are reachable, fires random shots
to catch tunnelling or stuck balls, checks every ramp launches, and tries the daily
twists on mirrored holes.

## Controls

| | Touch or mouse | Keyboard |
| --- | --- | --- |
| Aim and shoot | Pull back anywhere, let go. Drag back to the start to cancel | Arrows or WASD, then Space. Hold Shift for fine aim |
| Reset the hole | Reset button | R |
| Pause | Pause button | P or Esc |
| Sound | Pause menu | M |

## How it's built

There are no image or audio files. Every prop is drawn in code and every sound is
synthesised, so the download is mostly fonts.

- `src/core/physics.ts` is the simulation: a 240 Hz fixed step with swept collision,
  so a ball can't pass through anything at any speed. It knows nothing about the DOM,
  which is what lets `npm run check` run it headlessly.
- `src/core/world.ts` turns hole data into colliders and zones.
- `src/content/holes.ts` is the course data. A hole is a list of reusable props.
- `src/render/props.ts` draws each prop. New obstacle kinds need physics in `world.ts`
  and art here.
- `src/content/daily.ts` works out the daily course from the date, so nothing needs
  publishing. It remixes the 12 holes with mirroring and twists.

See [CLAUDE.md](CLAUDE.md) for the PCKT Games rules this follows.
