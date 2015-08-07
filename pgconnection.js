var details = {
  host: 'localhost',
  database: 'links'
};
if (process.env.PGUSER) details.username = process.env.PGUSER;
module.exports = process.env.DATABASE_URL || details;
