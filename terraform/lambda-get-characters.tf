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
