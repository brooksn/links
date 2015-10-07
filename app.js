var port = process.env.PORT|| process.env.port || process.env.npm_package_config_port || 3000;
var fs = require('fs');
var koa = require('koa');
var hbs = require('koa-hbs');
var body = require('koa-bodyparser');
var bcrypt = require('co-bcryptjs');
var pgconnection = require('./pgconnection.js');
var url = process.env.URL || process.env.HEROKU_URL;
var knex = require('knex')({
  client: 'pg',
  connection: pgconnection
});
var saltlen = 6;
var password = process.env.LINKS_PASSWORD;
if (!password) throw Error('LINKS_PASSWORD is not set.');

var defaults = JSON.parse(fs.readFileSync('links.json', 'utf8'));

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

app.use(function*(next){
  yield next;
  if (this.method !== 'POST') return;
  var form = this.request.body;
  if (form.password !== password) {
    var publiclinks = yield knex.select(['displayslug', 'normalizedslug', 'url', 'id']).from('links').whereNot('private', true).orderBy('id', 'asc');
    yield this.render('index', {
      badpassword:true,
      links: publiclinks.map(linklist),
      message:'The password was incorrect.'
    });
    return;
  } else if (!form.slug || !form.url) {
    var publiclinks = yield knex.select(['displayslug', 'normalizedslug', 'url', 'id']).from('links').whereNot('private', true).orderBy('id', 'asc');
    yield this.render('index', {
      links: publiclinks,
      message:'You are missing a required field.'
    });
  } else {
    var e = encodeURIComponent(form.slug);
    var ns = normalizedSlug(e);
    var insert = {
      url: form.url,
      displayslug: e,
      normalizedslug: ns
    };
    if (form.combo && form.combo != '') {
      var salt = yield bcrypt.genSalt(saltlen);
      var hash = yield bcrypt.hash(form.combo, salt);
      insert.combo = hash;
    }
    if (form.private) insert.private = true;
    try {
      yield knex('links').insert(insert);
      var publiclinks = yield knex.select(['displayslug', 'normalizedslug', 'url', 'id']).from('links').whereNot('private', true).orderBy('id', 'asc');
      yield this.render('index', {
        links: publiclinks.map(linklist),
        message:'Success! visit ' + url + '/' + decodeURIComponent(insert.displayslug)
      });
    } catch(e) {
      console.log(pgconnection);
      console.log(process.env.DATABASE_URL);
      console.log('error:');
      console.log(e);
      var publiclinks = yield knex.select(['displayslug', 'normalizedslug', 'url', 'id']).from('links').whereNot('private', true).orderBy('id', 'asc');
      yield this.render('index', {
        links: publiclinks,
        message:'Something went wrong :('
      });
    }
  }
});

app.use(function*(next){
  yield next;
  if (this.method !== 'GET') return;
  var slug = this.request.path.split('/').pop();
  if (slug === '' || slug === 'add') {
    this.response.type = 'text/html';
    var publiclinks = yield knex.select(['displayslug', 'normalizedslug', 'url', 'id']).from('links').whereNot('private', true).orderBy('id', 'asc');
    var opts = {
      links: publiclinks.map(linklist)
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
