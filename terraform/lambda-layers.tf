data "archive_file" "configuration" {
  type        = "zip"
  source_dir  = "../backend/build/src/lambda-layers/configuration"
  output_path = "../backend/dist/configuration.zip"
}

resource "aws_lambda_layer_version" "configuration" {
  layer_name          = "configuration"
  filename            = "../backend/dist/configuration.zip"
  source_code_hash    = data.archive_file.configuration.output_base64sha256
  compatible_runtimes = ["nodejs20.x"]
}

data "archive_file" "utils" {
  type        = "zip"
  source_dir  = "../backend/build/src/lambda-layers/utils"
  output_path = "../backend/dist/utils.zip"
}

resource "aws_lambda_layer_version" "utils" {
  layer_name          = "utils"
  filename            = "../backend/dist/utils.zip"
  source_code_hash    = data.archive_file.utils.output_base64sha256
  compatible_runtimes = ["nodejs20.x"]
}
