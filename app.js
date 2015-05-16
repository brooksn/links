var port = process.env.PORT|| process.env.port || process.env.npm_package_config_port || 3000;
var fs = require('fs');
var koa = require('koa');
var hbs = require('koa-hbs');
var body = require('koa-bodyparser');
var bcrypt = require('co-bcryptjs');
var pgconnection = require('./pgconnection.js');
var url = process.env.URL || 'http://brooks.click';
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

var linklist = function(item){
  var destination;
  //if (item.url.length > 30) destination = item.url.substr(0,27) + '...';
  //else destination = item.url;
  return {
    slug: item.slug,
    link: url + '/' + item.slug,
    destination: item.url
  }
};

app.use(function*(next){
  yield next;
  if (this.method !== 'POST') return;
  var form = this.request.body;
  if (form.password !== password) {
    var publiclinks = yield knex.select(['slug', 'url']).from('links').whereNot('private', true);
    yield this.render('index', {
      badpassword:true,
      links: publiclinks.map(linklist),
      message:'The password was incorrect.'
    });
    return;
  } else if (!form.slug || !form.url) {
    var publiclinks = yield knex.select(['slug', 'url']).from('links').whereNot('private', true);
    yield this.render('index', {
      links: publiclinks,
      message:'You are missing a required field.'
    });
  } else {
    var insert = {
      url: form.url,
      slug: form.slug
    };
    if (form.combo && form.combo != '') {
      var salt = yield bcrypt.genSalt(saltlen);
      var hash = yield bcrypt.hash(form.combo, salt);
      insert.combo = hash;
    }
    if (form.private) insert.private = true;
    try {
      yield knex('links').insert(insert);
      var publiclinks = yield knex.select(['slug', 'url']).from('links').whereNot('private', true);
      yield this.render('index', {
        links: publiclinks.map(linklist),
        message:'Success! visit ' + url + '/' + insert.slug
      });
    } catch(e) {
      console.log(pgconnection);
      console.log(process.env.DATABASE_URL);
      console.log('error:');
      console.log(e);
      var publiclinks = yield knex.select(['slug', 'url']).from('links').whereNot('private', true);
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
    var publiclinks = yield knex.select(['slug', 'url']).from('links').whereNot('private', true);
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
    var rows = yield knex.select('*').from('links').where('slug', slug);
    if (rows[0] && rows[0].slug === slug) {
      //if (rows[0].combo)
      this.response.status = 307;
      this.response.redirect(rows[0].url);
    }
  }
});

module.exports = app;
