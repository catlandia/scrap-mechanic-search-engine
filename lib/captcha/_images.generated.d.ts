// Ambient declaration for the generated captcha manifest map. The actual
// lib/captcha/_images.manifest.json (name -> content-hashed filename) is
// produced by scripts/fetch-captcha-images.ts at build time and is gitignored,
// so typecheck may run before the file exists. This shim gives tsc a type
// without forcing a build step first.
declare module "*/_images.manifest.json" {
  const manifest: Record<string, string>;
  export default manifest;
}
