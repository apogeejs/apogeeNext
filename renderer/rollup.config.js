import typescript from "rollup-plugin-ts"
import nodeResolve from "@rollup/plugin-node-resolve"
import commonjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'
import {lezer} from "@lezer/generator/rollup"

export default {
  input: "./src/app.tsx",
  external: id => false,
  output: [
    {dir: "./dist", format: "es"}
  ],
  plugins: [
    lezer(),
    nodeResolve(),
    commonjs(),
    typescript(),
    replace({
      values: {
			  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
      },
      preventAssignment: true
		}),
  ]
}
    