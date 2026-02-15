// https://repost.aws/knowledge-center/cloudfront-serve-static-website
// https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteEndpoints.html#WebsiteRestEndpointDiff

resource "aws_cloudfront_distribution" "frontend_distribution" {
  comment = "PnP application frontend"

  origin {
    domain_name              = aws_s3_bucket.frontend_bucket.bucket_domain_name
    origin_id                = "S3-${aws_s3_bucket.frontend_bucket.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend_oac.id
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    // Using the CachingDisabled managed policy ID.
    // If caching should be enabled, a response headers policy for CORS nis necessary.
    cache_policy_id        = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.frontend_bucket.id}"
    viewer_protocol_policy = "redirect-to-https"
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  aliases = [var.domain_name]

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.main_cert_validation.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

resource "aws_cloudfront_origin_access_control" "frontend_oac" {
  name                              = "pnp-application-frontend-oac"
  description                       = "Origin Access Control for accessing S3 bucket securely"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}
