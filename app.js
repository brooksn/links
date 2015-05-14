var port = process.env.PORT|| process.env.port || process.env.npm_package_config_port || 3000;
var fs = require('fs');
var koa = require('koa');
var hbs = require('koa-hbs');
var body = require('koa-bodyparser');
var bcrypt = require('co-bcryptjs');
var pgconnection = require('./pgconnection.js');
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

app.use(function*(next){
  yield next;
  if (this.method !== 'POST') return;
  var form = this.request.body;
  if (form.password !== password) {
    yield this.render('index', {
      badpassword:true,
      message:'The password was incorrect.'
    });
    return;
  } else if (!form.slug || !form.url) {
    yield this.render('index', {
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
    try {
      yield knex('links').insert(insert);
      this.response.body = 'Success! visit brooks.click/' + insert.slug;
    } catch(e) {
      console.log(pgconnection);
      console.log(process.env.DATABASE_URL);
      console.log('error:');
      console.log(e);
      yield this.render('index', {
        message:'Something went wrong :('
      });
    }
  }
});

app.use(function*(next){
  yield next;
  if (this.method !== 'GET') return;
  var slug = this.request.path.split('/').pop();
  if (slug === '') {
    this.response.type = 'text/html';
    yield this.render('index', {});
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
