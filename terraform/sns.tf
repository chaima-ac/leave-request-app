# =============================================
#  SNS Topic — receives alerts from CloudWatch
# =============================================

resource "aws_sns_topic" "alerts" {
  name = "leavedesk-alerts"

  tags = {
    Name    = "LeaveDesk-Alerts"
    Project = "GestionDeConges-Serverless"
  }
}

# =============================================
#  SNS Subscription — sends email to admin
# =============================================

resource "aws_sns_topic_subscription" "admin_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}
