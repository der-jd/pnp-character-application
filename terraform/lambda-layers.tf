data "archive_file" "config" {
  type        = "zip"
  source_dir  = "../backend/build/src/lambda-layers/config"
  output_path = "../backend/dist/config.zip"
}

resource "aws_lambda_layer_version" "config" {
  layer_name          = "config"
  filename            = "../backend/dist/config.zip"
  source_code_hash    = data.archive_file.config.output_base64sha256
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
