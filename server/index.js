const keys = require('./keys');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const redis = require('redis');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// postgress
const { Pool } = require('pg');
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
});

pgClient.on('error', () => console.log('Lost PG connection'));

pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT)')
.catch(err => console.log(err));

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});

const redisPublisher = redisClient.duplicate();

app.get('/', (req, res) => {
    res.send('hi');
});

app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('SELECT * FROM values');
    res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
    redisClient.hgetall('values', (err, values) => {
        res.send(values);
    })
});

app.post('/values', async (req, res) => {
    const index = req.body.index;

    if(parseInt(index) > 40) {
        return res.status(422).send('index too high');
    }

    redisClient.hset('values', index, 'Nothing yet!');
    redisPublisher.publish('insert', index);
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

    res.send({ working: true });
});
const port = 5000;
app.listen(port, (err) => {
    console.log(`Server started on port ${port}`);
});


