# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

There is no application code yet. There is no build system, package manifest, test suite, or git repository. The project is still being designed. Update this file with real commands and architecture once code exists.

## Concept (from design mockups)

ChuaTien ("Chùa Tiên") is a virtual pagoda. The UI and copy are in Vietnamese. The current direction, from `room-view-v2.html`:

- The main hall (chính điện) is a 360° panorama photo of a real hall interior. Users drag to look around at the Buddha statue, altar, pillars and ceiling.
- 50 meditation cushions (bồ đoàn) are arranged in front of the altar. Each user occupies a numbered seat, and occupied seats show a floating name tag.
- Each user sees the hall from their own seat's viewpoint.

## Layout

- `.superpowers/brainstorm/<session>/content/*.html`: static HTML mockup fragments from the brainstorming skill (`room-view.html` is v1, `room-view-v2.html` is the newer direction). These are design references only, not app source. The `state/` folders and the `.last-port` and `.last-token` files are local brainstorm-server runtime state. Do not edit them.
