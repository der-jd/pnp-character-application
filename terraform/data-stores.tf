locals {
  characters_table_name = "pnp-app-characters"
}

resource "aws_dynamodb_table" "characters" {
  name         = local.characters_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "cognitoUserId"
  range_key    = "characterId"

  attribute {
    name = "cognitoUserId"
    type = "S"
  }

  attribute {
    name = "cognitoGroupId"
    type = "S"
  }

  attribute {
    name = "characterId"
    type = "S"
  }

  global_secondary_index {
    name            = "indexForCognitoGroup"
    hash_key        = "cognitoGroupId"
    range_key       = "characterId"
    projection_type = "ALL"
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
