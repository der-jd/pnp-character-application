resource "aws_iam_role" "step_function_role" {
  name = "pnp-app-step-function-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = {
        Service = "states.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "step_function_lambda_execution_policy" {
  role       = aws_iam_role.step_function_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "step_function_lambda_role_policy" {
  role       = aws_iam_role.step_function_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaRole"
}

/**
 * Logging to CloudWatch Logs for Step Functions Express workflows requires special permissions and
 * a resource based policy for the log group. See:
 * https://docs.aws.amazon.com/step-functions/latest/dg/cw-logs.html#cloudwatch-iam-policy
 * https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AWS-vended-logs-permissions.html#AWS-vended-logs-permissions
 */
resource "aws_iam_role_policy_attachment" "step_function_cloudwatch_policy" {
  role       = aws_iam_role.step_function_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
}

module "update_skill_state_machine" {
  source = "./modules/step_function_state_machine"

  state_machine_name = "update-skill"
  role_arn           = aws_iam_role.step_function_role.arn
  main_lambda_arn    = module.update_skill_lambda.lambda_function.arn
  history_lambda_arn = module.add_history_record_lambda.lambda_function.arn

  main_state_name = "UpdateSkill"

  main_operation_history_record_condition = "{% $parse($states.input.body).changes.old != $parse($states.input.body).changes.new %}"
  main_operation_history_record_request = {
    userId_expression           = "{% $parse($states.input.body).userId %}"
    type                        = "6" // SKILL_CHANGED
    name_expression             = "{% $parse($states.input.body).skillCategory & '/' & $parse($states.input.body).skillName %}"
    data_expression             = "{% $parse($states.input.body).changes %}"
    learning_method_expression  = "{% $parse($states.input.body).learningMethod ? $parse($states.input.body).learningMethod : null %}"
    adventure_points_expression = "{% $parse($states.input.body).adventurePoints %}"
  }
  version_update_history_record_condition = "{% $exists($parse($states.input.body).versionUpdate) %}"
}

module "update_attribute_state_machine" {
  source = "./modules/step_function_state_machine"

  state_machine_name = "update-attribute"
  role_arn           = aws_iam_role.step_function_role.arn
  main_lambda_arn    = module.update_attribute_lambda.lambda_function.arn
  history_lambda_arn = module.add_history_record_lambda.lambda_function.arn

  main_state_name = "UpdateAttribute"

  main_operation_history_record_condition = "{% $parse($states.input.body).changes.old != $parse($states.input.body).changes.new %}"
  main_operation_history_record_request = {
    userId_expression           = "{% $parse($states.input.body).userId %}"
    type                        = "5" // ATTRIBUTE_CHANGED
    name_expression             = "{% $parse($states.input.body).attributeName %}"
    data_expression             = "{% $parse($states.input.body).changes %}"
    attribute_points_expression = "{% $parse($states.input.body).attributePoints %}"
  }

  version_update_history_record_condition = "{% $exists($parse($states.input.body).versionUpdate) %}"
}

module "update_base_value_state_machine" {
  source = "./modules/step_function_state_machine"

  state_machine_name = "update-base-value"
  role_arn           = aws_iam_role.step_function_role.arn
  main_lambda_arn    = module.update_base_value_lambda.lambda_function.arn
  history_lambda_arn = module.add_history_record_lambda.lambda_function.arn

  main_state_name = "UpdateBaseValue"

  main_operation_history_record_condition = "{% $parse($states.input.body).changes.old != $parse($states.input.body).changes.new %}"
  main_operation_history_record_request = {
    userId_expression = "{% $parse($states.input.body).userId %}"
    type              = "3" // BASE_VALUE_CHANGED
    name_expression   = "{% $parse($states.input.body).baseValueName %}"
    data_expression   = "{% $parse($states.input.body).changes %}"
  }

  version_update_history_record_condition = "{% $exists($parse($states.input.body).versionUpdate) %}"
}

module "add_special_ability_state_machine" {
  source = "./modules/step_function_state_machine"

  state_machine_name = "add-special-ability"
  role_arn           = aws_iam_role.step_function_role.arn
  main_lambda_arn    = module.add_special_ability_lambda.lambda_function.arn
  history_lambda_arn = module.add_history_record_lambda.lambda_function.arn

  main_state_name = "AddSpecialAbility"

  main_operation_history_record_condition = "{% $parse($states.input.body).specialAbilities.old != $parse($states.input.body).specialAbilities.new %}"
  main_operation_history_record_request = {
    userId_expression = "{% $parse($states.input.body).userId %}"
    type              = "4" // SPECIAL_ABILITIES_CHANGED
    name_expression   = "{% $parse($states.input.body).specialAbilityName %}"
    data_expression   = "{% $parse($states.input.body).specialAbilities %}"
  }

  version_update_history_record_condition = "{% $exists($parse($states.input.body).versionUpdate) %}"
}

module "update_calculation_points_state_machine" {
  source = "./modules/step_function_state_machine"

  state_machine_name = "update-calculation-points"
  role_arn           = aws_iam_role.step_function_role.arn
  main_lambda_arn    = module.update_calculation_points_lambda.lambda_function.arn
  history_lambda_arn = module.add_history_record_lambda.lambda_function.arn

  main_state_name = "UpdateCalculationPoints"

  main_operation_history_record_condition = "{% $parse($states.input.body).calculationPoints.old != $parse($states.input.body).calculationPoints.new %}"
  main_operation_history_record_request = {
    userId_expression           = "{% $parse($states.input.body).userId %}"
    type                        = "2" // CALCULATION_POINTS_CHANGED
    name_expression             = "Calculation Points"
    data_expression             = "{% $parse($states.input.body).calculationPoints %}"
    adventure_points_expression = "{% $parse($states.input.body).calculationPoints.old.adventurePoints ? {'old': $parse($states.input.body).calculationPoints.old.adventurePoints,'new': $parse($states.input.body).calculationPoints.new.adventurePoints} : null %}"
    attribute_points_expression = "{% $parse($states.input.body).calculationPoints.old.attributePoints ? {'old': $parse($states.input.body).calculationPoints.old.attributePoints,'new': $parse($states.input.body).calculationPoints.new.attributePoints} : null %}"
  }

  version_update_history_record_condition = "{% $exists($parse($states.input.body).versionUpdate) %}"
}

module "update_combat_stats_state_machine" {
  source = "./modules/step_function_state_machine"

  state_machine_name = "update-combat-stats"
  role_arn           = aws_iam_role.step_function_role.arn
  main_lambda_arn    = module.update_combat_stats_lambda.lambda_function.arn
  history_lambda_arn = module.add_history_record_lambda.lambda_function.arn

  main_state_name = "UpdateCombatStats"

  main_operation_history_record_condition = "{% $parse($states.input.body).combatStats.old != $parse($states.input.body).combatStats.new %}"
  main_operation_history_record_request = {
    userId_expression = "{% $parse($states.input.body).userId %}"
    type              = "7" // COMBAT_STATS_CHANGED
    name_expression   = "{% $parse($states.input.body).combatCategory & '/' & $parse($states.input.body).combatSkillName %}"
    data_expression   = "{% $parse($states.input.body).combatStats %}"
  }

  version_update_history_record_condition = "{% $exists($parse($states.input.body).versionUpdate) %}"
}

module "apply_level_up_state_machine" {
  source = "./modules/step_function_state_machine"

  state_machine_name = "apply-level-up"
  role_arn           = aws_iam_role.step_function_role.arn
  main_lambda_arn    = module.apply_level_up_lambda.lambda_function.arn
  history_lambda_arn = module.add_history_record_lambda.lambda_function.arn

  main_state_name = "ApplyLevelUp"

  main_operation_history_record_condition = "{% $parse($states.input.body).changes.old != $parse($states.input.body).changes.new %}"
  main_operation_history_record_request = {
    userId_expression = "{% $parse($states.input.body).userId %}"
    type              = "1" // LEVEL_UP_APPLIED
    name_expression   = "{% 'Level ' & $string($parse($states.input.body).changes.new.level) %}"
    data_expression   = "{% $parse($states.input.body).changes %}"
  }

  version_update_history_record_condition = "{% $exists($parse($states.input.body).versionUpdate) %}"
}

module "create_character_state_machine" {
  source = "./modules/step_function_state_machine"

  state_machine_name = "create-character"
  role_arn           = aws_iam_role.step_function_role.arn
  main_lambda_arn    = module.create_character_lambda.lambda_function.arn
  history_lambda_arn = module.add_history_record_lambda.lambda_function.arn

  main_state_name = "CreateCharacter"

  main_operation_history_record_condition = "{% true %}"
  main_operation_history_record_request = {
    userId_expression = "{% $parse($states.input.body).userId %}"
    type              = "0" // CHARACTER_CREATED
    name_expression   = "{% $parse($states.input.body).characterName %}"
    data_expression   = "{% $parse($states.input.body).changes %}"
  }

  version_update_history_record_condition    = "{% false %}"
  include_version_history_record_in_response = false
}
