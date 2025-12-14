[中文](README.md) | English

# WorkMirror

Automatically review your daily work and generate traceable daily/weekly reports (Local-first / Windows Tray)

WorkMirror runs silently in your Windows system tray, recording your work traces (window switching, code changes, browsing history), organizing them into "work sessions", and generating daily/weekly summaries. Every conclusion can be expanded to reveal its source evidence (local-first, offline-capable, no manual logging required).

## Features

- **Auto Daily/Weekly Reports**: Segments your day into work sessions with AI-generated summaries; supports periodic aggregation (daily/weekly/trends).
- **Traceable Evidence Chain**: Every conclusion can be expanded to show evidence coverage and details (Diffs/Windows/Browser).
- **Skill Tree & Trends**: Skill attribution and trend visualization based on work sessions (unified metrics, explainable).
- **Works Offline**: Rule-based summaries work without AI keys; configure AI for enhanced semantic capabilities.
- **Privacy by Default**: Local data storage; URL/title sanitization; local HTTP only listens on `127.0.0.1`.
- **No Silent Failures**: Built-in status page and diagnostic export; empty states/errors provide actionable guidance.

## Not For (Current Stage)

- Cloud sync/account system/team collaboration
- macOS/Linux workflows (Windows 10/11 only currently)
- Replacing TODO/OKR/habit management tools

## Tech Stack

- **Backend**: Go 1.25.4
- **Storage**: SQLite (WAL mode)
- **AI**: DeepSeek (LLM) + SiliconFlow (Embedding/Reranker)

## Quick Start

Download from Releases: <https://github.com/yuqie6/WorkMirror/releases>

## Build & Distribution (Windows)

`cmd/workmirror-agent/` supports Windows builds only.

Recommended "portable distribution" (one `workmirror.exe` + `config/` and `data/` in the same directory). First run auto-generates `./config/config.yaml` and `./data/`.

In PowerShell:

```powershell
go build -trimpath -ldflags "-H=windowsgui -s -w" -o .\workmirror.exe .\cmd\workmirror-agent\
```

Notes:

- Builds as GUI subsystem (no visible console window).
- After Agent starts, tray menu "Open Panel" opens local UI in app-mode window (built-in and served by Agent).

## Running & Data Locations

- Run: Double-click `workmirror.exe`, or execute `.\workmirror.exe` in terminal
- UI: Tray → Open Panel; or read `.\data\http_base_url.txt` and open in browser (e.g., `http://127.0.0.1:12345/`)
- Default database: `.\data\workmirror.db`
- Port discovery: `.\data\http_base_url.txt`

## Configuration (YAML)

Config file defaults to `.\config\config.yaml`, template at `config/config.yaml.example`.

Most important is Diff watch paths: without them, no code changes are collected.
Configure to Git project directories (non-Git directories are skipped).

```yaml
diff:
  enabled: true
  watch_paths:
    - "C:\\Users\\Dev\\Projects\\MyRepo"
```

AI Keys should be injected via environment variables (avoid writing to disk), e.g., `DEEPSEEK_API_KEY`, `SILICONFLOW_API_KEY` (see `config/config.yaml.example`).
Disable `browser.enabled` in config if you don't want browser history collection.

## Frontend Development (UI)

Frontend source in `frontend/`, recommended dev workflow:

```powershell
# Start agent first; port is auto-assigned and written to .\data\http_base_url.txt
$pwd.Path
Set-Location ".\frontend"
$env:VITE_API_TARGET = Get-Content "..\data\http_base_url.txt"
pnpm install
pnpm dev
```

For release, build frontend to `frontend/dist/`; to embed UI assets in single binary, copy `dist/` to `internal/uiassets/dist/` then recompile agent (this directory is generated, not recommended for commit).

## Troubleshooting (Start Here)

- Status snapshot: `GET /api/status`
- Export diagnostics (sanitized zip): `GET /api/diagnostics/export`
- Session maintenance: `POST /api/maintenance/sessions/rebuild`, `POST /api/maintenance/sessions/enrich`

All endpoints use base URL from `.\data\http_base_url.txt` (service listens on `127.0.0.1` only).

## Project Structure

```
├── cmd/workmirror-agent/    # Main program entry
├── config/              # Configuration files
├── internal/
│   ├── collector/       # Collectors (Win32 API / Diff / Browser History)
│   ├── bootstrap/       # Dependency assembly / runtime build
│   ├── server/          # Local HTTP Server (JSON API + SSE + Static UI)
│   ├── observability/   # status/diagnostics (no silent failures)
│   ├── service/         # Business logic layer
│   ├── repository/      # Data access layer
│   ├── model/           # Data models
│   └── pkg/             # Internal utilities
└── data/                # Runtime data
```

## License

MIT
