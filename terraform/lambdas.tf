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

module "add_history_record_lambda" {
  source        = "./modules/lambda_function"
  function_name = "add-history-record"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
    TABLE_NAME_HISTORY    = local.history_table_name
  }
  layers          = [aws_lambda_layer_version.config.arn, aws_lambda_layer_version.utils.arn]
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "get_character_lambda" {
  source        = "./modules/lambda_function"
  function_name = "get-character"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
  }
  layers          = [aws_lambda_layer_version.config.arn, aws_lambda_layer_version.utils.arn]
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "get_characters_lambda" {
  source        = "./modules/lambda_function"
  function_name = "get-characters"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
  }
  layers          = [aws_lambda_layer_version.config.arn, aws_lambda_layer_version.utils.arn]
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "get_history_lambda" {
  source        = "./modules/lambda_function"
  function_name = "get-history"
  environment_vars = {
    TABLE_NAME_HISTORY = local.history_table_name
  }
  layers          = [aws_lambda_layer_version.config.arn, aws_lambda_layer_version.utils.arn]
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "get_skill_increase_cost_lambda" {
  source        = "./modules/lambda_function"
  function_name = "get-skill-increase-cost"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
  }
  layers          = [aws_lambda_layer_version.config.arn, aws_lambda_layer_version.utils.arn]
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "increase_attribute_lambda" {
  source        = "./modules/lambda_function"
  function_name = "increase-attribute"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
  }
  layers          = [aws_lambda_layer_version.config.arn, aws_lambda_layer_version.utils.arn]
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "increase_skill_lambda" {
  source        = "./modules/lambda_function"
  function_name = "increase-skill"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
  }
  layers          = [aws_lambda_layer_version.config.arn, aws_lambda_layer_version.utils.arn]
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "revert_history_record_lambda" {
  source        = "./modules/lambda_function"
  function_name = "revert-history-record"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
    TABLE_NAME_HISTORY    = local.history_table_name
  }
  layers          = [aws_lambda_layer_version.config.arn, aws_lambda_layer_version.utils.arn]
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "set_history_comment_lambda" {
  source        = "./modules/lambda_function"
  function_name = "set-history-comment"
  environment_vars = {
    TABLE_NAME_HISTORY = local.history_table_name
  }
  layers          = [aws_lambda_layer_version.config.arn, aws_lambda_layer_version.utils.arn]
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}
