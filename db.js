// db.js
const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

let db;

async function connect() {
  if (!db) {
    await client.connect();
    db = client.db('Keys');  // <- Your MongoDB database name here
    console.log('Connected to MongoDB');
  }
  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Database not connected. Call connect() first.');
  }
  return db;
}

module.exports = { connect, getDb };
