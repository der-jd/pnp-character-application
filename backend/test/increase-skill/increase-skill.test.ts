import { expect, test } from "vitest";
import { increaseSkill } from "increase-skill/index.js";
//import { Request } from "config/index.js";

const cases = [
  {
    headers: {},
    pathParameters: null,
    body: null,
  },
  {
    headers: {
      authorization: "randomValue",
    },
    pathParameters: null,
    body: null,
  },
  {
    headers: {
      authorization: "Bearer 1234567890",
    },
    pathParameters: null,
    body: null,
  },
];
cases.forEach((request) => {
  test(`Invalid token when authorization header is missing/malformed. headers: ${JSON.stringify(request.headers)}`, async () => {
    const result = await increaseSkill(request);

    expect(result.statusCode).toBe(401);
  });
});

/*it("should throw when authorization header is malformed", async () => {
    const request: Request = {
      headers: {
        authorization: "",
      },
      pathParameters: null,
      body: null,
    };

    const result = await increaseSkill(request);

    expect(result.statusCode).toBe(401);
  });*/
