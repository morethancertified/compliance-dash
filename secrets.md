# Secrets Management Plan for Compliance Dash

This plan describes how we will meet the three required tasks:

1. **Securely store secrets in AWS Secrets Manager**
2. **Do not persist secrets to Terraform state** (use *write-only* arguments)
3. **Do not store secrets in plain text anywhere** (leverage environment variables)

The implementation lives in the existing `terraform-infra` codebase as a reusable module called `modules/secrets` which is invoked from the root configuration. Only the **backend** ECS task needs runtime access to these secrets.

---
## 1  Environment Variables ➜ Terraform Variables
Each secret value is injected with an environment variable that Terraform automatically maps to a variable because of the `TF_VAR_` prefix. Example for your shell:
```bash
export TF_VAR_openai_api_key="<OPENAI_KEY>"
```
Nothing is committed to VCS; all sensitive values stay in your local environment or in a CI secret store.

Variables are defined **sensitive** so they never appear in CLI output:
```hcl
variable "openai_api_key" {
  type        = string
  sensitive   = true
  description = "OpenAI API key used by the backend service"
}


```

A convenience local consolidates all secrets into a map that will be passed to the module:
```hcl
locals {
  secrets = {
    openai_api_key = var.openai_api_key
  }
}
```

---
## 2  Module `modules/secrets`
Create a new directory `terraform-infra/modules/secrets` with the following minimal code (omitting standard `variables.tf`, `outputs.tf` scaffolding for brevity).

```hcl
variable "secrets_map" {
  type        = map(string)
  description = "Map of secret_name => secret_value"
}

# 2.1 Secret metadata
resource "aws_secretsmanager_secret" "this" {
  for_each    = var.secrets_map
  name        = each.key
  description = "Managed by Terraform for the Compliance-Dash backend"
  recovery_window_in_days = 0   # Skip recovery when we destroy the stack
  tags = {
    App = "compliance-dash"
  }
}

# 2.2 Secret value (Write-Only)
# Documentation: providerDocID 9417431 – aws_secretsmanager_secret_version
resource "aws_secretsmanager_secret_version" "this" {
  for_each         = var.secrets_map
  secret_id        = aws_secretsmanager_secret.this[each.key].id
  secret_string_wo = each.value        # <- WRITE-ONLY! Not stored in state.
  version_stages   = ["AWSCURRENT"]
}

# 2.3 IAM policy that grants read-only access to these secrets
#   Attach this to the **backend** task execution role.
data "aws_iam_policy_document" "read" {
  statement {
    actions   = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
      # AWS Config read permissions for backend API
      "config:DescribeConfigRules",
      "config:GetComplianceDetailsByConfigRule"
    ]
    resources = [for s in aws_secretsmanager_secret.this : s.arn]
  }
}

resource "aws_iam_policy" "read_secrets" {
  name   = "compliance-dash-backend-read-secrets"
  policy = data.aws_iam_policy_document.read.json
}

output "secret_arns" {
  description = "ARNs for all created Secrets Manager secrets"
  value       = [for s in aws_secretsmanager_secret.this : s.arn]
}
```

**Key points:**
- `for_each` is used everywhere for clear addressing & drift-resistance.
- The *write-only* attribute `secret_string_wo` prevents the secret value from ever being saved to Terraform state or plan files, fulfilling tasks #2 & #3.

---
## 3  Root Module Usage
```hcl
module "secrets" {
  source      = "./modules/secrets"
  secrets_map = local.secrets
}

# Attach secrets read policy to the backend task role
resource "aws_iam_role_policy_attachment" "backend_read_secrets" {
  role       = aws_iam_role.backend_task_execution.name
  policy_arn = module.secrets.read_secrets_policy_arn
}
```

Combine this with your existing ECS / Fargate configuration where the backend container defines:
```hcl
env {
  name = "OPENAI_API_KEY"
  value_from = module.secrets.secret_arns["openai_api_key"]
}
```

AWS will resolve the ARN to the secret value at runtime, keeping the plaintext out of the task definition and Terraform files.

---
## 4  Validation Checklist
- [x] Secrets stored in **AWS Secrets Manager** (`aws_secretsmanager_secret` & version).
- [x] Secret values written via **write-only** attribute `secret_string_wo`; never land in state.
- [x] No plaintext committed – values come from **environment variables**.
- [x] IAM policy grants **backend** task read-only access.
- [x] `for_each` used instead of `count`.
- [x] Tags applied for traceability.

> After merging, run `terraform init && terraform apply` from `terraform-infra` with the necessary `TF_VAR_*` environment variables exported.
