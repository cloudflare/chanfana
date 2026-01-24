export type Env = {
  test: string;
  DB: D1Database;
};

declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {}
}
