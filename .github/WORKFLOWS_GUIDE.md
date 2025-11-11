# GitHub Actions Workflows Guide

Quick reference for the CI/CD workflows in this repository.

## 📋 Available Workflows

### 1. CI/CD Pipeline (`ci-cd.yml`)
**Purpose:** Main build, test, and deployment pipeline

**Triggers:**
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

**What it does:**
1. ✅ Lints code
2. ✅ Builds Docker images for all 5 services
3. ✅ Runs security scan (Trivy)
4. ✅ Runs integration tests
5. ✅ Deploys to staging (main branch only)
6. ✅ Deploys to production (manual approval required)

**Duration:** ~10-15 minutes

---

### 2. Automated Tests (`test.yml`)
**Purpose:** Comprehensive test suite

**Triggers:**
- Push to `main`, `develop`, or `feature/**`
- Pull requests
- Daily at 2 AM UTC (scheduled)

**What it does:**
1. ✅ Unit tests for all services
2. ✅ API tests (CRUD operations)
3. ✅ Integration tests (notification flow)
4. ✅ Idempotency tests
5. ✅ Rate limiting tests
6. ✅ Performance tests (main branch only)

**Duration:** ~8-12 minutes

---

### 3. Docker Publishing (`docker-publish.yml`)
**Purpose:** Build and publish Docker images

**Triggers:**
- Push to `main`
- Git tags (v*.*.*)
- Release published

**What it does:**
1. ✅ Builds multi-platform images (amd64, arm64)
2. ✅ Pushes to GitHub Container Registry
3. ✅ Tags with version, branch, SHA
4. ✅ Generates artifact attestation

**Duration:** ~5-8 minutes

---

## 🚀 Quick Start

### Running Workflows

Workflows run automatically on push/PR. To manually trigger:

1. Go to **Actions** tab
2. Select workflow
3. Click **Run workflow**
4. Choose branch
5. Click **Run workflow** button

### Viewing Results

1. Go to **Actions** tab
2. Click on workflow run
3. View job details and logs
4. Download artifacts (if any)

### Checking Status

Add badges to README.md:

```markdown
![CI/CD](https://github.com/<owner>/<repo>/actions/workflows/ci-cd.yml/badge.svg)
![Tests](https://github.com/<owner>/<repo>/actions/workflows/test.yml/badge.svg)
![Docker](https://github.com/<owner>/<repo>/actions/workflows/docker-publish.yml/badge.svg)
```

---

## 🔧 Configuration

### Required Secrets

Set these in **Settings → Secrets and variables → Actions**:

- `GITHUB_TOKEN` - Automatically provided
- `DOCKER_USERNAME` - (Optional) Docker Hub username
- `DOCKER_PASSWORD` - (Optional) Docker Hub password

### Environment Variables

Edit in workflow files:

```yaml
env:
  NODE_VERSION: '18'
  DOCKER_REGISTRY: docker.io
```

---

## 📊 Test Coverage

### Current Tests

**Health Checks:**
- ✅ API Gateway
- ✅ User Service
- ✅ Template Service

**User Service:**
- ✅ Create user
- ✅ Get user
- ✅ Update user
- ✅ List users
- ✅ Delete user

**Template Service:**
- ✅ Create template
- ✅ Get template (by ID and name)
- ✅ Update template (versioning)
- ✅ List templates
- ✅ Get version history
- ✅ Delete template

**Integration:**
- ✅ End-to-end notification flow
- ✅ Idempotency verification
- ✅ Rate limiting verification

---

## 🐛 Troubleshooting

### Build Failures

**Problem:** Docker build fails
```bash
# Check locally
docker build -t test ./api_gateway_service
```

**Problem:** Dependencies not installing
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Test Failures

**Problem:** Services not starting
```bash
# Check docker-compose locally
docker-compose up -d
docker-compose logs
```

**Problem:** Tests timing out
- Increase timeout in workflow
- Check service health endpoints
- Review service logs

### Deployment Failures

**Problem:** Staging deployment fails
- Check environment variables
- Verify secrets are set
- Review deployment logs

**Problem:** Production approval not working
- Ensure environment is configured in Settings
- Add required reviewers

---

## 📝 Best Practices

### Commits

Use conventional commits:
```
feat: add new feature
fix: fix bug
docs: update documentation
test: add tests
chore: update dependencies
```

### Pull Requests

- Create PR from feature branch
- Wait for all checks to pass
- Get at least 1 approval
- Squash and merge

### Releases

Create a release:
```bash
git tag v1.0.0
git push origin v1.0.0
```

This triggers:
- Docker image build
- Image tagged with version
- Release notes generation

---

## 🔄 Workflow Dependencies

```
ci-cd.yml:
  lint → build → integration-test → deploy-staging → deploy-production
           ↓
       security-scan

test.yml:
  unit-tests (parallel)
  api-tests
  performance-test (main only)

docker-publish.yml:
  build-and-push (parallel) → update-deployment
```

---

## 📈 Monitoring

### GitHub Actions Dashboard

View at: `https://github.com/<owner>/<repo>/actions`

**Metrics:**
- Workflow run duration
- Success/failure rate
- Test results
- Artifact downloads

### Notifications

Configure in **Settings → Notifications**:
- Email on failure
- Slack/Discord webhooks
- GitHub mobile app

---

## 🎯 Next Steps

1. **Add Unit Tests** - Implement actual unit tests
2. **Add E2E Tests** - Browser-based testing
3. **Add Load Tests** - k6 or Artillery
4. **Add Code Coverage** - Enforce minimum coverage
5. **Add Automated Changelog** - Generate from commits
6. **Add Deployment Notifications** - Slack/Discord
7. **Add Performance Benchmarks** - Track over time
8. **Add Database Migration Tests** - Test migrations in CI

---

## 📚 Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [Trivy Scanner](https://github.com/aquasecurity/trivy)

---

## 🆘 Getting Help

1. Check workflow logs in Actions tab
2. Review this guide
3. Check CI_CD_DOCUMENTATION.md
4. Ask team for help
5. Create issue with workflow run link

