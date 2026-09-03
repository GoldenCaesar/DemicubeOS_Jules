# Packaging Plan (Implementation Later)

This project currently runs as a browser game scaffold.

## Planned targets
- Steam desktop build (Windows first).
- Android Play Store build.

## Planned approach
- Primary path: package web app in a native desktop wrapper for Steam and use a mobile wrapper for Android.
- Keep mission/program content modular so updates can be shipped as content changes without rewriting core engine files.

## Planned scripts
- `scripts/build-desktop.bat`: build desktop release artifact.
- `scripts/build-android.bat`: build Android release artifact.
- `scripts/publish-content.bat`: publish mission/program manifest updates.

## Next implementation phase
- Add project-level package manager and bundler.
- Add wrapper toolchain config.
- Add signed release pipeline and store metadata steps.
