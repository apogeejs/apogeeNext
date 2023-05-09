import typescript from "rollup-plugin-ts"
import nodeResolve from "@rollup/plugin-node-resolve"
import {lezer} from "@lezer/generator/rollup"

export default {
  input: "src/index.ts",
  external: id => false,
  output: [
    {dir: "./dist", format: "es"}
  ],
  plugins: [lezer(), typescript(),nodeResolve()]
}
