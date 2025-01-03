export const createTenantId = async (token: string | undefined, refresh_token: string | undefined) => {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL + "/tenant-id";
  console.log(url);

  if (!token || !refresh_token) {
    throw new Error("Token or refresh token is undefined!");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    RefreshToken: refresh_token,
  };

  console.log(headers);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Response from API:", data);

    return data;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    } else {
      console.error("Unknown error:", error);
    }

    throw error;
  }
};
