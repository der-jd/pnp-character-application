# ================== Route 53 DNS Management ==================

# Main hosted zone for the domain
resource "aws_route53_zone" "main" {
  name = var.domain_name
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

# API subdomain record (will be added later when API Gateway custom domain is created)
# This is commented out for now - will be added when we create the API Gateway custom domain
# resource "aws_route53_record" "api" {
#   zone_id = aws_route53_zone.main.zone_id
#   name    = "api.${var.domain_name}"
#   type    = "A"
#
#   alias {
#     name                   = aws_api_gateway_domain_name.api_domain.regional_domain_name
#     zone_id                = aws_api_gateway_domain_name.api_domain.regional_zone_id
#     evaluate_target_health = false
#   }
# }

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

# WWW record (optional - pointing to main domain)
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [var.domain_name]
}
