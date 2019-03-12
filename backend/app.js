/*jshint esversion: 6 */

const path = require('path');
const express = require('express');
const fs = require('fs');
const app = express();
const cookie = require('cookie');
const crypto = require('crypto');
const mysql = require('mysql');
const cors = require('cors');


const corsOptions = {
    origin: 'http://localhost:3000',
    optionsSuccessStatus: 200
}

app.use(cors(corsOptions));


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
    POST /signin/
    Logs an existing user into the webapp
*/
app.post('/signin/', function (req, res, next) {
    var username = req.body.username;
    // retrieve user from the database

    conn.query(`SELECT u.Username, c.Password, c.Salt
                FROM Users u
                INNER JOIN UserCredentials c
                WHERE u.Username = ?`,
    [username], (err, rows) => {
        if (err) return res.status(500).end(err);
        if (rows.length <= 0) return res.status(401).end("access denied");

        let user = rows[0];

        let storedSalt = user.Salt;

        // SHA-family hashes not recommended anymore for passwords as too fast
        // The slow hash "PBKDF2" is better
        crypto.pbkdf2(req.body.password, storedSalt, 100000, 64, 'sha512', function (err, derivedKey) {
            let newPasswordDigest = derivedKey.toString('base64');

            if (user.Password !== newPasswordDigest) return res.status(401).end("access denied"); 

            // initialize cookie
            res.setHeader('Set-Cookie', cookie.serialize('username', username, {
                  path : '/', 
                  maxAge: 60 * 60 * 24 * 7
            }));

            req.session.username = req.body.username;
            return res.json("user " + username + " signed in");
        });
    });
});




/*
    POST /signup/
    Creates a new user for the webapp, also logs in automatically
*/
app.post('/signup/', function (req, res, next) {
    let username = req.body.username;
    let pubkey = req.body.pubkey;
    let enc_privkey_nonce = req.body.enc_privkey_nonce;
    let enc_privkey = req.body.enc_privkey;
    let salt = crypto.randomBytes(16).toString('base64');

    if ((!enc_privkey) || (!enc_privkey_nonce) || (!pubkey)) return res.status(400).end("Did not get required crypt data");

    function create_user_routine(passwordDigest) {
        conn.query('INSERT INTO Users(Username, RealName) VALUES (?,?)', [username, '@TODO Bob'], (err, rows) => {
            if (err) return res.status(500).end(conn.rollback(() => {}));

            new_userId = rows.insertId;

            conn.query(`INSERT INTO UserCredentials(Users_UserId, Password, Salt, PubKey, EncryptedPrivKey, EncryptedPrivKeyNonce)
                        VALUES (?,?,?,?,?,?)`,
            [new_userId, passwordDigest, salt, pubkey.toString('base64'), enc_privkey.toString('base64'), enc_privkey_nonce.toString('base64')], (err, rows) => {
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
    crypto.pbkdf2(req.body.password.toString('base64'), salt, 100000, 64, 'sha512', function (err, derivedKey) {
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





/*  For creating a new contacts
    POST /api/contacts/
*/
app.post('/api/contacts/', function (req, res, next) {
    if (req.username == null) return res.status(403).end("Not signed in");

    let owning_username = req.body.owning_username;
    let target_username = req.body.target_username;
    let contact_type = "TODOfriend";

    let owning_id = null;
    let target_id = null;

    if (req.username != owning_username) return res.status(403).end("Not signed in as owning user");

    conn.query(`SELECT UserId From Users WHERE Username = ?;`, [owning_username], (err, rows) => {
        if (err) return res.status(500).end(err);
        if (!rows.length) return res.status(500).end("Can't find contact owner in DB");

        owning_id = rows[0].UserId;

        conn.query(`SELECT UserId From Users WHERE Username = ?;`, [target_username], (err, rows) => {
            if (err) return res.status(500).end(err);
            if (!rows.length) return res.status(500).end("Can't find contact target in DB");

            target_id = rows[0].UserId;

            if (owning_id == target_id) return res.status(400).end("Can't add user as contact to itself");

            conn.query(`INSERT INTO Contacts(Owning_UserId, Target_UserId, ContactType)
                        VALUES (?,?,?)`,
            [owning_id, target_id, contact_type], (err, rows) => {
                if (err) return res.status(500).end(err);

                return res.json("added contact, id " + rows.insertId);
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
