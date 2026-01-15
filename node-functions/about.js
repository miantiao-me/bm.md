import server from '.output/server/index.mjs'

export default function onRequest({ request }) {
  return server.fetch(request)
}
