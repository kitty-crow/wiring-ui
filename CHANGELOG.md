# Changelog

This project follows [Semantic Versioning](https://semver.org/) for application releases.
Prior to 1.0.0 the editor remains a **beta**: the wire/project format is currently
schema version 1, which is independent of the application version.

## 0.6.0 — 2026-10-28

**First consciously versioned beta baseline.** The original `0.1.0` package
value was never advanced during initial development; the Git history does **not**
contain earlier tagged releases. Therefore this is not a claim that versions
0.2.0–0.5.0 were previously shipped.

The history from 26–28 October 2026 establishes these functional milestones:

- **Editor foundation:** offline standalone HTML packaging, Pages CI, strict TS
  architecture guards, canvas rendering, pan/zoom, save/load, undo/redo and
  persistent project/settings storage.
- **Wiring:** terminals, orthogonal routes, movable bends, free ends, reconnecting
  conductors, actual junction topology, insulated crossovers and component
  obstacle avoidance.
- **Schematic editing:** keyboard commands, context menus, clipboard, macros,
  multi-selection, group rotation/mirroring, annotation and shape tools.
- **Electronic symbols:** independent label/value fields, engineering-character
  picker, terminal anchors and automatic insertion into existing cable runs.
- **Interface architecture:** typed static TSX markup, icon toolbar, document
  actions, responsive layouts and persistent auto-hiding inspector.
- **Distribution and testing:** PDF/image background templates, PNG/print
  output, downloadable editable HTML, Chromium interaction regressions and
  GitHub Actions deployment. The footer displays the build-time app version.

### Still outside the 1.0.0 scope

The editor is not yet a fully stabilised schematic CAD application:
advanced routing constraints, full WebGL schematic rendering,
comprehensive PDF workflows and electrical-rule checking remain outstanding.
This version does not imply those features are finished or that hardware
pinout validation is provided.

## Versioning policy

- **0.x.0:** a meaningful, user-visible capability milestone before 1.0.
- **0.x.y:** bug fixes, layout fixes and minor compatibility changes within a
  milestone.
- **1.0.0:** first release after the core feature set, document compatibility
  expectations and end-to-end editor behaviours are deliberately stabilised.
- The user-visible version comes from `package.json` at build time, including
  within an exported standalone HTML file; do not hard-code it in the TSX view.
