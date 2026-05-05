# App Workspace

This folder is reserved for the future workout app and its supporting design/config files.

Current contents:

- `docs/` for app-specific design notes and specs
- `examples/` for starter config examples
- `web/` for the modular browser app

The existing tracker pipeline remains outside this folder so the current project stays clean and easy to navigate.

## App Start

The first app slice lives in `app/web/` and is intentionally dependency-light.

Current modules:

- internal exercise library with import/export
- routine template editing
- browser local persistence
- routine CSV import/export
- routine and multi-routine plan import
- seeded workout history view from the existing Strong export
- dashboard placeholder for the later config-driven renderer

Because the app uses ES modules, it is best opened through a small local server instead of double-clicking the HTML file.

Example:

```bash
cd app/web
python -m http.server 8000
```

Then open `http://localhost:8000`.
