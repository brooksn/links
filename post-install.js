var pgconnection = require('./pgconnection.js');
console.log('pgconnection: ' + pgconnection);
var knex = require('knex')({
  client: 'pg',
  connection: pgconnection
});

knex.schema.hasTable('links').then(function(exists){
  console.log('here: ' + exists);
  if (!exists) {
    knex.schema.createTable('links', function(table){
      console.log('there.');
      table.increments();
      table.string('slug').unique();
      table.string('url');
      table.string('combo');
      table.timestamps();
    }).then(function(result){
      console.log('result:');
      console.log(result);
      knex.destroy();
    }).catch(function(reason){
      console.log('reason:');
      console.log(reason);
      knex.destroy();
    });
  } else {
    knex.destroy();
  }
});

