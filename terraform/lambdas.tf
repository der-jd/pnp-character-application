resource "aws_iam_role" "lambda_exec_role" {
  name = "${local.prefix}-lambda-execution-role-${local.suffix}"

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
  source_name   = "add-history-record"
  function_name = "${local.prefix}-add-history-record-${local.suffix}"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
    TABLE_NAME_HISTORY    = local.history_table_name
  }
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "add_special_ability_lambda" {
  source        = "./modules/lambda_function"
  source_name   = "add-special-ability"
  function_name = "${local.prefix}-add-special-ability-${local.suffix}"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
  }
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "clone_character_lambda" {
  source        = "./modules/lambda_function"
  source_name   = "clone-character"
  function_name = "${local.prefix}-clone-character-${local.suffix}"
  timeout       = 10
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
    TABLE_NAME_HISTORY    = local.history_table_name
  }
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "create_character_lambda" {
  source        = "./modules/lambda_function"
  source_name   = "create-character"
  function_name = "${local.prefix}-create-character-${local.suffix}"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
  }
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "delete_character_lambda" {
  source        = "./modules/lambda_function"
  source_name   = "delete-character"
  function_name = "${local.prefix}-delete-character-${local.suffix}"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
    TABLE_NAME_HISTORY    = local.history_table_name
  }
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "update_combat_stats_lambda" {
  source        = "./modules/lambda_function"
  source_name   = "update-combat-stats"
  function_name = "${local.prefix}-update-combat-stats-${local.suffix}"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
  }
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "get_character_lambda" {
  source        = "./modules/lambda_function"
  source_name   = "get-character"
  function_name = "${local.prefix}-get-character-${local.suffix}"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
  }
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "get_characters_lambda" {
  source        = "./modules/lambda_function"
  source_name   = "get-characters"
  function_name = "${local.prefix}-get-characters-${local.suffix}"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
  }
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "get_history_lambda" {
  source        = "./modules/lambda_function"
  source_name   = "get-history"
  function_name = "${local.prefix}-get-history-${local.suffix}"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
    TABLE_NAME_HISTORY    = local.history_table_name
  }
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "get_level_up_lambda" {
  source        = "./modules/lambda_function"
  source_name   = "get-level-up"
  function_name = "${local.prefix}-get-level-up-${local.suffix}"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
  }
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "get_skill_increase_cost_lambda" {
  source        = "./modules/lambda_function"
  source_name   = "get-skill-increase-cost"
  function_name = "${local.prefix}-get-skill-increase-cost-${local.suffix}"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
  }
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "update_attribute_lambda" {
  source        = "./modules/lambda_function"
  source_name   = "update-attribute"
  function_name = "${local.prefix}-update-attribute-${local.suffix}"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
  }
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "update_general_information_lambda" {
  source        = "./modules/lambda_function"
  source_name   = "update-general-information"
  function_name = "${local.prefix}-update-general-information-${local.suffix}"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
  }
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "update_base_value_lambda" {
  source        = "./modules/lambda_function"
  source_name   = "update-base-value"
  function_name = "${local.prefix}-update-base-value-${local.suffix}"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
  }
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "update_calculation_points_lambda" {
  source        = "./modules/lambda_function"
  source_name   = "update-calculation-points"
  function_name = "${local.prefix}-update-calculation-points-${local.suffix}"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
  }
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "apply_level_up_lambda" {
  source        = "./modules/lambda_function"
  source_name   = "apply-level-up"
  function_name = "${local.prefix}-apply-level-up-${local.suffix}"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
  }
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "update_skill_lambda" {
  source        = "./modules/lambda_function"
  source_name   = "update-skill"
  function_name = "${local.prefix}-update-skill-${local.suffix}"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
  }
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "revert_history_record_lambda" {
  source        = "./modules/lambda_function"
  source_name   = "revert-history-record"
  function_name = "${local.prefix}-revert-history-record-${local.suffix}"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
    TABLE_NAME_HISTORY    = local.history_table_name
  }
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

module "set_history_comment_lambda" {
  source        = "./modules/lambda_function"
  source_name   = "set-history-comment"
  function_name = "${local.prefix}-set-history-comment-${local.suffix}"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
    TABLE_NAME_HISTORY    = local.history_table_name
  }
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}
