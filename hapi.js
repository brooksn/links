const Hapi = require('hapi')
const { getLinkBySlug, getPublicLinks, saveLink } = require('./store.js')
const html = require('./html.js')
const server = Hapi.server({ port: process.env.PORT })

server.route({
  method: 'GET',
  path: '/',
  handler() {
    return html(getPublicLinks(), true)
  }
})

server.route({
  method: 'GET',
  path: '/add',
  handler() {
    return html(getPublicLinks(), false)
  }
})

server.route({
  method: 'GET',
  path: '/{slug}',
  handler(request, h) {
    const slug = request.params.slug
    const link = getLinkBySlug(slug)

    return link && link.url
      ? h.response().redirect(link.url)
      : html(getPublicLinks(), true, `The link "${slug}" could not be found 🎃`)
  }
})

server.route({
  method: 'POST',
  path: '/add',
  handler(request) {
    const body = request.payload
    const { url, slug, password, web } = body
    const isPrivate = !!body.private

    if (web && password !== process.env.PASSWORD) {
      return html(getPublicLinks(), false, 'The password was incorrect 🤥')
    } else if (web && (!slug || !url)) {
      return html(getPublicLinks(), false, 'You are missing a required field 😔')
    } else if (web) {
      saveLink(url, slug, isPrivate)
      return html(getPublicLinks(), false, 'Saved! 🎉')
    }

    return { ...body }
  }
})

void async function start() {
  try {
    await server.start()
  } catch (err) {
    console.log(err)
    process.exit(1)
  }

  console.log('Server running at:', server.info.uri)
}()
