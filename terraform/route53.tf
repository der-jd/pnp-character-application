# ================== Route 53 DNS Management ==================

# Main hosted zone for the domain
resource "aws_route53_zone" "main" {
  name = var.domain_name

  # Enable deletion protection to prevent the removal of the hosted zone and the corresponding nameservers.
  # This would break the DNS delegation from the external DNS provider where the domain is registered.
  lifecycle {
    prevent_destroy = true
  }
}

# Output the nameservers for delegation to another DNS provider
output "route53_nameservers" {
  description = "Nameservers to configure at another DNS provider for DNS delegation"
  value       = aws_route53_zone.main.name_servers

  sensitive = false
}

# Output the hosted zone ID for reference
output "route53_zone_id" {
  description = "Hosted zone ID for DNS record management"
  value       = aws_route53_zone.main.zone_id

  sensitive = false
}

# ================== DNS Records ==================

# Frontend record (pointing to CloudFront distribution)
resource "aws_route53_record" "frontend" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.frontend_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

# API subdomain record (pointing to API Gateway custom domain)
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.api_domain_name
  type    = "A"

  alias {
    name                   = aws_api_gateway_domain_name.api_domain.regional_domain_name
    zone_id                = aws_api_gateway_domain_name.api_domain.regional_zone_id
    evaluate_target_health = false
  }
}

# WWW record (optional - pointing to main domain)
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [var.domain_name]
}

# DNS validation record for main domain ACM certificate
resource "aws_route53_record" "main_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main_cert_us_east_1.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

# DNS validation record for api domain ACM certificate
resource "aws_route53_record" "api_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

# ================== Certificates ==================

# ACM Certificate for main domain (required in us-east-1 for CloudFront)
resource "aws_acm_certificate" "main_cert_us_east_1" {
  provider                   = aws.us_east_1
  domain_name                = var.domain_name
  subject_alternative_names = ["www.${var.domain_name}"]
  validation_method          = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Wait for main domain certificate validation (us-east-1)
resource "aws_acm_certificate_validation" "main_cert_validation_us_east_1" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.main_cert_us_east_1.arn
  validation_record_fqdns = [for record in aws_route53_record.main_cert_validation : record.fqdn]
}

# ACM Certificate for API domain
resource "aws_acm_certificate" "api_cert" {
  domain_name       = var.api_domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Wait for API domain certificate validation
resource "aws_acm_certificate_validation" "api_cert_validation" {
  certificate_arn         = aws_acm_certificate.api_cert.arn
  validation_record_fqdns = [for record in aws_route53_record.api_cert_validation : record.fqdn]
}
