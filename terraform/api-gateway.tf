resource "aws_iam_role" "api_gateway_role" {
  name = "pnp-app-api-gateway-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = {
        Service = "apigateway.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "api_gateway_policy" {
  name = "AllowStartSyncExecution"
  role = aws_iam_role.api_gateway_role.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = "states:StartSyncExecution",
        Resource = [
          aws_sfn_state_machine.update_skill_state_machine.arn,
          aws_sfn_state_machine.update_attribute_state_machine.arn
        ]
      }
    ]
  })
}


resource "aws_api_gateway_rest_api" "pnp_rest_api" {
  name        = "pnp-app-api"
  description = "REST API for the PnP character application"
  endpoint_configuration {
    // Distribute the regional API only via our own CloudFront distribution.
    // See https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-endpoint-types.html#api-gateway-api-endpoint-types-regional
    types = ["REGIONAL"]
  }
}

// ================== /characters ==================

resource "aws_api_gateway_resource" "characters" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_rest_api.pnp_rest_api.root_resource_id
  path_part   = "characters" // .../characters
}

// ================== POST /characters ==================

module "characters_post" {
  source            = "./modules/apigw_stepfunction_integration"
  rest_api_id       = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id       = aws_api_gateway_resource.characters.id
  http_method       = "POST"
  authorizer_id     = aws_api_gateway_authorizer.cognito_authorizer.id
  aws_region        = data.aws_region.current.name
  credentials       = aws_iam_role.api_gateway_role.arn
  state_machine_arn = aws_sfn_state_machine.create_character_state_machine.arn
}

// ================== GET /characters ==================

module "characters_get" {
  source        = "./modules/apigw_lambda_integration"
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.characters.id
  http_method   = "GET"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
  method_request_parameters = {
    "method.request.querystring.character-short" = true
  }
  lambda_uri = module.get_characters_lambda.lambda_function.invoke_arn
}

// ================== OPTIONS /characters ==================

module "characters_options" {
  source      = "./modules/apigw_options_method"
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.characters.id
}

// ================== /characters/{character-id} ==================

resource "aws_api_gateway_resource" "character_id" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.characters.id
  path_part   = "{character-id}" // .../characters/{character-id}
}

// ================== GET /characters/{character-id} ==================

module "character_id_get" {
  source        = "./modules/apigw_lambda_integration"
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.character_id.id
  http_method   = "GET"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
  method_request_parameters = {
    "method.request.path.character-id" = true
  }
  lambda_uri = module.get_character_lambda.lambda_function.invoke_arn
}

// ================== DELETE /characters/{character-id} ==================

module "character_id_delete" {
  source        = "./modules/apigw_lambda_integration"
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.character_id.id
  http_method   = "DELETE"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
  method_request_parameters = {
    "method.request.path.character-id" = true
  }
  lambda_uri = module.delete_character_lambda.lambda_function.invoke_arn
}

// ================== OPTIONS /characters/{character-id} ==================

module "character_id_options" {
  source      = "./modules/apigw_options_method"
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.character_id.id
}

// ================== /characters/{character-id}/clone ==================

resource "aws_api_gateway_resource" "character_id_clone" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.character_id.id
  path_part   = "clone" // .../characters/{character-id}/clone
}

// ================== POST /characters/{character-id}/clone ==================

module "character_id_clone_post" {
  source        = "./modules/apigw_lambda_integration"
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.character_id_clone.id
  http_method   = "POST"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
  method_request_parameters = {
    "method.request.path.character-id" = true
  }
  lambda_uri = module.clone_character_lambda.lambda_function.invoke_arn
}

// ================== OPTIONS /characters/{character-id}/clone ==================

module "character_id_clone_options" {
  source      = "./modules/apigw_options_method"
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.character_id_clone.id
}

// ================== /characters/{character-id}/attributes ==================

resource "aws_api_gateway_resource" "attributes" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.character_id.id
  path_part   = "attributes" // .../characters/{character-id}/attributes
}

// ================== /characters/{character-id}/attributes/{attribute-name} ==================

resource "aws_api_gateway_resource" "attribute_name" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.attributes.id
  path_part   = "{attribute-name}" // .../characters/{character-id}/attributes/{attribute-name}
}

// ================== PATCH /characters/{character-id}/attributes/{attribute-name} ==================

module "attribute_name_patch" {
  source        = "./modules/apigw_stepfunction_integration"
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.attribute_name.id
  http_method   = "PATCH"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
  method_request_parameters = {
    "method.request.path.character-id"   = true
    "method.request.path.attribute-name" = true
  }
  aws_region        = data.aws_region.current.name
  credentials       = aws_iam_role.api_gateway_role.arn
  state_machine_arn = aws_sfn_state_machine.update_attribute_state_machine.arn
}

// ================== OPTIONS /characters/{character-id}/attributes/{attribute-name} ==================

module "attribute_name_options" {
  source      = "./modules/apigw_options_method"
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.attribute_name.id
}

// ================== /characters/{character-id}/base-values ==================

resource "aws_api_gateway_resource" "base_values" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.character_id.id
  path_part   = "base-values" // .../characters/{character-id}/base-values
}

// ================== /characters/{character-id}/base-values/{base-value-name} ==================

resource "aws_api_gateway_resource" "base_value_name" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.base_values.id
  path_part   = "{base-value-name}" // .../characters/{character-id}/base-values/{base-value-name}
}

// ================== PATCH /characters/{character-id}/base-values/{base-value-name} ==================

module "base_value_name_patch" {
  source        = "./modules/apigw_stepfunction_integration"
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.base_value_name.id
  http_method   = "PATCH"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
  method_request_parameters = {
    "method.request.path.character-id"    = true
    "method.request.path.base-value-name" = true
  }
  aws_region        = data.aws_region.current.name
  credentials       = aws_iam_role.api_gateway_role.arn
  state_machine_arn = aws_sfn_state_machine.update_base_value_state_machine.arn
}

// ================== OPTIONS /characters/{character-id}/base-values/{base-value-name} ==================

module "base_value_name_options" {
  source      = "./modules/apigw_options_method"
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.base_value_name.id
}

// ================== /characters/{character-id}/calculation-points ==================

resource "aws_api_gateway_resource" "calculation_points" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.character_id.id
  path_part   = "calculation-points" // .../characters/{character-id}/calculation-points
}

// ================== PATCH /characters/{character-id}/calculation-points ==================

module "calculation_points_patch" {
  source        = "./modules/apigw_stepfunction_integration"
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.calculation_points.id
  http_method   = "PATCH"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
  method_request_parameters = {
    "method.request.path.character-id" = true
  }
  aws_region        = data.aws_region.current.name
  credentials       = aws_iam_role.api_gateway_role.arn
  state_machine_arn = aws_sfn_state_machine.update_calculation_points_state_machine.arn
}

// ================== OPTIONS /characters/{character-id}/calculation-points ==================

module "calculation_points_options" {
  source      = "./modules/apigw_options_method"
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.calculation_points.id
}

// ================== /characters/{character-id}/level-up ==================

resource "aws_api_gateway_resource" "level_up" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.character_id.id
  path_part   = "level-up" // .../characters/{character-id}/level-up
}

// ================== GET /characters/{character-id}/level-up ==================

module "level_up_get" {
  source        = "./modules/apigw_lambda_integration"
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.level_up.id
  http_method   = "GET"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
  method_request_parameters = {
    "method.request.path.character-id" = true
  }
  lambda_uri = module.get_level_up_lambda.lambda_function.invoke_arn
}

// ================== POST /characters/{character-id}/level-up ==================

module "level_up_post" {
  source        = "./modules/apigw_stepfunction_integration"
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.level_up.id
  http_method   = "POST"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
  method_request_parameters = {
    "method.request.path.character-id" = true
  }
  aws_region        = data.aws_region.current.name
  credentials       = aws_iam_role.api_gateway_role.arn
  state_machine_arn = aws_sfn_state_machine.apply_level_up_state_machine.arn
}

// ================== OPTIONS /characters/{character-id}/level-up ==================

module "level_up_options" {
  source      = "./modules/apigw_options_method"
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.level_up.id
}

// ================== /characters/{character-id}/skills ==================

resource "aws_api_gateway_resource" "skills" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.character_id.id
  path_part   = "skills" // .../characters/{character-id}/skills
}

// ================== /characters/{character-id}/skills/{skill-category} ==================

resource "aws_api_gateway_resource" "skill_category" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.skills.id
  path_part   = "{skill-category}" // .../characters/{character-id}/skills/{skill-category}
}

// ================== /characters/{character-id}/skills/{skill-category}/{skill-name} ==================

resource "aws_api_gateway_resource" "skill_name" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.skill_category.id
  path_part   = "{skill-name}" // .../characters/{character-id}/skills/{skill-category}/{skill-name}
}

// ================== GET /characters/{character-id}/skills/{skill-category}/{skill-name} ==================

module "skill_name_get" {
  source        = "./modules/apigw_lambda_integration"
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.skill_name.id
  http_method   = "GET"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
  method_request_parameters = {
    "method.request.path.character-id"           = true
    "method.request.path.skill-category"         = true
    "method.request.path.skill-name"             = true
    "method.request.querystring.learning-method" = true
  }
  lambda_uri = module.get_skill_increase_cost_lambda.lambda_function.invoke_arn
}

// ================== PATCH /characters/{character-id}/skills/{skill-category}/{skill-name} ==================

module "skill_name_patch" {
  source        = "./modules/apigw_stepfunction_integration"
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.skill_name.id
  http_method   = "PATCH"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
  method_request_parameters = {
    "method.request.path.character-id"   = true
    "method.request.path.skill-category" = true
    "method.request.path.skill-name"     = true
  }
  aws_region        = data.aws_region.current.name
  credentials       = aws_iam_role.api_gateway_role.arn
  state_machine_arn = aws_sfn_state_machine.update_skill_state_machine.arn
}

// ================== OPTIONS /characters/{character-id}/skills/{skill-category}/{skill-name} ==================

module "skill_name_options" {
  source      = "./modules/apigw_options_method"
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.skill_name.id
}

// ================== /characters/{character-id}/special-abilities ==================

resource "aws_api_gateway_resource" "special_abilities" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.character_id.id
  path_part   = "special-abilities" // .../characters/{character-id}/special-abilities
}

// ================== POST /characters/{character-id}/special-abilities ==================

module "special_abilities_post" {
  source        = "./modules/apigw_stepfunction_integration"
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.special_abilities.id
  http_method   = "POST"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
  method_request_parameters = {
    "method.request.path.character-id" = true
  }
  aws_region        = data.aws_region.current.name
  credentials       = aws_iam_role.api_gateway_role.arn
  state_machine_arn = aws_sfn_state_machine.add_special_ability_state_machine.arn
}

// ================== OPTIONS /characters/{character-id}/special-abilities ==================

module "special_abilities_options" {
  source      = "./modules/apigw_options_method"
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.special_abilities.id
}

// ================== /characters/{character-id}/combat ==================

resource "aws_api_gateway_resource" "combat" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.character_id.id
  path_part   = "combat" // .../characters/{character-id}/combat
}

// ================== /characters/{character-id}/combat/{combat-category} ==================

resource "aws_api_gateway_resource" "combat_category" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.combat.id
  path_part   = "{combat-category}" // .../characters/{character-id}/combat/{combat-category}
}

// ================== /characters/{character-id}/combat/{combat-category}/{combat-skill-name} ==================

resource "aws_api_gateway_resource" "combat_skill_name" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.combat_category.id
  path_part   = "{combat-skill-name}" // .../characters/{character-id}/combat/{combat-category}/{combat-skill-name}
}

// ================== PATCH /characters/{character-id}/combat/{combat-category}/{combat-skill-name} ==================

module "combat_skill_name_patch" {
  source        = "./modules/apigw_stepfunction_integration"
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.combat_skill_name.id
  http_method   = "PATCH"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
  method_request_parameters = {
    "method.request.path.character-id"      = true
    "method.request.path.combat-category"   = true
    "method.request.path.combat-skill-name" = true
  }
  aws_region        = data.aws_region.current.name
  credentials       = aws_iam_role.api_gateway_role.arn
  state_machine_arn = aws_sfn_state_machine.update_combat_stats_state_machine.arn
}


// ================== OPTIONS /characters/{character-id}/combat/{combat-category}/{combat-skill-name} ==================

module "combat_skill_name_options" {
  source      = "./modules/apigw_options_method"
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.combat_skill_name.id
}

// ================== /characters/{character-id}/history ==================

resource "aws_api_gateway_resource" "history" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.character_id.id
  path_part   = "history" // .../history
}

// ================== GET /characters/{character-id}/history ==================

module "history_get" {
  source        = "./modules/apigw_lambda_integration"
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.history.id
  http_method   = "GET"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
  method_request_parameters = {
    "method.request.path.character-id"        = true
    "method.request.querystring.block-number" = true
  }
  lambda_uri = module.get_history_lambda.lambda_function.invoke_arn
}

// ================== OPTIONS /characters/{character-id}/history ==================

module "history_options" {
  source      = "./modules/apigw_options_method"
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.history.id
}

// ================== /characters/{character-id}/history/{record-id} ==================

resource "aws_api_gateway_resource" "record_id" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.history.id
  path_part   = "{record-id}" // .../history/{record-id}
}

// ================== PATCH /characters/{character-id}/history/{record-id} ==================

module "record_id_patch" {
  source        = "./modules/apigw_lambda_integration"
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.record_id.id
  http_method   = "PATCH"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
  method_request_parameters = {
    "method.request.path.character-id"        = true
    "method.request.path.record-id"           = true
    "method.request.querystring.block-number" = true
  }
  lambda_uri = module.set_history_comment_lambda.lambda_function.invoke_arn
}

// ================== DELETE /characters/{character-id}/history/{record-id} ==================

module "record_id_delete" {
  source        = "./modules/apigw_lambda_integration"
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.record_id.id
  http_method   = "DELETE"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
  method_request_parameters = {
    "method.request.path.character-id" = true
    "method.request.path.record-id"    = true
  }
  lambda_uri = module.revert_history_record_lambda.lambda_function.invoke_arn
}

// ================== OPTIONS /characters/{character-id}/history/{record-id} ==================

module "record_id_options" {
  source      = "./modules/apigw_options_method"
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.record_id.id
}

// ================================================================================

resource "aws_api_gateway_deployment" "api_deployment" {
  depends_on = [
    module.characters_post,
    module.attribute_name_patch,
    module.attribute_name_options,
    module.base_value_name_patch,
    module.base_value_name_options,
    module.calculation_points_patch,
    module.calculation_points_options,
    module.characters_get,
    module.characters_options,
    module.character_id_get,
    module.character_id_delete,
    module.character_id_options,
    module.character_id_clone_post,
    module.character_id_clone_options,
    module.level_up_get,
    module.level_up_post,
    module.level_up_options,
    module.special_abilities_post,
    module.special_abilities_options,
    module.skill_name_get,
    module.skill_name_patch,
    module.skill_name_options,
    module.history_get,
    module.history_options,
    module.record_id_patch,
    module.record_id_delete,
    module.record_id_options,
    module.combat_skill_name_patch,
    module.combat_skill_name_options,
  ]

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  triggers = {
    redeployment = md5(file("api-gateway.tf")) // TODO changes in the tf modules are not detected and the required redeployment is not triggered
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "prod" {
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  deployment_id = aws_api_gateway_deployment.api_deployment.id
  stage_name    = "prod"
}

output "api_gateway_url" {
  value     = "https://${aws_api_gateway_rest_api.pnp_rest_api.id}.execute-api.${data.aws_region.current.name}.amazonaws.com/${aws_api_gateway_stage.prod.stage_name}"
  sensitive = true
}
