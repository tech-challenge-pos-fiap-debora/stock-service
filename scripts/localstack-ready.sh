#!/usr/bin/env bash
# Roda dentro do LocalStack (ready.d): SNS + fila do domínio + policies + FilterPolicy.
# OFICINA_QUEUE_NAME=billing-events|order-events|stock-events
set -euo pipefail

export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1

QUEUE_NAME="${OFICINA_QUEUE_NAME:?OFICINA_QUEUE_NAME obrigatório}"

awsl() { awslocal "$@"; }

TOPIC_ARN="$(awsl sns create-topic --name oficina-domain-events --query TopicArn --output text)"
QUEUE_URL="$(awsl sqs create-queue --queue-name "$QUEUE_NAME" --query QueueUrl --output text)"
QUEUE_ARN="$(awsl sqs get-queue-attributes \
  --queue-url "$QUEUE_URL" \
  --attribute-names QueueArn \
  --query Attributes.QueueArn \
  --output text)"

echo "SNS: $TOPIC_ARN"
echo "SQS: $QUEUE_NAME -> $QUEUE_URL"

TMP="$(mktemp -d)"
python3 - "$TOPIC_ARN" "$QUEUE_ARN" "$QUEUE_NAME" "$TMP" <<'PY'
import json, pathlib, sys

topic, qarn, queue_name, tmp = sys.argv[1:5]
tmp = pathlib.Path(tmp)

# Eventos que cada domínio consome (MessageAttributes.type no publish).
FILTERS = {
    "billing-events": [
        "order.budget.requested",
        "order.budget.approved",
        "order.budget.rejected",
        "order.cancelled",
        "stock.reserved",
        "stock.reservation.failed",
    ],
    "order-events": [
        "billing.budget.generated",
        "billing.budget.failed",
        "billing.payment.created",
        "billing.payment.confirmed",
        "billing.payment.failed",
        "stock.reservation.failed",
    ],
    "stock-events": [
        "billing.budget.generated",
        "order.budget.approved",
        "order.budget.rejected",
        "order.cancelled",
        "billing.payment.confirmed",
        "billing.payment.failed",
    ],
}
if queue_name not in FILTERS:
    raise SystemExit(f"fila desconhecida: {queue_name}")

types = FILTERS[queue_name]

# SNS: quem publica + quem assina (filas).
topic_policy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowPublishers",
            "Effect": "Allow",
            "Principal": {"AWS": "*"},
            "Action": "sns:Publish",
            "Resource": topic,
        },
        {
            "Sid": "AllowQueueSubscriptions",
            "Effect": "Allow",
            "Principal": {"AWS": "*"},
            "Action": [
                "sns:Subscribe",
                "sns:Receive",
                "sns:ListSubscriptionsByTopic",
            ],
            "Resource": topic,
        },
    ],
}
(tmp / "topic-policy.json").write_text(json.dumps(topic_policy))

# SQS: SNS entrega + consumidor (Receive/Delete/…).
queue_policy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowSnsDelivery",
            "Effect": "Allow",
            "Principal": {"AWS": "*"},
            "Action": "sqs:SendMessage",
            "Resource": qarn,
            "Condition": {"ArnEquals": {"aws:SourceArn": topic}},
        },
        {
            "Sid": "AllowConsumers",
            "Effect": "Allow",
            "Principal": {"AWS": "*"},
            "Action": [
                "sqs:ReceiveMessage",
                "sqs:DeleteMessage",
                "sqs:GetQueueAttributes",
                "sqs:ChangeMessageVisibility",
                "sqs:GetQueueUrl",
            ],
            "Resource": qarn,
        },
    ],
}
(tmp / "queue-attrs.json").write_text(
    json.dumps({"Policy": json.dumps(queue_policy)})
)

filter_policy = {"type": types}
(tmp / "subscribe.json").write_text(
    json.dumps(
        {
            "TopicArn": topic,
            "Protocol": "sqs",
            "Endpoint": qarn,
            "Attributes": {
                "RawMessageDelivery": "false",
                "FilterPolicyScope": "MessageAttributes",
                "FilterPolicy": json.dumps(filter_policy),
            },
        }
    )
)
print("filters:", ",".join(types))
PY

awsl sns set-topic-attributes \
  --topic-arn "$TOPIC_ARN" \
  --attribute-name Policy \
  --attribute-value "file://$TMP/topic-policy.json"

awsl sqs set-queue-attributes \
  --queue-url "$QUEUE_URL" \
  --attributes "file://$TMP/queue-attrs.json"

awsl sns subscribe --cli-input-json "file://$TMP/subscribe.json" >/dev/null

echo "LocalStack domínio pronto (fila=$QUEUE_NAME) com policies + FilterPolicy"
rm -rf "$TMP"
