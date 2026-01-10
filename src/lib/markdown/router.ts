import { handler as extract } from './extract'
import { handler as lint } from './lint'
import { handler as parse } from './parse'
import { handler as render } from './render'

export const router = {
  markdown: {
    render,
    parse,
    extract,
    lint,
  },
}
