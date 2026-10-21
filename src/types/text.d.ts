/** Webpack `asset/source` and the Vitest raw-text plugin both default-export the file contents. */
declare module "*.txt" {
  const content: string;
  export default content;
}
