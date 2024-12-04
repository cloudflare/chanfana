export const buildRequest = ({ method = "GET", path = "/", ...other }) => ({
  method: method.toUpperCase(),
  path,
  url: `https://example.com${path}`,
  ...other,
});

export function findError(errors: any, field: any) {
  for (const error of errors) {
    if (error.path.includes(field)) {
      return error.message;
    }
  }
}
