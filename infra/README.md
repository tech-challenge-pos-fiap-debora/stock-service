# Infra do stock-service (AWS)

Este microsserviço **não** usa Kind. O deploy de produção é na AWS:

| Camada | Repositório | Papel |
|---|---|---|
| Banco | `infra-database` / runtime no EKS | RDS PostgreSQL — database `stock` |
| Cluster / ECR / ALB | `infra-kubernetes` | EKS + repositórios ECR do serviço |
| Workloads | `stock-service/k8s` | Deployment, Service ClusterIP, Ingress ALB, HPA |

## Fluxo de CD

1. Push na `main` deste repo → workflow **Publish ECR**.
2. O workflow dispara `deploy-prod.yml` em `infra-kubernetes` com `service=stock-service`.
3. O EKS aplica os manifests.

## Secrets GitHub

Neste repo: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, `INFRA_DISPATCH_TOKEN`.
