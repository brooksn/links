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
      table.text('displayslug');
      table.text('normalizedslug').unique();
      table.text('url');
      table.text('combo');
      table.boolean('private').defaultTo(false);
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

