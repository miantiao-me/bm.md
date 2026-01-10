// register-ignore-css.mjs
import { register } from 'node:module'
import { resolve } from 'node:path'

register(resolve(import.meta.dirname, 'index.mjs'), import.meta.url)
