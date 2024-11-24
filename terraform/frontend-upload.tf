locals {
  frontend_path = "../frontend/"
}

resource "aws_s3_object" "static_site_upload_object" {
  for_each = fileset(local.frontend_path, "build/*"
  bucket   = aws_s3_bucket.frontend_bucket.id
  key      = each.value
  source   = "${local.frontend_path}/build/${each.value}"
  etag     = filemd5("${local.frontend_path}/build/${each.value}")
}