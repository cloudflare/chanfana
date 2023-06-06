export const buildRequest = ({ method = 'GET', path = '/', ...other }) => ({
  method: method.toUpperCase(),
  path,
  url: `https://example.com${path}`,
  ...other,
})
