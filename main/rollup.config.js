import typescript from "rollup-plugin-ts"
import nodeResolve from "@rollup/plugin-node-resolve"

export default {
  input: "src/main.ts",
  external: id => false,
  output: [
    {file: "dist/index.cjs", format: "cjs"},
  ],
  plugins: [typescript(),nodeResolve()]
}
    