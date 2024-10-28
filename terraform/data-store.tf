resource "aws_dynamodb_table" "characters" {
  name           = "pnp-app-characters"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key = "character-id"

  attribute {
    name = "character-id"
    type = "S"
  }
}

resource "aws_dynamodb_table" "characters_history" {
  name           = "pnp-app-characters-history"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key  = "history-id"

  attribute {
    name = "history-id"
    type = "S"
  }

  attribute {
    name = "character-id"
    type = "S"
  }

  global_secondary_index {
    name = "character-id"
    hash_key = "character-id"
    projection_type = "ALL"
  }
}
