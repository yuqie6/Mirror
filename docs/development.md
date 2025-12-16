# 开发者文档 / Developer Notes

本文档面向维护者与贡献者；普通用户请优先按 Releases 的 zip 便携目录方式使用。

## 从源码构建（Windows）/ Build From Source (Windows)

- 仅支持 Windows 10/11 构建（`cmd/workmirror-agent/` 含 `//go:build windows`）。
- 需要 Go 1.25.4。

PowerShell:

```powershell
go build -trimpath -ldflags "-H=windowsgui -s -w" -o .\workmirror.exe .\cmd\workmirror-agent\
```

## 前端开发（UI）/ Frontend Dev (UI)

前端源码位于 `frontend/`。开发模式建议先启动 Agent，然后读取 `.\data\http_base_url.txt` 作为 `VITE_API_TARGET`：

```powershell
Set-Location ".\frontend"
$env:VITE_API_TARGET = Get-Content "..\data\http_base_url.txt"
pnpm install
pnpm dev
```

## Release 打包（zip）/ Release Packaging (zip)

仓库内提供了最小化的 zip 打包脚本：`scripts/release/build-windows-zip.ps1`。

示例（PowerShell）：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\release\build-windows-zip.ps1" -Version "v0.2.0-alpha.2"
```

## Release 构建（Bash/WSL 交叉编译）

如果你在 WSL/Linux 上交叉编译 Windows exe，可使用：`scripts/release/build-windows-exe.sh`。

示例（不把 Key 写进仓库，使用环境变量注入）：

```bash
export WORKMIRROR_DEFAULT_LLM_BASE_URL="https://gpt.devbin.de/proxy/mirror"
export WORKMIRROR_DEFAULT_LLM_API_KEY="<your_api_key>"
export WORKMIRROR_DEFAULT_LLM_MODEL="llama-3.3-70b"

bash "scripts/release/build-windows-exe.sh" --out "/mnt/f/tools/workmirror/workmirror.exe"
```

## Release 打包（Bash/WSL，zip）

如果你需要在 WSL/Linux 上直接产出“可发布的便携 zip”，可使用：`scripts/release/build-windows-zip.sh`。

建议通过环境变量注入默认服务参数（避免出现在 shell history）：

```bash
export WORKMIRROR_DEFAULT_LLM_BASE_URL="https://gpt.devbin.de/proxy/mirror"
export WORKMIRROR_DEFAULT_LLM_API_KEY="<your_api_key>"
export WORKMIRROR_DEFAULT_LLM_MODEL="llama-3.3-70b"

bash "scripts/release/build-windows-zip.sh" --version "v0.2.0-alpha.2" --arch "x64"
```
