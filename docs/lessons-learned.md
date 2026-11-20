# Lessons Learned and Future Improvements

## Lessons learned

1. **Environment boundaries matter.** Windows, WSL, and Linux tools can interpret file paths differently. The manifest-path issue was resolved by explicitly converting WSL paths before invoking Windows `kubectl.exe`.
2. **Container health depends on external services.** A container can start while the application is unable to reach MongoDB Atlas. Readiness checks and application logs are important for distinguishing process health from service readiness.
3. **Kubernetes requires observability.** Pod status, events, logs, resource requests/limits, and metrics all matter. An HPA manifest alone does not prove that CPU-based autoscaling is functioning.
4. **Automation should be repeatable.** The Ansible playbook's repeat run reported `changed=0`, demonstrating idempotent configuration.
5. **CI should validate before publishing.** Running `npm ci` and automated tests before building/publishing reduces the chance of publishing an image from a broken commit.
6. **Secrets must be managed separately from source code.** Environment files, Docker Hub credentials, and Kubernetes Secret values must not be committed.
7. **A local capstone can demonstrate cloud-native practices without creating billable infrastructure.** Minikube and Terraform's local `terraform_data` resource provide a safe demonstration, but they must not be described as a production Azure deployment.

## Future improvements

- Add authentication, authorization, and per-user task ownership.
- Add automated integration tests against an isolated test database and test the container image in CI.
- Pin production dependencies and scan container images for known vulnerabilities.
- Use a managed secret store or a secure external secrets workflow rather than manually creating Kubernetes Secrets.
- Add structured application logging, centralized log collection, and alerting.
- Configure and verify Metrics Server, then run a controlled load test to validate HPA scale-up and scale-down behavior.
- Add a staging environment and an approval-gated deployment stage.
- Deploy to a managed Kubernetes service only when an approved cloud budget and credentials are available.
- Add database backup, restore, and retention procedures.
- Introduce HTTPS, rate limiting, input abuse protection, and stronger application security controls.

## Honest scope statement

The completed capstone demonstrates a local Kubernetes deployment, Docker Hub publishing, Terraform local resource lifecycle, Ansible configuration on Ubuntu WSL, and a GitHub Actions build/test/publish pipeline. It does not claim that Azure infrastructure was provisioned, that Ansible configured a remote VM, or that the GitHub Actions workflow automatically deployed to Kubernetes.
