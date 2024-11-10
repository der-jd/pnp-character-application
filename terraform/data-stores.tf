resource "aws_dynamodb_table" "characters" {
  name         = "pnp-app-characters"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "characterId"

  attribute {
    name = "characterId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "characters_history" {
  name         = "pnp-app-characters-history"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "historyId"

  attribute {
    name = "historyId"
    type = "S"
  }

  attribute {
    name = "characterId"
    type = "S"
  }

  global_secondary_index {
    name            = "characterId"
    hash_key        = "characterId"
    projection_type = "ALL"
  }
}
