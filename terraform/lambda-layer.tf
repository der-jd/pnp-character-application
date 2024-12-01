data "archive_file" "configuration" {
  type        = "zip"
  source_dir  = "../backend/build/lambda-layers/configuration"
  output_path = "../backend/dist/configuration.zip"
}

resource "aws_lambda_layer_version" "configuration" {
  layer_name          = "configuration"
  filename            = "../backend/dist/configuration.zip"
  source_code_hash    = data.archive_file.configuration.output_base64sha256
  compatible_runtimes = ["nodejs20.x"]
}
