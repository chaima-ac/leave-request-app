# =============================================
#  CloudWatch Log Group — stores Lambda logs
# =============================================

resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.leave_api_handler.function_name}"
  retention_in_days = 14

  tags = {
    Name    = "LeaveDesk-Lambda-Logs"
    Project = "GestionDeConges-Serverless"
  }
}

# =============================================
#  CloudWatch Alarm — Lambda Errors
#  fires when Lambda has any error
# =============================================

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "leavedesk-lambda-errors"
  alarm_description   = "Fires when Lambda function has errors"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"

  dimensions = {
    FunctionName = aws_lambda_function.leave_api_handler.function_name
  }

  # Send alert to SNS when alarm fires
  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name    = "LeaveDesk-Lambda-Errors"
    Project = "GestionDeConges-Serverless"
  }
}

# =============================================
#  CloudWatch Alarm — Lambda Duration
#  fires when Lambda is slow (> 10 seconds)
# =============================================

resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  alarm_name          = "leavedesk-lambda-duration"
  alarm_description   = "Fires when Lambda takes more than 10 seconds"
  namespace           = "AWS/Lambda"
  metric_name         = "Duration"
  statistic           = "Average"
  period              = 60
  evaluation_periods  = 1
  threshold           = 10000
  comparison_operator = "GreaterThanOrEqualToThreshold"

  dimensions = {
    FunctionName = aws_lambda_function.leave_api_handler.function_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = {
    Name    = "LeaveDesk-Lambda-Duration"
    Project = "GestionDeConges-Serverless"
  }
}

# =============================================
#  CloudWatch Alarm — DynamoDB Errors
#  fires when DynamoDB has system errors
# =============================================

resource "aws_cloudwatch_metric_alarm" "dynamodb_errors" {
  alarm_name          = "leavedesk-dynamodb-errors"
  alarm_description   = "Fires when DynamoDB has system errors"
  namespace           = "AWS/DynamoDB"
  metric_name         = "SystemErrors"
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"

  dimensions = {
    TableName = aws_dynamodb_table.leave_requests.name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = {
    Name    = "LeaveDesk-DynamoDB-Errors"
    Project = "GestionDeConges-Serverless"
  }
}

# =============================================
#  CloudWatch Dashboard — visual overview
# =============================================

resource "aws_cloudwatch_dashboard" "leavedesk" {
  dashboard_name = "LeaveDesk-Dashboard"

  dashboard_body = jsonencode({
    widgets = [
      # Lambda Invocations
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 8
        height = 6
        properties = {
          title  = "Lambda Invocations"
          view   = "timeSeries"
          region = var.region
          metrics = [
            ["AWS/Lambda", "Invocations",
              "FunctionName", aws_lambda_function.leave_api_handler.function_name]
          ]
        }
      },
      # Lambda Errors
      {
        type   = "metric"
        x      = 8
        y      = 0
        width  = 8
        height = 6
        properties = {
          title  = "Lambda Errors"
          view   = "timeSeries"
          region = var.region
          metrics = [
            ["AWS/Lambda", "Errors",
              "FunctionName", aws_lambda_function.leave_api_handler.function_name,
              { color = "#d62728" }]
          ]
        }
      },
      # Lambda Duration
      {
        type   = "metric"
        x      = 16
        y      = 0
        width  = 8
        height = 6
        properties = {
          title  = "Lambda Duration (ms)"
          view   = "timeSeries"
          region = var.region
          metrics = [
            ["AWS/Lambda", "Duration",
              "FunctionName", aws_lambda_function.leave_api_handler.function_name]
          ]
        }
      },
      # DynamoDB Read Capacity
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "DynamoDB Read/Write"
          view   = "timeSeries"
          region = var.region
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits",
              "TableName", aws_dynamodb_table.leave_requests.name],
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits",
              "TableName", aws_dynamodb_table.leave_requests.name]
          ]
        }
      },
      # API Gateway Requests
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "API Gateway Requests"
          view   = "timeSeries"
          region = var.region
          metrics = [
            ["AWS/ApiGateway", "Count",
              "ApiId", aws_apigatewayv2_api.leave_api.id]
          ]
        }
      }
    ]
  })
}
