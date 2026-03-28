resource "aws_iam_role" "step_function_role" {
  name = "${local.prefix}-step-function-role-${local.suffix}"

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

  state_machine_name = "${local.prefix}-update-skill-${local.suffix}"
  role_arn           = aws_iam_role.step_function_role.arn
  main_lambda_arn    = module.update_skill_lambda.lambda_function.arn
  history_lambda_arn = module.add_history_record_lambda.lambda_function.arn

  main_state_name = "UpdateSkill"

  main_operation_history_record_condition = "{% $parse($mainOperationResult).changes.old != $parse($mainOperationResult).changes.new %}"
  main_operation_history_record_request = {
    userId_expression           = "{% $parse($mainOperationResult).userId %}"
    type                        = "6" # SKILL_CHANGED
    name_expression             = "{% $parse($mainOperationResult).skillCategory & '/' & $parse($mainOperationResult).skillName %}"
    data_expression             = "{% $parse($mainOperationResult).changes %}"
    learning_method_expression  = "{% $parse($mainOperationResult).learningMethod ? $parse($mainOperationResult).learningMethod : null %}"
    adventure_points_expression = "{% $parse($mainOperationResult).adventurePoints %}"
  }
  version_update_history_record_condition = "{% $exists($parse($mainOperationResult).versionUpdate) %}"
}

module "update_attribute_state_machine" {
  source = "./modules/step_function_state_machine"

  state_machine_name = "${local.prefix}-update-attribute-${local.suffix}"
  role_arn           = aws_iam_role.step_function_role.arn
  main_lambda_arn    = module.update_attribute_lambda.lambda_function.arn
  history_lambda_arn = module.add_history_record_lambda.lambda_function.arn

  main_state_name = "UpdateAttribute"

  main_operation_history_record_condition = "{% $parse($mainOperationResult).changes.old != $parse($mainOperationResult).changes.new %}"
  main_operation_history_record_request = {
    userId_expression           = "{% $parse($mainOperationResult).userId %}"
    type                        = "5" # ATTRIBUTE_CHANGED
    name_expression             = "{% $parse($mainOperationResult).attributeName %}"
    data_expression             = "{% $parse($mainOperationResult).changes %}"
    attribute_points_expression = "{% $parse($mainOperationResult).attributePoints %}"
  }

  version_update_history_record_condition = "{% $exists($parse($mainOperationResult).versionUpdate) %}"
}

module "update_general_information_state_machine" {
  source = "./modules/step_function_state_machine"

  state_machine_name = "${local.prefix}-update-general-information-${local.suffix}"
  role_arn           = aws_iam_role.step_function_role.arn
  main_lambda_arn    = module.update_general_information_lambda.lambda_function.arn
  history_lambda_arn = module.add_history_record_lambda.lambda_function.arn

  main_state_name = "UpdateGeneralInformation"

  main_operation_history_record_condition = "{% $parse($mainOperationResult).changes.old != $parse($mainOperationResult).changes.new %}"
  main_operation_history_record_request = {
    userId_expression = "{% $parse($mainOperationResult).userId %}"
    type              = "9" # GENERAL_INFORMATION_CHANGED
    name_expression   = "General Information"
    data_expression   = "{% $parse($mainOperationResult).changes %}"
  }

  version_update_history_record_condition = "{% $exists($parse($mainOperationResult).versionUpdate) %}"
}

module "update_base_value_state_machine" {
  source = "./modules/step_function_state_machine"

  state_machine_name = "${local.prefix}-update-base-value-${local.suffix}"
  role_arn           = aws_iam_role.step_function_role.arn
  main_lambda_arn    = module.update_base_value_lambda.lambda_function.arn
  history_lambda_arn = module.add_history_record_lambda.lambda_function.arn

  main_state_name = "UpdateBaseValue"

  main_operation_history_record_condition = "{% $parse($mainOperationResult).changes.old != $parse($mainOperationResult).changes.new %}"
  main_operation_history_record_request = {
    userId_expression = "{% $parse($mainOperationResult).userId %}"
    type              = "3" # BASE_VALUE_CHANGED
    name_expression   = "{% $parse($mainOperationResult).baseValueName %}"
    data_expression   = "{% $parse($mainOperationResult).changes %}"
  }

  version_update_history_record_condition = "{% $exists($parse($mainOperationResult).versionUpdate) %}"
}

module "add_special_ability_state_machine" {
  source = "./modules/step_function_state_machine"

  state_machine_name = "${local.prefix}-add-special-ability-${local.suffix}"
  role_arn           = aws_iam_role.step_function_role.arn
  main_lambda_arn    = module.add_special_ability_lambda.lambda_function.arn
  history_lambda_arn = module.add_history_record_lambda.lambda_function.arn

  main_state_name = "AddSpecialAbility"

  main_operation_history_record_condition = "{% $parse($mainOperationResult).specialAbilities.old != $parse($mainOperationResult).specialAbilities.new %}"
  main_operation_history_record_request = {
    userId_expression = "{% $parse($mainOperationResult).userId %}"
    type              = "4" # SPECIAL_ABILITIES_CHANGED
    name_expression   = "{% $parse($mainOperationResult).specialAbilityName %}"
    data_expression   = "{% $parse($mainOperationResult).specialAbilities %}"
  }

  version_update_history_record_condition = "{% $exists($parse($mainOperationResult).versionUpdate) %}"
}

module "update_calculation_points_state_machine" {
  source = "./modules/step_function_state_machine"

  state_machine_name = "${local.prefix}-update-calculation-points-${local.suffix}"
  role_arn           = aws_iam_role.step_function_role.arn
  main_lambda_arn    = module.update_calculation_points_lambda.lambda_function.arn
  history_lambda_arn = module.add_history_record_lambda.lambda_function.arn

  main_state_name = "UpdateCalculationPoints"

  main_operation_history_record_condition = "{% $parse($mainOperationResult).calculationPoints.old != $parse($mainOperationResult).calculationPoints.new %}"
  main_operation_history_record_request = {
    userId_expression           = "{% $parse($mainOperationResult).userId %}"
    type                        = "2" # CALCULATION_POINTS_CHANGED
    name_expression             = "Calculation Points"
    data_expression             = "{% $parse($mainOperationResult).calculationPoints %}"
    adventure_points_expression = "{% $parse($mainOperationResult).calculationPoints.old.adventurePoints ? {'old': $parse($mainOperationResult).calculationPoints.old.adventurePoints,'new': $parse($mainOperationResult).calculationPoints.new.adventurePoints} : null %}"
    attribute_points_expression = "{% $parse($mainOperationResult).calculationPoints.old.attributePoints ? {'old': $parse($mainOperationResult).calculationPoints.old.attributePoints,'new': $parse($mainOperationResult).calculationPoints.new.attributePoints} : null %}"
  }

  version_update_history_record_condition = "{% $exists($parse($mainOperationResult).versionUpdate) %}"
}

module "update_combat_stats_state_machine" {
  source = "./modules/step_function_state_machine"

  state_machine_name = "${local.prefix}-update-combat-stats-${local.suffix}"
  role_arn           = aws_iam_role.step_function_role.arn
  main_lambda_arn    = module.update_combat_stats_lambda.lambda_function.arn
  history_lambda_arn = module.add_history_record_lambda.lambda_function.arn

  main_state_name = "UpdateCombatStats"

  main_operation_history_record_condition = "{% $parse($mainOperationResult).combatStats.old != $parse($mainOperationResult).combatStats.new %}"
  main_operation_history_record_request = {
    userId_expression = "{% $parse($mainOperationResult).userId %}"
    type              = "7" # COMBAT_STATS_CHANGED
    name_expression   = "{% $parse($mainOperationResult).combatCategory & '/' & $parse($mainOperationResult).combatSkillName %}"
    data_expression   = "{% $parse($mainOperationResult).combatStats %}"
  }

  version_update_history_record_condition = "{% $exists($parse($mainOperationResult).versionUpdate) %}"
}

module "apply_level_up_state_machine" {
  source = "./modules/step_function_state_machine"

  state_machine_name = "${local.prefix}-apply-level-up-${local.suffix}"
  role_arn           = aws_iam_role.step_function_role.arn
  main_lambda_arn    = module.apply_level_up_lambda.lambda_function.arn
  history_lambda_arn = module.add_history_record_lambda.lambda_function.arn

  main_state_name = "ApplyLevelUp"

  main_operation_history_record_condition = "{% $parse($mainOperationResult).changes.old != $parse($mainOperationResult).changes.new %}"
  main_operation_history_record_request = {
    userId_expression = "{% $parse($mainOperationResult).userId %}"
    type              = "1" # LEVEL_UP_APPLIED
    name_expression   = "{% 'Level ' & $string($parse($mainOperationResult).changes.new.level) %}"
    data_expression   = "{% $parse($mainOperationResult).changes %}"
  }

  version_update_history_record_condition = "{% $exists($parse($mainOperationResult).versionUpdate) %}"
}

module "create_character_state_machine" {
  source = "./modules/step_function_state_machine"

  state_machine_name = "${local.prefix}-create-character-${local.suffix}"
  role_arn           = aws_iam_role.step_function_role.arn
  main_lambda_arn    = module.create_character_lambda.lambda_function.arn
  history_lambda_arn = module.add_history_record_lambda.lambda_function.arn

  main_state_name = "CreateCharacter"

  main_operation_history_record_condition = "{% true %}"
  main_operation_history_record_request = {
    userId_expression = "{% $parse($mainOperationResult).userId %}"
    type              = "0" # CHARACTER_CREATED
    name_expression   = "{% $parse($mainOperationResult).characterName %}"
    data_expression   = "{% $parse($mainOperationResult).changes %}"
  }

  version_update_history_record_condition    = "{% false %}"
  include_version_history_record_in_response = false
}
