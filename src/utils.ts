export function jsonResp(data: any, params?: object): Response {
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json;charset=UTF-8",
    },
    // @ts-ignore
    status: params?.status ? params.status : 200,
    ...params,
  });
}
