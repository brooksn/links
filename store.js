const fs = require('fs')
const { find } = require('lodash')
const store = require('./.data/links.json')
const matchMost = new RegExp(/(?!%E2%9sea%8[cC])(%E2%9C%8C%F0%9F%8F|%F0%\w\w%\w\w%\w\w|%E2%\w\w%\w\w)((%F0%9F%8F)?%BA|(%F0%9F%8F)?%BB|(%F0%9F%8F)?%BC|(%F0%9F%8F)?%BD|(%F0%9F%8F)?%BE|(%F0%9F%8F)?%BF)/, 'gi')

const normalizedSlug = slug => {
  return encodeURIComponent(slug.replace(matchMost, '$1')).toLowerCase()
}

const getLinks = () => store.links

const getPublicLinks = () => getLinks().filter(link => !link.private)

const getLastLink = () => {
  const links = getLinks()
  return links.length >= 1 ? links[links.length - 1] : undefined
}

const getLinkBySlug = slug => {
 const normalizedslug = normalizedSlug(slug)
 console.log('slug:', slug, 'normalizedslug:', normalizedslug)
 return find(getLinks(), link => {
   const normalized = link.normalizedslug.toLowerCase()
   const display = link.displayslug.toLowerCase()
   console.log('slug:', slug, 'normalizedslug:', normalizedslug)
    console.log('normalized', normalized, 'display', display)
   return normalizedslug === normalized
     || normalizedslug === display
     || slug === normalized
     || slug === display
 }) || null
}

const saveLink = (url, slug, isPrivate) => {
  const lastLink = getLastLink()
  const displayslug = slug
  const normalizedslug = normalizedSlug(displayslug)
  const insert = { id: lastLink ? lastLink.id + 1 : 1, private: isPrivate, url, displayslug, normalizedslug }

  if (!Array.isArray(store.links)) store.links = []

  store.links.push(insert)
  fs.writeFileSync('./.data/links.json', JSON.stringify(store, null, '  '), 'utf8')

  return getLastLink()
}

module.exports = {
  getLinks,
  getPublicLinks,
  getLastLink,
  getLinkBySlug,
  saveLink
}
