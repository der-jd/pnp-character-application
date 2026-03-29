# ================== Route 53 Hosted Zone ==================

# The hosted zone is managed in this shared root module so it persists independently
# of per-environment infrastructure. NS records are configured at the domain registrar,
# so deleting the zone would break DNS delegation for all environments.

resource "aws_route53_zone" "main" {
  name = var.hosted_zone_name

  lifecycle {
    prevent_destroy = true
  }
}

output "route53_nameservers" {
  description = "Nameservers to configure at another DNS provider for DNS delegation"
  value       = aws_route53_zone.main.name_servers

  sensitive = false
}

output "route53_zone_id" {
  description = "Hosted zone ID for DNS record management"
  value       = aws_route53_zone.main.zone_id

  sensitive = false
}
