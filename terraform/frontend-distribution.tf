# https://repost.aws/knowledge-center/cloudfront-serve-static-website
# https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteEndpoints.html#WebsiteRestEndpointDiff

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
    # Using the CachingDisabled managed policy ID.
    # If caching should be enabled, a response headers policy for CORS is necessary.
    cache_policy_id        = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.frontend_bucket.id}"
    viewer_protocol_policy = "redirect-to-https"
  }

  /**
   * Custom error responses for Single Page Application (SPA) routing
   *
   * In a React SPA, client-side routing (React Router) handles URL navigation.
   * When users refresh or directly access routes like /dashboard or /character/123,
   * CloudFront would normally return 404 errors since these paths don't exist as files.
   *
   * These custom error responses intercept 403 and 404 errors and instead serve
   * index.html with a 200 status code, allowing React Router to take over and
   * render the correct component based on the URL path.
   *
   * 403: Handles cases where S3 denies access (e.g., missing public read permissions)
   * 404: Handles cases where the requested path doesn't exist as a file in S3
   *
   * This pattern is standard for SPAs hosted on S3 + CloudFront and enables
   * seamless client-side navigation while maintaining proper SEO-friendly URLs.
   */
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  aliases = local.is_prod ? [var.domain_name, "www.${var.domain_name}"] : [var.domain_name]

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.main_cert_validation_us_east_1.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}


resource "aws_cloudfront_origin_access_control" "frontend_oac" {
  name                              = "${local.prefix}-frontend-oac-${local.suffix}"
  description                       = "Origin Access Control for accessing S3 bucket securely"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}
