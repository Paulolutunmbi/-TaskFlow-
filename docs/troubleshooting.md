# TaskFlow Troubleshooting Report

This report records issues encountered during the capstone and the actions taken. It distinguishes confirmed observations from possible causes. Do not treat a generic error message as proof of its underlying cause.

| Area | Observed problem | Action / resolution | Evidence and status |
|---|---|---|---|
| Windows + WSL deployment paths | The deployment script reported that a Kubernetes manifest path did not exist, although the file was present in the project. | Updated the Bash script to convert WSL paths with `wslpath -m` before passing them to Windows `kubectl.exe`. | The revised `scripts/deploy.sh` later applied namespace, deployment, service, and HPA manifests successfully and waited for rollout. |
| Minikube / Kubernetes pods | During an earlier scaling exercise, some TaskFlow pods entered `CrashLoopBackOff`. | Inspected pod state/logs and returned the deployment to two replicas; later cluster checks showed two healthy pods. | Do not claim the earlier five-replica test was consistently healthy. Capture fresh pod status before the final demonstration. |
| MongoDB Atlas connection | A pod log reported that it could not connect to the Atlas cluster and included a warning about IP allowlisting. Later logs from the pod showed a successful connection and successful HTTP responses. | Checked subsequent pod logs and application health/API responses. | The intermittent connection failure was observed, but its exact root cause was not proven. Possible network or Atlas access configuration issues should be described as possibilities only. Do not expose credentials or permanently allow all IPs as a shortcut. |
| Kubernetes Metrics API | `kubectl top pods -n taskflow` returned `Metrics API not available`. | Treat this as a cluster metrics availability issue; inspect Metrics Server and HPA conditions before relying on CPU metrics. | The error proves metrics were unavailable at that time. It does not, by itself, prove the HPA configuration is invalid or that autoscaling was successfully exercised. |
| Ansible availability | Ansible was initially not installed in the WSL environment. | Installed Ansible in Ubuntu WSL and verified the playbook syntax. | Syntax check passed. |
| Ansible privilege escalation | Running the playbook with Ansible's interactive become-password prompt timed out or failed to complete reliably. | Validated sudo access and ran the playbook using `sudo ansible-playbook ...` instead. | The playbook completed; a repeat run reported `changed=0`, consistent with idempotent state. |
| Terraform setup | Terraform needed initialization and validation before use. | Ran formatting check, initialized the local configuration with `-backend=false`, and validated it. | These checks passed. A previous local `terraform_data` demonstration was applied and destroyed. Re-run plan/apply against the final committed file to capture current evidence. |
| CI/CD workflow | The first successful Actions run displayed warnings that some third-party actions were transitioning from Node.js 20 to Node.js 24. | The workflow still completed successfully; the application test setup uses Node.js 24. | Warnings were not job failures. Review action release notes and update pinned major versions when compatible versions are available. |

## Operational checks

Use these commands to gather current evidence before submission:

```bash
kubectl get nodes
kubectl get pods -n taskflow
kubectl get deployment -n taskflow
kubectl get services -n taskflow
kubectl get hpa -n taskflow
kubectl describe hpa taskflow-hpa -n taskflow
kubectl logs deployment/taskflow -n taskflow
```

For the application, verify `/health`, `/health/live`, `/health/ready`, and `/api/tasks` through the running service URL.

## Security precautions

- Never paste `.env`, MongoDB connection strings, Docker Hub tokens, or Kubernetes Secret values into reports or screenshots.
- Do not commit `.env` or Terraform state files.
- Do not solve Atlas connectivity by permanently allowing every IP address without understanding the security implications.
- Redact credentials and personal data from terminal output before including evidence.
