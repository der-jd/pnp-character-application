import { fakeCharacter } from "./character.js";

export const fakeHeaders = {
  /**
   * {
   *     "iss": "test",
   *     "iat": 1743920834,
   *     "exp": 1743924434,
   *     "aud": "www.test.com",
   *     "sub": "afab6615-c93b-4056-8741-e9484360eb0a"
   * }
   */
  authorization:
    "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJ0ZXN0IiwiaWF0IjoxNzQzOTIwODM0LCJleHAiOjE3NDM5MjQ0MzQsImF1ZCI6Ind3dy50ZXN0LmNvbSIsInN1YiI6ImFmYWI2NjE1LWM5M2ItNDA1Ni04NzQxLWU5NDg0MzYwZWIwYSJ9.Y_gSRu-5V1LptFUch6GaHZIatBaJuVUcjvf_tZtClH0",
};

export const fakeDynamoDBCharacterResponse = {
  Item: fakeCharacter,
};
