// Ambient declaration for the generated captcha manifest. The actual
// lib/captcha/_images.generated.json is produced by
// scripts/fetch-captcha-images.ts at build time and is gitignored, so
// typecheck runs before the file exists. This shim gives tsc a type
// without forcing a build step first.
declare module "*/_images.generated.json" {
  const manifest: Record<string, string>;
  export default manifest;
}
