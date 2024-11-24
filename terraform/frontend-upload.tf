locals {
  frontend_path = "../frontend/build"
}

resource "aws_s3_object" "static_site_upload_objecte" {
  for_each     = fileset(local.frontend_path, "**/*")
  bucket       = aws_s3_bucket.frontend_bucket.id
  key          = each.value
  source       = "${local.frontend_path} / ${each.value}"
  etag         = filemd5("${local.frontend_path}/${each.value}")
  content_type = "text/html"
}