
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
KUBECTL="kubectl.exe"

echo "=================================="
echo " Deploying TaskFlow to Kubernetes"
echo "=================================="

# Convert Linux paths to Windows-compatible paths
apply_manifest() {
    local manifest="$1"
    local windows_path

    windows_path="$(wslpath -m "$manifest")"

    echo "Applying: $(basename "$manifest")"
    "$KUBECTL" apply -f "$windows_path"
}

# Apply Kubernetes resources
apply_manifest "$PROJECT_DIR/kubernetes/namespace.yaml"
apply_manifest "$PROJECT_DIR/kubernetes/deployment.yaml"
apply_manifest "$PROJECT_DIR/kubernetes/service.yaml"
apply_manifest "$PROJECT_DIR/kubernetes/hpa.yaml"

echo ""
echo "Waiting for deployment rollout..."

"$KUBECTL" rollout status deployment/taskflow \
    -n taskflow --timeout=120s

echo ""
echo "Deployment status:"
"$KUBECTL" get deployment -n taskflow

echo ""
echo "Pods:"
"$KUBECTL" get pods -n taskflow

echo ""
echo "Services:"
"$KUBECTL" get services -n taskflow

echo ""
echo "=================================="
echo " TaskFlow deployment completed!"
echo "=================================="
