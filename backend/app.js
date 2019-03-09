/*jshint esversion: 6 */

const path = require('path');
const express = require('express');
const fs = require('fs');
const app = express();
const cookie = require('cookie');
const crypto = require('crypto');
const mysql = require('mysql');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const session = require('express-session');
app.use(session({
    secret: 'Pi9K2cDQ69',
    resave: false,
    saveUninitialized: true,
}));

const conn = mysql.createConnection({
    host : 'localhost',
    user : 'c279-user',
    password : 'ADD DB USER PASSWORD HERE',
    database : 'c279',
})

conn.connect();

conn.query('SELECT 1 + 1 AS solution', function (err, rows, fields) {
    if (err) throw err;

    console.log('If the DB is working this will show 2: ', rows[0].solution);
});

app.use(function (req, res, next){
    req.username = (req.session.username)? req.session.username : null;

    if (req.session.username == null) {
        res.setHeader('Set-Cookie', cookie.serialize('username', '', {
            path : '/', 
            maxAge: 60 * 60 * 24 * 7 // 1 week in number of seconds
        }));
    }

    console.log("HTTP request", req.username, req.method, req.url, req.body);
    next();
});


/*
    POST /signup/
    Creates a new user for the webapp, also logs in automatically
*/
app.post('/signup/', function (req, res, next) {
    var username = req.body.username;
    let salt = crypto.randomBytes(16).toString('base64');

    function create_user_routine(passwordDigest) {
        conn.query('INSERT INTO Users(Username, RealName) VALUES (?,?)', [username, '@TODO Bob'], (err, rows) => {
            if (err) return res.status(500).end(conn.rollback(() => {}));

            new_userId = rows.insertId;

            conn.query(`INSERT INTO UserCredentials(Users_UserId, HashedPassword, PersistentPubKey, EncryptedPersistentPrivKey)
                        VALUES (?,?,?,?)`,
            [new_userId, passwordDigest, '@TODO Pub', '@TODO Priv'], (err, rows) => {
                if (err) return res.status(500).end(conn.rollback(() => {}));

                res.setHeader('Set-Cookie', cookie.serialize('username', username, {
                    path : '/', 
                    maxAge: 60 * 60 * 24 * 7
                }));
                
                req.session.username = req.body.username;

                conn.commit((err) => {
                    if (err) return res.status(500).end(err);

                    return res.json("user " + username + " signed up");
                });
            });
        });
    }

    // SHA-family hashes not recommended anymore for passwords as too fast
    // The slow hash "PBKDF2" is better
    crypto.pbkdf2(req.body.password, salt, 100000, 64, 'sha512', function (err, derivedKey) {
        if (err) return res.status(500).end(err);
        let passwordDigest = derivedKey.toString('base64');

        conn.query('SELECT 1 FROM Users WHERE Username = ?', [username], (err, rows) => {
            if (err) return res.status(500).end(err);
            if (rows.length > 0) return res.status(409).end("username " + username + " already exists");

            conn.beginTransaction((err) => {
                if (err) return res.status(500).end(err);

                create_user_routine(passwordDigest);
            });
        });
    });
});

const http = require('http');
const PORT = 3001;

http.createServer(app).listen(PORT, function (err) {
    if (err) console.log(err);
    else console.log("HTTP server on http://localhost:%s", PORT);
});