# Programs Folder

Command programs are separated from engine files so they can be added or changed independently.

## Rules
- Built-in commands are listed in `builtins/registry.json`.
- Future custom command modules can live in subfolders (for example `network/`, `forensics/`, `python/`).
- Keep one command definition per file once command modules are added.
