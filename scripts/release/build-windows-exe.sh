#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
用法：
  bash "scripts/release/build-windows-exe.sh" [选项]

选项：
  --out <path>                 输出 exe 路径（默认：dist/workmirror.exe）
  --version <vX.Y.Z...>        注入 buildinfo.Version（默认：从 internal/pkg/buildinfo/buildinfo.go 读取）
  --commit <sha>               注入 buildinfo.Commit（默认：git rev-parse --short HEAD；无 git 则跳过）
  --arch <amd64|arm64>         目标架构（默认：amd64）
  --tags <go build tags>       go build -tags（可选）
  --windowsgui <0|1>           是否启用 -H=windowsgui（默认：1）

  --default-llm-base-url <url> 注入 buildinfo.DefaultLLMBaseURL（可选；也可用环境变量）
  --default-llm-api-key <key>  注入 buildinfo.DefaultLLMAPIKey（可选；也可用环境变量；不会打印）
  --default-llm-model <model>  注入 buildinfo.DefaultLLMModel（可选；也可用环境变量）

环境变量（与上面 3 个 default-llm 参数等价）：
  WORKMIRROR_DEFAULT_LLM_BASE_URL
  WORKMIRROR_DEFAULT_LLM_API_KEY
  WORKMIRROR_DEFAULT_LLM_MODEL
EOF
}

repo_root="$(
  cd "$(dirname "$0")/../.." >/dev/null 2>&1
  pwd
)"

out_path="${repo_root}/dist/workmirror.exe"
arch="amd64"
tags=""
windowsgui="1"

default_llm_base_url="${WORKMIRROR_DEFAULT_LLM_BASE_URL:-}"
default_llm_api_key="${WORKMIRROR_DEFAULT_LLM_API_KEY:-}"
default_llm_model="${WORKMIRROR_DEFAULT_LLM_MODEL:-}"

version=""
commit=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --out)
      out_path="$2"
      shift 2
      ;;
    --version)
      version="$2"
      shift 2
      ;;
    --commit)
      commit="$2"
      shift 2
      ;;
    --arch)
      arch="$2"
      shift 2
      ;;
    --tags)
      tags="$2"
      shift 2
      ;;
    --windowsgui)
      windowsgui="$2"
      shift 2
      ;;
    --default-llm-base-url)
      default_llm_base_url="$2"
      shift 2
      ;;
    --default-llm-api-key)
      default_llm_api_key="$2"
      shift 2
      ;;
    --default-llm-model)
      default_llm_model="$2"
      shift 2
      ;;
    *)
      echo "未知参数：$1" >&2
      echo >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "${version}" ]]; then
  version="$(
    sed -n 's/^var Version = "\\(v[^"]*\\)".*$/\\1/p' "${repo_root}/internal/pkg/buildinfo/buildinfo.go" | head -n 1
  )"
fi

if [[ -z "${commit}" ]]; then
  if command -v git >/dev/null 2>&1 && git -C "${repo_root}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    commit="$(git -C "${repo_root}" rev-parse --short HEAD)"
  fi
fi

mkdir -p "$(dirname "${out_path}")"

ldflags=()
if [[ "${windowsgui}" == "1" ]]; then
  ldflags+=("-H=windowsgui")
fi

if [[ -n "${version}" ]]; then
  ldflags+=("-X github.com/yuqie6/WorkMirror/internal/pkg/buildinfo.Version=${version}")
fi
if [[ -n "${commit}" ]]; then
  ldflags+=("-X github.com/yuqie6/WorkMirror/internal/pkg/buildinfo.Commit=${commit}")
fi

if [[ -n "${default_llm_base_url}" ]]; then
  ldflags+=("-X github.com/yuqie6/WorkMirror/internal/pkg/buildinfo.DefaultLLMBaseURL=${default_llm_base_url}")
fi
if [[ -n "${default_llm_api_key}" ]]; then
  ldflags+=("-X github.com/yuqie6/WorkMirror/internal/pkg/buildinfo.DefaultLLMAPIKey=${default_llm_api_key}")
fi
if [[ -n "${default_llm_model}" ]]; then
  ldflags+=("-X github.com/yuqie6/WorkMirror/internal/pkg/buildinfo.DefaultLLMModel=${default_llm_model}")
fi

ldflags_str=""
if [[ ${#ldflags[@]} -gt 0 ]]; then
  ldflags_str="$(printf '%s ' "${ldflags[@]}")"
  ldflags_str="${ldflags_str% }"
fi

pushd "${repo_root}" >/dev/null
if [[ -n "${tags}" ]]; then
  GOOS="windows" GOARCH="${arch}" go build \
    -o "${out_path}" \
    -tags "${tags}" \
    -ldflags "${ldflags_str}" \
    "./cmd/workmirror-agent/"
else
  GOOS="windows" GOARCH="${arch}" go build \
    -o "${out_path}" \
    -ldflags "${ldflags_str}" \
    "./cmd/workmirror-agent/"
fi
popd >/dev/null

echo "OK: ${out_path}"
echo "Injected: version=${version}"
echo "Injected: commit=${commit:-<none>}"
echo "Injected: DefaultLLMBaseURL=$([[ -n "${default_llm_base_url}" ]] && echo yes || echo no)"
echo "Injected: DefaultLLMAPIKey=$([[ -n "${default_llm_api_key}" ]] && echo yes || echo no)"
echo "Injected: DefaultLLMModel=$([[ -n "${default_llm_model}" ]] && echo yes || echo no)"

