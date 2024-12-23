export const createTenantId = (token: string | undefined) => {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL + "/tenant-id";
  console.log(url);

  if (!token) {
    throw new Error("Token undefined!");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  console.log(headers);

  fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify({}),
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Error: ${res.status} ${res.statusText}`);
      }
      return res.json();
    })
    .then((data) => {
      console.log("Response from API:", data);
    })
    .catch((err) => {
      console.error(err.message);
    });
};
