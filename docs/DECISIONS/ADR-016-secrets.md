# ADR-016 Secrets: managed secrets manager with OIDC to CI (Infisical or Doppler)

**Decision.** No secrets in files or images; CI and deploy jobs fetch via OIDC; per-environment scopes; rotation playbook in OPERATIONS.md. Choice between Infisical and Doppler is made when the first shared environment is provisioned (both satisfy the requirements; pricing to confirm).
