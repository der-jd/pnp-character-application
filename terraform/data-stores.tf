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
    name = "characterId"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# TODO obsolete and can be removed?!
resource "aws_dynamodb_global_secondary_index" "indexForCognitoGroup" {
  table_name = aws_dynamodb_table.characters.name
  index_name = "indexForCognitoGroup"

  key_schema {
    attribute_name = "groupId"
    attribute_type = "S"
    key_type       = "HASH"
  }

  key_schema {
    attribute_name = "characterId"
    attribute_type = "S"
    key_type       = "RANGE"
  }

  projection {
    projection_type = "ALL"
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
