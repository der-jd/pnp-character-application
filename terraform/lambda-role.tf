resource "aws_iam_role" "lambda_exec_role" {
  name = "lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Action = "sts:AssumeRole",
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_managed_policy" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

// TODO this general access needs to be replaced with a tenant specific access
resource "aws_iam_role_policy" "lambda_inline_policy" {
  role = aws_iam_role.lambda_exec_role.name
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect   = "Allow",
      Action   = "dynamodb:*",
      Resource = [aws_dynamodb_table.characters.arn, aws_dynamodb_table.characters_history.arn]
    }]
  })
}