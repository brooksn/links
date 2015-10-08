var port = process.env.PORT|| process.env.port || process.env.npm_package_config_port || 3000;
var fs = require('fs');
var sha1 = require('sha1');
var co = require('co');
var koa = require('koa');
var hbs = require('koa-hbs');
var body = require('koa-bodyparser');
var bcrypt = require('co-bcryptjs');
var pgconnection = require('./pgconnection.js');
var usednonces = [];
var url = process.env.URL || process.env.HEROKU_URL || '';
var knex = require('knex')({
  client: 'pg',
  connection: pgconnection
});
var saltlen = 6;
var password = process.env.LINKS_PASSWORD;
if (!password) throw Error('LINKS_PASSWORD is not set.');

var defaults = JSON.parse(fs.readFileSync('links.json', 'utf8'));
var defaultslist = [];
for (key in defaults) defaultslist.push({slug: key, link: '/' + key, destination: defaults[key]});
var app = koa();
app.use(body());
app.use(hbs.middleware({
  viewPath: __dirname + '/views'
}));

var normalizedSlug = function(slug){
  var matchMost = /(?!%E2%9sea%8[cC])(%E2%9C%8C%F0%9F%8F|%F0%\w\w%\w\w%\w\w|%E2%\w\w%\w\w)((%F0%9F%8F)?%BA|(%F0%9F%8F)?%BB|(%F0%9F%8F)?%BC|(%F0%9F%8F)?%BD|(%F0%9F%8F)?%BE|(%F0%9F%8F)?%BF)/gi;
  return slug.replace(matchMost, '$1').toLowerCase();
};

var linklist = function(item){
  var destination;
  //if (item.url.length > 30) destination = item.url.substr(0,27) + '...';
  //else destination = item.url;
  return {
    slug: decodeURIComponent(item.displayslug),
    link: url + '/' + decodeURIComponent(item.normalizedslug),
    destination: item.url
  }
};

var getDisplayLinks = co.wrap(function*(){
  'use strict';
  let publiclinks = yield knex.select(['displayslug', 'normalizedslug', 'url', 'id']).from('links').whereNot('private', true).orderBy('id', 'asc');
  let links = [];
  links.push(...defaultslist, ...publiclinks.map(linklist));
  return links;
});

var saveLink = co.wrap(function*(slug, link, combo, privatelink, rest, context){
  'use strict';
  console.log('got into saveLink');
  var e = encodeURIComponent(slug);
  var ns = normalizedSlug(e);
  var insert = {
    url: link,
    displayslug: e,
    normalizedslug: ns
  };
  if (combo && combo != '') {
    var salt = yield bcrypt.genSalt(saltlen);
    var hash = yield bcrypt.hash(combo, salt);
    insert.combo = hash;
  }
  if (privatelink) insert.private = true;
  try {
    yield knex('links').insert(insert);
    let links = yield getDisplayLinks();
    if (rest !== true) {
      yield context.render('index', {
        links: links,
        message:'Success! visit ' + url + '/' + decodeURIComponent(insert.displayslug)
      });
    } else {
      return true;
    }
  } catch(e) {
    console.log(pgconnection);
    console.log(process.env.DATABASE_URL);
    console.log('error:');
    console.log(e);
    if (rest !== true) {
      let links = yield getDisplayLinks();
      yield context.render('index', {
        links: links,
        message:'Something went wrong :('
      });
    } else {
      return e;
    }
  }
});

app.use(function*(next){
  'use strict';
  yield next;
  var here = this;
  if (this.method !== 'POST') return;
  var form = this.request.body;
  let links = yield getDisplayLinks();
  if (form.web && form.password !== password) {
    yield this.render('index', {
      badpassword:true,
      links: links,
      message:'The password was incorrect.'
    });
    return;
  } else if (form.web && (!form.slug || !form.url)) {
    yield this.render('index', {
      links: links,
      message:'You are missing a required field.'
    });
  } else if (form.web) {
    let rest = false;
    yield saveLink(form.slug, form.url, form.combo, form.private, rest, here);
  }
});

app.use(function*(next){
  'use strict';
  yield next;
  if (this.method !== 'GET') return;
  var slug = this.request.path.split('/').pop();
  
  if (this.query.slug && this.query.url && this.query.ts && this.query.nonce && this.query.hash) {
    this.response.type = 'application/json';
    var now = new Date();
    var then = new Date(this.query.ts);
    if (now-then > 30000 || then-now > 10000) return this.response.body = {url:'', error:'Out of time.', success: 0};
    var str = this.query.slug + this.query.url + this.query.ts + this.query.nonce + password;
    var hash = sha1(str);
    let nonceisbad = false;
    for (var i in usednonces) {
      if (usednonces[i] === this.query.nonce) nonceisbad = true;
    }
    usednonces.push(this.query.nonce);
    
    if (nonceisbad === true) return this.response.body = {url:'', error:'Duplicate nonce: ' + this.query.nonce, success: 0};
    
    if (hash !== this.query.hash) return this.response.body = {url:'', error:'mismatched hash: ' + hash, success: 0};
    let rest = true;
    let here = this;
    let result = yield saveLink(this.query.slug, this.query.url, false, false, rest, here);
    if (result === true) return this.response.body = {url: '/'+this.query.slug, error:false, success: 1};
    else return this.response.body = {url: '', error:result, success: 0};
  }
  
  
  
  else if (slug === '' || slug === 'add') {
    this.response.type = 'text/html';
    let links = yield getDisplayLinks();
    var opts = {
      links: links
    };
    if (slug !== 'add') opts.hideform = true;
    yield this.render('index', opts);
    return;
  }

  if (defaults[slug]) {
    this.response.status = 307;
    this.response.redirect(defaults[slug]);
  } else {
    var ns = normalizedSlug(slug);
    var rows = yield knex.select('*').from('links').where('normalizedslug', ns);
    if (rows[0] && rows[0].normalizedslug === ns) {
      //if (rows[0].combo)
      this.response.status = 307;
      this.response.redirect(rows[0].url);
    }
  }
});

module.exports = app;
