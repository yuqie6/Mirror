#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
用法：
  bash "scripts/release/build-windows-zip.sh" [选项]

产物：
  dist/release/WorkMirror-<version>-windows-<arch>.zip

选项：
  --version <vX.Y.Z...>        版本号（默认：从 internal/pkg/buildinfo/buildinfo.go 读取）
  --arch <x64|arm64>           目标架构（默认：x64；映射到 GOARCH=amd64/arm64）
  --outdir <dir>               输出目录（默认：dist/release）
  --skip-ui <0|1>              跳过 UI 构建与拷贝（默认：0）

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

version=""
arch="x64"
outdir="${repo_root}/dist/release"
skip_ui="0"

default_llm_base_url="${WORKMIRROR_DEFAULT_LLM_BASE_URL:-}"
default_llm_api_key="${WORKMIRROR_DEFAULT_LLM_API_KEY:-}"
default_llm_model="${WORKMIRROR_DEFAULT_LLM_MODEL:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --version)
      version="$2"
      shift 2
      ;;
    --arch)
      arch="$2"
      shift 2
      ;;
    --outdir)
      outdir="$2"
      shift 2
      ;;
    --skip-ui)
      skip_ui="$2"
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
if [[ -z "${version}" ]]; then
  echo "无法解析版本号：internal/pkg/buildinfo/buildinfo.go" >&2
  exit 2
fi

goarch=""
case "${arch}" in
  x64|amd64) goarch="amd64" ;;
  arm64) goarch="arm64" ;;
  *)
    echo "不支持的 --arch：${arch}（支持：x64/arm64）" >&2
    exit 2
    ;;
esac

mkdir -p "${outdir}"

staging_root="${outdir}/WorkMirror-${version}-windows-${arch}"
zip_path="${outdir}/WorkMirror-${version}-windows-${arch}.zip"

rm -rf "${staging_root}"
mkdir -p "${staging_root}"

if [[ "${skip_ui}" != "1" ]]; then
  if [[ -f "${repo_root}/frontend/package.json" ]]; then
    if [[ ! -f "${repo_root}/frontend/dist/index.html" ]]; then
      if command -v pnpm >/dev/null 2>&1; then
        pnpm -C "${repo_root}/frontend" build
      elif command -v npm >/dev/null 2>&1; then
        npm --prefix "${repo_root}/frontend" run build
      else
        echo "未找到 pnpm/npm：请先手动构建 UI（frontend/dist），或传 --skip-ui 1" >&2
        exit 2
      fi
    fi
  fi
fi

ldflags=(
  "-H=windowsgui"
  "-s"
  "-w"
  "-X github.com/yuqie6/WorkMirror/internal/pkg/buildinfo.Version=${version}"
)

if command -v git >/dev/null 2>&1 && git -C "${repo_root}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  commit="$(git -C "${repo_root}" rev-parse --short HEAD)"
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

ldflags_str="$(printf '%s ' "${ldflags[@]}")"
ldflags_str="${ldflags_str% }"

pushd "${repo_root}" >/dev/null
GOOS="windows" GOARCH="${goarch}" go build -trimpath \
  -o "${staging_root}/workmirror.exe" \
  -ldflags "${ldflags_str}" \
  "./cmd/workmirror-agent/"
popd >/dev/null

if [[ "${skip_ui}" != "1" ]]; then
  if [[ -f "${repo_root}/frontend/dist/index.html" ]]; then
    mkdir -p "${staging_root}/frontend"
    cp -R "${repo_root}/frontend/dist" "${staging_root}/frontend/"
  fi
fi

mkdir -p "${staging_root}/config"
if [[ -f "${repo_root}/config/config.yaml.example" ]]; then
  cp "${repo_root}/config/config.yaml.example" "${staging_root}/config/config.yaml.example"
fi

cat > "${staging_root}/README.txt" <<EOF
WorkMirror ${version} (portable folder)

1) Unzip to a fixed folder you will keep (avoid running from Downloads).
2) Double-click workmirror.exe.
3) First run auto-creates: ./config/config.yaml ./data/ ./logs/
4) To migrate/backup, move the whole folder.
EOF

if [[ -f "${repo_root}/LICENSE" ]]; then
  cp "${repo_root}/LICENSE" "${staging_root}/LICENSE"
fi

rm -f "${zip_path}"
pushd "${outdir}" >/dev/null
zip -r -9 "$(basename "${zip_path}")" "$(basename "${staging_root}")" >/dev/null
popd >/dev/null

echo "OK: ${zip_path}"
echo "Version: ${version}"
echo "Arch: ${arch} (GOARCH=${goarch})"
echo "DefaultLLMBaseURL: $([[ -n "${default_llm_base_url}" ]] && echo yes || echo no)"
echo "DefaultLLMAPIKey: $([[ -n "${default_llm_api_key}" ]] && echo yes || echo no)"
echo "DefaultLLMModel: $([[ -n "${default_llm_model}" ]] && echo yes || echo no)"

