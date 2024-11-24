locals {
  frontend_path = "../fronend/build"
}

resource "aws_s3_object" "static_site_upload_objecte" {
  for_each     = fileset(locals.frontend_path, "**/*")
  bucket       = aws_s3_bucket.frontend_bucket.id
  key          = each.value
  source       = locals.frontend_path / each.value
  etag         = filemd5(locals.frontend_path / each.value)
  content_type = "text/html"
}