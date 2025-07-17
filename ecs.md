# ECS Deployment Plan

This document outlines the plan to deploy the frontend and backend containers to AWS ECS using the existing Terraform infrastructure.

## Analysis of Existing Infrastructure

The current `terraform-infra` setup successfully handles:
1.  **ECR Repositories**: Creates ECR repositories for `frontend` and `backend` services.
2.  **Docker Image Management**: Builds Docker images from `../frontend` and `../backend` and pushes them to the corresponding ECR repositories.
3.  **Secrets Management**: Creates secrets in AWS Secrets Manager based on the `secrets_map` local variable.

## Deployment Plan

To get the containers running on ECS, we will add the following components to the Terraform configuration:

### 1. Networking
- **VPC**: Create a new VPC or use an existing one to host the ECS resources.
- **Subnets**: Create public and private subnets across multiple Availability Zones for high availability.
- **Internet Gateway**: Provision an Internet Gateway to allow communication between the VPC and the internet.
- **NAT Gateway**: Provision a NAT Gateway in a public subnet to allow containers in private subnets to access the internet for things like pulling images or accessing external APIs (e.g., OpenAI).
- **Route Tables**: Configure route tables to manage traffic flow within the VPC.

### 2. ECS Cluster
- **ECS Cluster**: Create an ECS cluster to orchestrate the containers.

### 3. Load Balancing
- **Application Load Balancer (ALB)**: Set up an ALB to distribute incoming traffic to the frontend service.
- **Target Group**: Create a target group for the frontend service to register container instances.
- **Listener**: Configure a listener on the ALB to forward HTTP/HTTPS traffic to the target group.

### 4. ECS Task Definitions
- **Backend Task Definition**:
    - Define the container for the backend service, referencing the ECR image.
    - Specify CPU and memory resources.
    - Grant permissions to access the OpenAI API key from Secrets Manager.
- **Frontend Task Definition**:
    - Define the container for the frontend service, referencing the ECR image.
    - Specify CPU and memory resources.
    - Configure the environment to point to the backend service (either through the load balancer or service discovery).

### 5. ECS Services
- **Backend Service**:
    - Create an ECS service to run and maintain the desired number of backend tasks.
    - Configure it to run in the private subnets.
    - No public load balancer needed as it will only be accessed by the frontend.
- **Frontend Service**:
    - Create an ECS service for the frontend tasks.
    - Configure it to run in the public or private subnets, associated with the ALB's target group.
    - Set up auto-scaling policies if needed.

### 6. IAM Roles and Policies
- **ECS Task Execution Role**: Create an IAM role that allows ECS tasks to pull images from ECR and write logs to CloudWatch.
- **Backend Task Role**: Create a specific IAM role for the backend task. This role will be assigned the pre-existing IAM policy from the `secrets` module that grants read-only access to the secrets.

### Implementation Steps

1.  Create a new Terraform module `modules/networking` for the VPC, subnets, and gateways.
2.  Create a new Terraform module `modules/ecs` that will contain the ECS cluster, task definitions, services, and load balancer resources.
3.  Update `main.tf` to include the new `networking` and `ecs` modules.
4.  Pass the necessary outputs from the `networking` module (e.g., VPC ID, subnet IDs) to the `ecs` module.
5.  Pass the repository URLs from the `ecr_docker_images` module, and the secret ARNs and `read_secrets_policy_arn` from the `secrets` module, to the `ecs` module.