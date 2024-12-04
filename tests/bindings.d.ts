export type Env = {
  test: string;
};

declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {}
}
