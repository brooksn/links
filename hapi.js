const Hapi = require('hapi')
const { getLinks, getLinkBySlug, getPublicLinks, saveLink } = require('./store.js')
const html = require('./html.js')
const server = Hapi.server({ port: process.env.PORT })

server.route({
  method: 'GET',
  path: '/',
  handler(request, h) {
    return html(getPublicLinks(), true)
  }
})

server.route({
  method: 'GET',
  path: '/add',
  handler(request, h) {
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
  handler(request, h) {
    const body = request.payload
    const { url, slug, password, web } = body
    const isPrivate = !!body.private
    console.log('body:', body)
    if (body.web && password !== process.env.PASSWORD) {
      return html(getPublicLinks(), false, 'The password was incorrect 🤥')
    } else if (body.web && (!body.slug || !body.url)) {
      return html(getPublicLinks(), false, 'You are missing a required field 💩')
    } else if (body.web) {
      saveLink(url, slug, isPrivate)
      return html(getPublicLinks(), false, 'I think I saved it 😀')
      //let rest = false;
      //yield saveLink(form.slug, form.url, form.combo, form.private, rest, here);
    }
 
    return { ...body }
  }
})

void async function start() {

  try {
    await server.start()
  }
    catch (err) {
    console.log(err)
    process.exit(1)
  }

  console.log('Server running at:', server.info.uri)
}()
