locals {
  characters_table_name = "pnp-app-characters"
  history_table_name    = "pnp-app-characters-history"
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
    name = "groupId"
    type = "S"
  }

  attribute {
    name = "characterId"
    type = "S"
  }

  global_secondary_index {
    name            = "indexForCognitoGroup"
    hash_key        = "groupId"
    range_key       = "characterId"
    projection_type = "ALL"
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
