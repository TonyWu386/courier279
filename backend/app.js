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
    // first one is for docker, the second bare-metal
    origin: ['http://10.0.0.2:3000', 'http://localhost:3000'],
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
    // ATTENTION switch to the other host if using docker
    // host : 'db',
    host : 'localhost',
    user : 'c279-user',
    password : 'ADD DB USER PASSWORD HERE',
    // switch to this password for docker
    // password : 'HCvZT3dlYb',
    database : 'c279',
})

conn.connect((err) => {
    if (err) throw err;

    conn.query('SELECT 1 + 1 AS solution', function (err, rows, fields) {
        if (err) throw err;
    
        console.log('If the DB is working this will show 2: ', rows[0].solution);
    });
});


app.use(function (req, res, next){
    req.username = (req.session.username)? req.session.username : null;
    req.userId = (req.session.userId)? req.session.userId : null;

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
    POST /api/signin/
    Logs an existing user into the webapp
*/
app.post('/api/signin/', function (req, res, next) {
    var username = req.body.username;
    // retrieve user from the database

    conn.query(`SELECT u.UserId, u.Username, c.Password, c.Salt, c.PubKey, c.EncryptedPrivKey, c.EncryptedPrivKeyNonce, c.ClientSymKdfSalt
                FROM Users u
                INNER JOIN UserCredentials c
                ON u.UserId = c.Users_UserId
                WHERE u.Username = ?`,
    [username], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");
        if (rows.length <= 0) return res.status(401).contentType("text/plain").end("access denied");

        let user = rows[0];

        let storedSalt = user.Salt;

        // SHA-family hashes not recommended anymore for passwords as too fast
        // The slow hash "PBKDF2" is better
        crypto.pbkdf2(req.body.password, storedSalt, 100000, 64, 'sha512', function (err, derivedKey) {
            let newPasswordDigest = derivedKey.toString('base64');

            if (user.Password !== newPasswordDigest) return res.status(401).contentType("text/plain").end("access denied"); 

            // initialize cookie
            res.setHeader('Set-Cookie', cookie.serialize('username', username, {
                  path : '/', 
                  maxAge: 60 * 60 * 24 * 7
            }));

            req.session.username = req.body.username;
            req.session.userId = user.UserId;

            const user_crypt_info = {
                'ClientSymKdfSalt' : user.ClientSymKdfSalt,
                'PubKey' : user.PubKey,
                'EncryptedPrivKey' : user.EncryptedPrivKey,
                'EncryptedPrivKeyNonce' : user.EncryptedPrivKeyNonce,
            }

            return res.json(user_crypt_info);
        });
    });
});




/*
    POST /api/signup/
    Creates a new user for the webapp, also logs in automatically
*/
app.post('/api/signup/', function (req, res, next) {
    let username = req.body.username;
    let pubkey = req.body.pubkey;
    let enc_privkey_nonce = req.body.enc_privkey_nonce;
    let enc_privkey = req.body.enc_privkey;
    let client_sym_kdf_salt = req.body.client_sym_kdf_salt;
    let server_salt = crypto.randomBytes(16).toString('base64');

    if ((!enc_privkey) || (!enc_privkey_nonce) || (!pubkey) || (!client_sym_kdf_salt)) return res.status(400).contentType("text/plain").end("Did not get required crypt data");

    function create_user_routine(passwordDigest) {
        conn.query('INSERT INTO Users(Username, RealName) VALUES (?,?)', [username, '@TODO Bob'], (err, rows) => {
            if (err) {
                conn.rollback(() => {});
                return res.status(500).contentType("text/plain").end("Internal MySQL Error");
            }

            new_userId = rows.insertId;

            conn.query(`INSERT INTO UserCredentials(Users_UserId, Password, Salt, PubKey, EncryptedPrivKey, EncryptedPrivKeyNonce, ClientSymKdfSalt)
                        VALUES (?,?,?,?,?,?,?)`,
            [new_userId, passwordDigest, server_salt, pubkey, enc_privkey, enc_privkey_nonce, client_sym_kdf_salt], (err, rows) => {
                if (err) {
                    conn.rollback(() => {});
                    return res.status(500).contentType("text/plain").end("Internal MySQL Error");
                }

                res.setHeader('Set-Cookie', cookie.serialize('username', username, {
                    path : '/', 
                    maxAge: 60 * 60 * 24 * 7
                }));
                
                req.session.username = req.body.username;
                req.session.userId = new_userId;

                conn.commit((err) => {
                    if (err) return res.status(500).contentType("text/plain").end(err);

                    return res.json("user " + username + " signed up");
                });
            });
        });
    }

    // SHA-family hashes not recommended anymore for passwords as too fast
    // The slow hash "PBKDF2" is better
    crypto.pbkdf2(req.body.password, server_salt, 100000, 64, 'sha512', function (err, derivedKey) {
        if (err) return res.status(500).contentType("text/plain").end(err);
        let passwordDigest = derivedKey.toString('base64');

        conn.query('SELECT 1 FROM Users WHERE Username = ?', [username], (err, rows) => {
            if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");
            if (rows.length > 0) return res.status(409).contentType("text/plain").end("username " + username + " already exists");

            conn.beginTransaction((err) => {
                if (err) return res.status(500).contentType("text/plain").end(err);

                create_user_routine(passwordDigest);
            });
        });
    });
});





/*  For creating a new contacts
    POST /api/contacts/
*/
app.post('/api/contacts/', function (req, res, next) {
    if (req.username == null) return res.status(403).contentType("text/plain").end("Not signed in");

    let owning_username = req.body.owning_username;
    let target_username = req.body.target_username;
    let contact_type = req.body.contact_type;

    let owning_id = null;
    let target_id = null;

    if (req.username != owning_username) return res.status(401).contentType("text/plain").end("Not signed in as owning user");

    conn.query(`SELECT UserId From Users WHERE Username = ?;`, [owning_username], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");
        if (!rows.length) return res.status(500).contentType("text/plain").end("Can't find contact owner in DB");

        owning_id = rows[0].UserId;

        conn.query(`SELECT UserId From Users WHERE Username = ?;`, [target_username], (err, rows) => {
            if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");
            if (!rows.length) return res.status(500).contentType("text/plain").end("Can't find contact target in DB");

            target_id = rows[0].UserId;

            if (owning_id == target_id) return res.status(400).contentType("text/plain").end("Can't add user as contact to itself");

            conn.query(`SELECT ContactTypeId FROM ContactTypes WHERE ContactType = ?`, [contact_type], (err, rows) => {
                if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");
                if (!rows.length) return res.status(500).contentType("text/plain").end("Invalid Contact Type");

                let contact_type_id = rows[0].ContactTypeId;

                conn.query(`INSERT INTO Contacts(Owning_UserId, Target_UserId, ContactTypes_ContactTypeId)
                        VALUES (?,?,?)`,
                [owning_id, target_id, contact_type_id], (err, rows) => {
                    if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

                    return res.json("added contact, id " + rows.insertId);
                });
            });
        });
    });
});




/*  Gets all contacts owned by username
    POST /api/contacts/?username=foo
*/
app.get('/api/contacts/', function (req, res, next) {
    if (req.username == null) return res.status(403).contentType("text/plain").end("Not signed in");

    let owning_username = req.query.username;

    if (!owning_username) return res.status(400).contentType("text/plain").end("Unable to parse username for getting contacts");

    if (req.username != owning_username) return res.status(403).contentType("text/plain").end("Not signed in as owning user");

    conn.query(`SELECT c.ContactId, c.DateAdded, ct.ContactType, ut.Username
                FROM Contacts c
                INNER JOIN Users ut
                ON ut.UserId = c.Target_UserId
                INNER JOIN ContactTypes ct
                ON ct.ContactTypeId = c.ContactTypes_ContactTypeId
                WHERE c.Owning_UserId = ?;`,
    [req.userId], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

        let results = [];

        rows.forEach(element => {
            results.push({
                'ContactId' : element.ContactId,
                'TargetUsername' : element.Username,
                'DateAdded' : element.DateAdded,
                'ContactType' : element.ContactType,
            });
        });

        return res.json(results);
    });
});


/*  Gets the public key owned by username
    GET /api/crypto/pubkey/?username=foo
*/
app.get('/api/crypto/pubkey/', function (req, res, next) {
    if (req.username == null) return res.status(403).contentType("text/plain").end("Not signed in");

    let owning_username = req.query.username;

    if (!owning_username) return res.status(400).contentType("text/plain").end("Unable to parse username for getting pubkey");

    conn.query(`SELECT c.PubKey FROM UserCredentials c
                INNER JOIN Users u
                ON u.UserId = c.Users_UserId
                WHERE u.Username = ?`,
    [owning_username], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

        if (!rows) return res.status(400).contentType("text/plain").end("Username doesn't exist");

        return res.json({
            'pubkey' : rows[0].PubKey,
        });
    });
});



/*  Delete a contact by ContactId
    DELETE /api/contacts/:id/
*/
app.delete('/api/contacts/:id/', function (req, res, next) {
    if (req.username == null) return res.status(403).contentType("text/plain").end("Not signed in");

    if (!req.params.id) return res.status(400).contentType("text/plain").end("Unable to parse ContactId for deletion");

    const contactId = req.params.id;

    conn.query(`SELECT Owning_UserId FROM Contacts WHERE ContactId = ?`, [contactId], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

        if (!rows.length) return res.status(400).contentType("text/plain").end("ContactId " + contactId + " not found");
        if (rows[0].Owning_UserId != req.userId) return res.status(403).contentType("text/plain").end("Not signed in as owning user");

        conn.query(`DELETE FROM Contacts WHERE ContactId = ?`, [contactId], (err, rows) => {
            if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

            return res.json("deleted contact at id " + contactId);
        });
    });
});



/*  For pushing a new direct message to the server
    POST /api/messages/direct/
*/
app.post('/api/messages/direct/', function (req, res, next) {
    if (req.username == null) return res.status(403).contentType("text/plain").end("Not signed in");

    let target_username = req.body.target_username;
    let encrypted_body = req.body.encrypted_body;
    let nonce = req.body.nonce;

    if ((!target_username) || (!encrypted_body) || (!nonce)) return res.status(400).contentType("text/plain").end("Did not get required data");

    let target_id = null;
    let senderId = req.userId;

    conn.query(`SELECT UserId From Users WHERE Username = ?;`, [target_username], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");
        if (!rows.length) return res.status(500).contentType("text/plain").end("Can't find target in DB");

        target_id = rows[0].UserId;

        conn.query(`INSERT INTO DirectMessages(Sender_UserId, Receiver_UserId, EncryptedText, Nonce) VALUES (?,?,?,?)`,
        [senderId, target_id, encrypted_body, nonce], (err, rows) => {
            if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

            return res.json("sent message to " + target_username);
        });
    });
});


/*  For getting direct messages sent from a username, to the logged-in user
    GET /api/messages/direct/?from=foo

    For getting direct messages sent to a username, sent by the logged-in user
    GET /api/messages/direct/?to=foo

    For getting all back-and-forth direct messages between 2 users
    GET /api/messages/direct/?toandfrom=foo
*/
app.get('/api/messages/direct/', function (req, res, next) {
    if (req.username == null) return res.status(403).contentType("text/plain").end("Not signed in");

    let from_username = req.query.from;
    let to_username = req.query.to;
    let toandfrom_username = req.query.toandfrom;

    if (toandfrom_username) {
        if ((from_username) || (to_username)) return res.status(400).contentType("text/plain").end("Incompatible combination of args");

        from_username = toandfrom_username;
        to_username = toandfrom_username;
    } else if (from_username && to_username) {
        return res.status(400).contentType("text/plain").end("Incompatible combination of args");
    } else if ((!from_username) && (!to_username)) {
        return res.status(400).contentType("text/plain").end("Unable to parse username for getting messages");
    }

    let query = null;
    let args = null;

    if (toandfrom_username) {
        query = `SELECT m.DirectMessageId, m.EncryptedText, u.Username SenderUsername
        FROM DirectMessages m
        INNER JOIN Users u
        ON m.Sender_UserId = u.UserId
        WHERE (m.Receiver_UserId = ? AND m.Sender_UserId IN (SELECT UserId FROM Users WHERE Username = ?))
        OR (m.Receiver_UserId IN (SELECT UserId FROM Users WHERE Username = ?) AND m.Sender_UserId = ?)`;
        args = [req.userId, from_username, to_username, req.userId]
    } else if (to_username) {
        query = `SELECT m.DirectMessageId, m.EncryptedText, u.Username SenderUsername
        FROM DirectMessages m
        INNER JOIN Users u
        ON m.Sender_UserId = u.UserId
        WHERE m.Receiver_UserId IN (SELECT UserId FROM Users WHERE Username = ?) AND m.Sender_UserId = ?`;
        args = [to_username, req.userId];
    } else {
        query = `SELECT m.DirectMessageId, m.EncryptedText, u.Username SenderUsername, m.Nonce
        FROM DirectMessages m
        INNER JOIN Users u
        ON m.Sender_UserId = u.UserId
        WHERE m.Receiver_UserId = ? AND m.Sender_UserId IN (SELECT UserId FROM Users WHERE Username = ?)`;
        args = [req.userId, from_username];
    }


    conn.query(query, args, (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

        let results = [];

        rows.forEach(element => {
            results.push({
                'DirectMessageId' : element.DirectMessageId,
                'EncryptedText' : element.EncryptedText,
                'SenderUsername' : element.SenderUsername,
                'ReceiverUsername' : req.username,
                'Nonce' : element.Nonce
            });
        });

        return res.json(results);
    });
});




/*  Gets all the usernames in the system
    GET /api/users
*/
app.get('/api/users/', function (req, res, next) {
    if (req.username == null) return res.status(403).contentType("text/plain").end("Not signed in");

    conn.query(`SELECT Username
                FROM Users`,
    [], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

        let results = [];

        rows.forEach(element => {
            results.push({
                'Username' : element.Username,
            });
        });

        return res.json(results);
    });
});


/*  For getting the group sessions the logged-in user is a part of
    GET /api/messages/group/session/
*/
app.get('/api/messages/group/session/', function (req, res, next) {
    if (req.username == null) return res.status(403).contentType("text/plain").end("Not signed in");

    conn.query(`SELECT s.SessionId, s.SessionType, s.SessionStartDate, u.Username FROM UserToSession us
                INNER JOIN Sessions s
                ON us.Sessions_SessionId = s.SessionId
                INNER JOIN Users u
                ON s.Owner_UserId = u.UserId
                WHERE us.Users_UserId = ?;`,
    [req.userId], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

        let sessions = [];

        rows.forEach(element => {
            sessions.push({
                'SessionId' : element.SessionId,
                'SessionType' : element.SessionType,
                'SessionStartDate' : element.SessionStartDate,
                'OwnerUsername' : element.Username,
            });
        });

        return res.json(sessions);
    });
});




/*  Adds a new user to an existing group session
    POST /api/messages/group/session/adduser/
*/
app.post('/api/messages/group/session/adduser/', function (req, res, next) {
    if (req.username == null) return res.status(403).contentType("text/plain").end("Not signed in");

    let encrypted_session_key = req.body.encrypted_session_key;
    let nonce = req.body.nonce;
    let username_to_add = req.body.username_to_add;
    let sessionId = req.body.sessionId;

    if ((!encrypted_session_key) || (!nonce) || (!username_to_add) || (!sessionId)) return res.status(400).contentType("text/plain").end("Did not get required data");

    conn.query(`SELECT UserId FROM Users WHERE Username = ?`, [username_to_add], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");
        if (!rows.length) return res.status(400).contentType("text/plain").end("Username to add does not exist");

        let userId_to_add = rows[0].UserId;

        conn.query(`SELECT Owner_UserId
                    FROM Sessions
                    WHERE SessionId = ?`,
        [sessionId], (err, rows) => {
            if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");
            if (!rows.length) return res.status(400).contentType("text/plain").end("Group session not found");
            if (rows[0].Owner_UserId != req.userId) return res.status(401).contentType("text/plain").end("Not the owner of this group session");

            conn.query(`INSERT INTO UserToSession(Sessions_SessionId, Users_UserId, EncryptedSessionKey, Nonce)
                        VALUES (?,?,?,?)`,
            [sessionId, userId_to_add, encrypted_session_key, nonce], (err, rows) => {
                if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

                return res.json("Added user " + username_to_add + " to session with id " + sessionId);
            });
        });
    });
});




/*  For starting a new group message session
    Calling user becomes the owner of the session
    POST /api/messages/group/session/
*/
app.post('/api/messages/group/session/', function (req, res, next) {
    if (req.username == null) return res.status(403).contentType("text/plain").end("Not signed in");

    let encrypted_session_key = req.body.encrypted_session_key;
    let nonce = req.body.nonce;

    if ((!encrypted_session_key) || (!nonce)) return res.status(400).contentType("text/plain").end("Did not get required data");

    conn.beginTransaction((err) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

        conn.query(`INSERT INTO Sessions(SessionType, Owner_UserId)
                    VALUES (?, ?)`,
        ['group', req.userId], (err, rows) => {
            if (err) {
                conn.rollback(() => {});
                return res.status(500).contentType("text/plain").end("Internal MySQL Error");
            }

            const sessionId = rows.insertId;

            conn.query(`INSERT INTO UserToSession(Sessions_SessionId, Users_UserId, EncryptedSessionKey, Nonce)
                        VALUES (?,?,?,?)`,
            [sessionId, req.userId, encrypted_session_key, nonce], (err, rows)=>{
                if (err) {
                    conn.rollback(() => {});
                    return res.status(500).contentType("text/plain").end("Internal MySQL Error");
                }

                conn.commit((err) => {
                    if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");
                });

                return res.json({
                    "sessionId" : sessionId,
                });
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
