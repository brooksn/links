const path = require('path')
const url = require('url')
const baseUrl = url.parse(process.env.BASE_URL || '')

function u(...parts) {
  const pathname = path.join(baseUrl.pathname, ...parts)
  const href = url.format({ ...baseUrl, path: path.join(pathname, baseUrl.search || ''), pathname })

  return href
}

function form() {
  return `
<form method="post">
  <input name="web" type="hidden" value="true">
  <div class="row">
    <div class="input-group input-group">
      <span class="input-group-addon" id="url-label">url</span>
      <input name="url" type="url" class="form-control" placeholder="http://example.com" aria-describedby="sizing-addon3">
    </div>
  </div>
  <div class="row">
    <div class="col-xs-6">
      <div class="input-group input-group">
        <span class="input-group-addon" id="slug-label">/</span>
        <input name="slug" type="text" autocorrect="off" autocapitalize="none" class="form-control" placeholder="slug" aria-describedby="sizing-addon3">
      </div>
    </div>
    <div class="col-xs-6">
      <div class="input-group input-group">
        <span class="input-group-addon" id="slug-label">unlisted</span>
        <input name="private" type="checkbox" class="form-control" aria-describedby="sizing-addon3">
      </div>
    </div>
  </div>
  <div class="row">
    <div class="input-group input-group">
      <span class="input-group-addon" id="password-label">password</span>
      <input name="password" type="password" class="form-control" aria-describedby="sizing-addon3">
    </div>
  </div>
  <div class="row">
    <button type="submit" class="btn btn-default">Submit</button>
  </div>
</form>
`
}

function link(data = {}) {
  const { displayslug, normalizedslug, url } = data
  const href = u(decodeURIComponent(normalizedslug))

  return `<li><a href="${href}">${decodeURIComponent(displayslug)}</a> &rarr; ${url}</li>`
}

function html(links, hideform = false, message = '') {
  return `
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${hideform ? '<title>List URLs</title>' : '<title>Add URL</title>'}
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js"></script>
    <!-- Latest compiled and minified CSS -->
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap.min.css">
    
    <!-- Optional theme -->
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap-theme.min.css">
    
    <!-- Latest compiled and minified JavaScript -->
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/js/bootstrap.min.js"></script>
    <style>
      #listcol {
        margin-left: -34px;
        padding-right: 0px;
        padding-left: 0px;
      }
      #listcol li {
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        max-width: 100%;
      }
    </style>
  </head>
  <body>
    <div class="container">
      ${message ? '<div class="row"><h2>' + message + '</h2></div>' : ''}
      ${hideform ? '' : form()}
      <div id="listrow" class="row">
        <div id="listcol" class="col-xs-12 col-sm-12">
          <ul>
            ${links.map(link).join('\n')}
          </ul>
        </div>
      </div>
    </div>
    <script>
      var b = window.location.href;
      if (b.substr(b.length-4, b.length) === '/add') b = b.substr(0, b.length-4) + '/';
      document.body.innerHTML = document.body.innerHTML.replace('Success! visit /', 'Success! visit ' + b);
    </script>
  </body>
</html>
`
}

module.exports = html
