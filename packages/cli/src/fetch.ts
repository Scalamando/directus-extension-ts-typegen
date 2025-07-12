export async function fetchDirectus<TData>(url: string, token: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: "Bearer " + token,
    },
  });
  const body = await (response.json() as Promise<{ data: TData[] } | { errors: string[] }>);

  if ("errors" in body) {
    throw new Error(
      `One or more errors occured when fetching '${url}': \n${body.errors.join("\n")}`
    );
  }

  return body.data;
}
