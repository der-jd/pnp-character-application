// import { CognitoIdentityProvider } from "@aws-sdk/client-cognito-identity-provider";
// import * as jwt from "jsonwebtoken";

import { APIGatewayProxyEvent } from "aws-lambda";

// const cognito = new CognitoIdentityProvider();

export const handler = async (event: APIGatewayProxyEvent) => {
  const userPoolId = process.env.USER_POOL_ID;
  const clientId = process.env.CLIENT_ID;
  if (!userPoolId || !clientId) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "User pool ID or client ID is not set in environment variables.",
      }),
    };
  }

  if(!event.headers.Authorization) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "No Authorization header received!",
      }),
    };
  }

  console.log("TESTTTTTTTTTTTTTTTTTTTTTTTT");
  console.log(event);
  console.log("TESTTTTTTTTTTTTTTTTTTTTTTTT");

  const token = event.headers.Authorization.split(" ")[1];

  console.log(token);

  // let sub;
  // try {
  //   const decoded = jwt.decode(token);

  //   if (!decoded) {
  //     throw new Error("No token received!");
  //   }

  //   if (!decoded.sub) {
  //     throw new Error("Token does not contain sub");
  //   }
  //   sub = decoded.sub;
  // } catch (error) {
  //   console.error("Error decoding token:", error);
  //   return {
  //     statusCode: 401,
  //     body: JSON.stringify({
  //       message: "Invalid token",
  //     }),
  //   };
  // }

  // try {
  //   await cognito.createGroup({
  //     GroupName: sub,
  //     UserPoolId: userPoolId,
  //     Description: `Group for user ${sub}`,
  //   });
  //   await cognito.adminAddUserToGroup({
  //     GroupName: sub,
  //     UserPoolId: userPoolId,
  //     Username: sub,
  //   });
  // } catch (error) {
  //   if (error instanceof Error) {
  //     console.error("Error:", error.message);
  //     return {
  //       statusCode: 500,
  //       body: JSON.stringify({
  //         message: "Error processing request",
  //         error: error.message,
  //       }),
  //     };
  //   } else {
  //     // Handle non-Error types of errors
  //     console.error("Unknown error:", error);
  //     return {
  //       statusCode: 500,
  //       body: JSON.stringify({
  //         message: "An unknown error occurred",
  //         error: "Unknown error",
  //       }),
  //     };
  //   }
  // }
};
