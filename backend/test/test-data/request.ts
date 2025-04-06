// user id is used in the fake character
export const fakeUserId = "afab6615-c93b-4056-8741-e9484360eb0a";
export const fakeHeaders = {
  /**
   * Header
   * {
   *   "typ": "JWT",
   *   "alg": "RS256",
   *   "kid": "d517b1aa2632baaab4e7a463c4c872cf"
   * }
   *
   * Payload
   * {
   *   "iss": "test",
   *   "iat": 1743945203,
   *   "exp": 1775484803,
   *   "aud": "www.test.com",
   *   "sub": "afab6615-c93b-4056-8741-e9484360eb0a"
   * }
   */
  authorization:
    "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6ImQ1MTdiMWFhMjYzMmJhYWFiNGU3YTQ2M2M0Yzg3MmNmIn0." +
    "eyJpc3MiOiJ0ZXN0IiwiaWF0IjoxNzQzOTQ1MjAzLCJleHAiOjE3NzU0ODQ4MDMsImF1ZCI6Ind3dy50ZXN0LmNvbSIsInN1YiI6ImFmYWI2NjE1LWM5M2ItNDA1Ni04NzQxLWU5NDg0MzYwZWIwYSJ9." +
    "EyHe383h3bgjSmXwVDDuexp5O9ozvMexkBBMyH3ohOSiEMT_nsIfRXbzJcfuQy8alIaF5wHmStgEuT8dW7gM2g6YkXx-XwrtcjKZTdBNrJNV23Cs9fGfhuCjcHJhK-TYUKUlmwuYTLM31kTKkoePDq7x" +
    "4MpY46-bvOpfu2Tzvs4Exg6QAyQGKJVOsXtzsoMc52WIDPbnpmWhu_WNbFvTWFQy-QniLarfe21bOCCJMgy-L4N4fTC2LMB-JbEFqNfQiSw8IatDNXkJw3EyVDmM9XkZw8hzIDe8EKooFdnS4lE62Wos4KIyIgBgIdhkFCggyQRFdT1OYl73K-SFeYuOmKnpbBmrKt6ekgXSmq3hc1l0SEIfuV2H14oH3OsAPkCe5X96-zYStyOMN52ZPHYcyMK5wrZCCc2mMQsUayTRKUtXSKpOrLk_gTFCzkLtKmANSnUMg-VTwm_X6V2N_6ozbJF9i2RaVJeQzS6QlL8Z0bbZAi8zu8bSNKii87vMekAY",
};

// user id is not used in the fake character -> invalid
export const dummyHeaders = {
  /**
   * Header
   * {
   *   "typ": "JWT",
   *   "alg": "RS256",
   *   "kid": "d517b1aa2632baaab4e7a463c4c872cf"
   * }
   *
   * Payload
   * {
   *   "iss": "test",
   *   "iat": 1743940581,
   *   "exp": 1775480181,
   *   "aud": "www.test.com",
   *   "sub": "fbcc6196-6959-4a76-b647-efae2b78fdfa"
   * }
   */
  authorization:
    "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6ImQ1MTdiMWFhMjYzMmJhYWFiNGU3YTQ2M2M0Yzg3MmNmIn0." +
    "eyJpc3MiOiJ0ZXN0IiwiaWF0IjoxNzQzOTQwNTgxLCJleHAiOjE3NzU0ODAxODEsImF1ZCI6Ind3dy50ZXN0LmNvbSIsInN1YiI6ImZiY2M2MTk2LTY5NTktNGE3Ni1iNjQ3LWVmYWUyYjc4ZmRmYSJ9." +
    "rdMLo75dttDhieMjnNt2k7_T2SW2LvDYTJe_jqafxkFfGKM74nwoEAg9Fr-r7TOgZ2kmPI3H5HGsK5eMedAiM1TzsbTYMq0EOgaFiit__hu7NS-AE6--TIRdFYw2b5oARbCmgJHD7uGR8n_terkUvo2Wk" +
    "t8TxIxR20W9bpUStpMk3aIRpkhtlGv0A0QuB76XM2l7kdKeXVJhzIVnHSB0HnRgp4eRc9l6x4xDLkvyycGbiuJ6LAEnkM_sT4iDobielbTcFCBUQFuZjRMbNYu18Ii6BOL-AdOmHFX8QweGSfbsGdhUpOQgHFfyq7n1ckaDA4hc1drbA7xG-i1DQUkbOxoR3MATb6LQF0NlaBoMatu9yux8eukSzgCM5mZYI-z-HaE5RICPs3p-hdJcgpbWo1zuKVe9GEzv80JqGFbCWVxWnNwKHytpqs82QjDLHqjZCi8sBFsmjJP6o9jtdAEN_HO6bfi_Eshfx4Hzn6uUuaPGevL1GJdjFb4F8W_ucKvc",
};
