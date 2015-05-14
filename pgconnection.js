var details = {
  host: 'localhost',
  database: 'links'
};
module.exports = process.env.DATABASE_URL || details;
