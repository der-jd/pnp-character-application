locals {
  characters_table_name = "${local.prefix}-characters-${local.suffix}"
  history_table_name    = "${local.prefix}-characters-history-${local.suffix}"
}

resource "aws_dynamodb_table" "characters" {
  name                        = local.characters_table_name
  billing_mode                = "PAY_PER_REQUEST"
  deletion_protection_enabled = true
  hash_key                    = "userId"
  range_key                   = "characterId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "characterId"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_dynamodb_table" "characters_history" {
  name                        = local.history_table_name
  billing_mode                = "PAY_PER_REQUEST"
  deletion_protection_enabled = true
  hash_key                    = "characterId"
  range_key                   = "blockNumber"

  attribute {
    name = "characterId"
    type = "S"
  }

  attribute {
    name = "blockNumber"
    type = "N"
  }

  lifecycle {
    prevent_destroy = true
  }
}
