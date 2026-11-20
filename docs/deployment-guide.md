# TaskFlow Deployment and Operations Guide

## Prerequisites

- Windows 10 with Docker Desktop and WSL Ubuntu.
- Docker CLI, Git, Node.js/npm, Terraform, Ansible in WSL, Minikube, and kubectl.
- MongoDB Atlas cluster and valid application connection string.
- Docker Hub account and GitHub repository secrets for publishing.

## 1. Local application

From the repository root:

```bash
npm ci
cp .env.example .env
# Edit .env locally; do not commit it.
npm test
npm start
```

Browse to `http://localhost:3000`.

## 2. Docker image

```bash
docker build -t taskflow:local .
docker run --rm -p 3000:3000 --env-file .env taskflow:local
```

The published image repository is `paulolutunmbi/taskflow`.

## 3. Terraform local workflow

```powershell
terraform -chdir=terraform fmt -check
terraform -chdir=terraform init -backend=false
terraform -chdir=terraform validate
terraform -chdir=terraform plan
```

Review the plan before running `terraform -chdir=terraform apply`. The current demonstration uses `terraform_data`; it does not create Azure resources.

## 4. Ansible local configuration

Run inside Ubuntu WSL from the repository root:

```bash
ansible-playbook -i ansible/inventory.ini ansible/playbook.yml --syntax-check
sudo ansible-playbook -i ansible/inventory.ini ansible/playbook.yml
```

The inventory targets localhost, so this configures the WSL environment only.

## 5. Kubernetes on Minikube

Start or resume the local cluster:

```bash
minikube start
kubectl get nodes
```

Ensure the `taskflow-env` Secret exists in the `taskflow` namespace and contains the runtime environment values required by the application. Create it locally using your own values; do not commit or share the Secret manifest or its values.

Apply manifests:

```bash
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/service.yaml
kubectl apply -f kubernetes/hpa.yaml
kubectl rollout status deployment/taskflow -n taskflow --timeout=120s
```

Or run the Bash script in WSL:

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

The script calls `kubectl.exe` and converts Linux paths to Windows-compatible paths using `wslpath -m`.

Inspect:

```bash
kubectl get pods -n taskflow
kubectl get deployment -n taskflow
kubectl get services -n taskflow
kubectl get hpa -n taskflow
kubectl describe hpa taskflow-hpa -n taskflow
kubectl logs deployment/taskflow -n taskflow
```

Get a service URL:

```bash
minikube service taskflow-service -n taskflow --url
```

Keep the tunnel terminal open if the command starts a tunnel.

## 6. CI/CD

Push a commit to `main` and inspect the repository's Actions tab. A successful run should show tests passing and the Docker image build/push step completing. Required repository secrets:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN` (Read and Write permission is sufficient for pushing)

Pull requests run tests and build without publishing. Kubernetes deployment remains a separate manual/scripted step.

## 7. Stop and resume

Stop Minikube when finished:

```bash
minikube stop
```

Resume later:

```bash
minikube start
kubectl get nodes
kubectl get pods -n taskflow
```

Do not delete the cluster unless you intentionally want to remove its local Kubernetes state.
