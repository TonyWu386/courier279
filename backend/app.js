/*jshint esversion: 6 */

const path = require('path');
const express = require('express');
const fs = require('fs');
const app = express();
const cookie = require('cookie');
const crypto = require('crypto');
const mysql = require('mysql');
const cors = require('cors');
const validator = require('validator');
const multer = require('multer');

const Memcached = require('memcached');
let contacts_cache = new Memcached('localhost:11211');
// ATTENTION switch to this one for docker
// let contacts_cache = new Memcached('memcached:11211');

let upload_enc = multer({dest: path.join(__dirname, 'encrypted_uploads')});
let upload_pro = multer({dest: path.join(__dirname, 'profile_picture_uploads')});


const corsOptions = {
    origin: ['https://c279.ml', 'https://www.c279.ml'],
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


let warmCache = function(userId){

    let args = [];
    let query = `SELECT c.Owning_UserId, c.ContactId, c.DateAdded, ct.ContactType, ut.Username
                FROM Contacts c
                INNER JOIN Users ut
                    ON ut.UserId = c.Target_UserId
                INNER JOIN ContactTypes ct
                    ON ct.ContactTypeId = c.ContactTypes_ContactTypeId`;
    if (userId) {
        query += ` WHERE c.Owning_UserId = ? `;
        args = [userId];
    }
    query += ` ORDER BY c.DateAdded DESC`;

    conn.query(query, args, (err, rows) => {
        if (err) {
            console.log("Cached warming failed");
            throw err;
        }

        let mappings = {};

        rows.forEach(element => {
            if (!mappings[element.Owning_UserId]) (mappings[element.Owning_UserId] = {});
            mappings[element.Owning_UserId][element.ContactId] = {}
            mappings[element.Owning_UserId][element.ContactId].ContactId = element.ContactId;
            mappings[element.Owning_UserId][element.ContactId].DateAdded = element.DateAdded;
            mappings[element.Owning_UserId][element.ContactId].ContactType = element.ContactType;
            mappings[element.Owning_UserId][element.ContactId].Username = element.Username;
        });

        Object.keys(mappings).forEach(key => {
            contacts_cache.set(key, mappings[key], 0, (err) => {
                if (err) console.log(err);
            });
        });

        console.log("Cache set", mappings);
    });
}


conn.connect((err) => {
    if (err) throw err;

    conn.query('SELECT 1 + 1 AS solution', function (err, rows, fields) {
        if (err) throw err;
    
        console.log('If the DB is working this will show 2: ', rows[0].solution);

        contacts_cache.flush((err) => {
            if (err) throw err;

            warmCache(null);
        });

        console.log('Cache is ready');
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



let isAuthenticated = function(req, res, next) {
    if (!req.session.username) return res.status(401).contentType("text/plain").end("Not signed in - access denied");
    next();
};



/*
    Checks for
    body.username
    or
    query.username
*/
let sanitizeUsername = function(req, res, next) {
    if (req.body.username) {
        if (!validator.isAlphanumeric(req.body.username)) return res.status(400).contentType("text/plain").end("bad input");
    }
    if (req.query.username) {
        if (!validator.isAlphanumeric(req.query.username)) return res.status(400).contentType("text/plain").end("bad input");
    }
    next();
}



/*
    POST /api/signin/
    Logs an existing user into the webapp
*/
app.post('/api/signin/', sanitizeUsername, function (req, res, next) {
    let username = req.body.username;
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

            req.session.username = username;
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
    Checks for
    body.pubkey
    body.enc_privkey_nonce
    body.enc_privkey
    body.client_sym_kdf_salt
*/
let sanitizeSignup = function(req, res, next) {
    if (!validator.isBase64(req.body.pubkey)) return res.status(400).contentType("text/plain").end("bad input");
    if (!validator.isBase64(req.body.enc_privkey_nonce)) return res.status(400).contentType("text/plain").end("bad input");
    if (!validator.isBase64(req.body.enc_privkey)) return res.status(400).contentType("text/plain").end("bad input");
    if (!validator.isBase64(req.body.client_sym_kdf_salt)) return res.status(400).contentType("text/plain").end("bad input");
    next();
}

/*
    POST /api/signup/
    Creates a new user for the webapp, also logs in automatically
*/
app.post('/api/signup/', sanitizeUsername, sanitizeSignup, function (req, res, next) {

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
                
                req.session.username = username;
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



app.get('/api/signout/', function (req, res, next) {
    res.setHeader('Set-Cookie', cookie.serialize('username', '', {
          path : '/', 
          maxAge: 60 * 60 * 24 * 7 // 1 week in number of seconds
    }));

    req.session.username = null;
    req.session.userId = null;
    return res.json("success");
});



/*
    Checks for
    body.owning_username
    boby.target_username
    body.contact_type
*/
let sanitizeContact = function(req, res, next) {
    if (!validator.isAlphanumeric(req.body.owning_username)) return res.status(400).contentType("text/plain").end("bad input");
    if (!validator.isAlphanumeric(req.body.target_username)) return res.status(400).contentType("text/plain").end("bad input");
    if (!validator.isAlphanumeric(req.body.contact_type)) return res.status(400).contentType("text/plain").end("bad input");
    next();
}

let storeContact = function(contact, callback) {
    conn.query(`SELECT ContactTypeId FROM ContactTypes WHERE ContactType = ?`, [contact.contact_type], (err, rows) => {
        if (err) callback(err, null);
        if (!rows.length) callback("Invalid Contact Type", null);

        const contact_type_id = rows[0].ContactTypeId;

        conn.query(`INSERT INTO Contacts(Owning_UserId, Target_UserId, ContactTypes_ContactTypeId)
                    VALUES (?,?,?)`,
        [contact.owning_id, contact.target_id, contact_type_id], (err, rows) => {
            if (err) return callback(err, null);

            warmCache(contact.owning_id);

            return callback(null, rows.insertId);
        });
    });
};

/*  For creating a new contact as the logged-in user
    POST /api/contacts/
*/
app.post('/api/contacts/', sanitizeContact, isAuthenticated, function (req, res, next) {
    const owning_id = req.userId;
    const target_username = req.body.target_username;
    const contact_type = req.body.contact_type;

    let target_id = null;

    conn.query(`SELECT UserId From Users WHERE Username = ?;`, [target_username], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");
        if (!rows.length) return res.status(500).contentType("text/plain").end("Can't find contact target in DB");

        target_id = rows[0].UserId;

        if (owning_id == target_id) return res.status(400).contentType("text/plain").end("Can't add user as contact to itself");

        storeContact({
            'owning_id' : owning_id,
            'target_id' : target_id,
            'contact_type' : contact_type,
        }, (err, insertId) => {
            if (err) return res.status(500).contentType("text/plain").end("Internal Cache Error");

            return res.json("added contact, id " + insertId);
        });
    });
});




let getContacts = function(userId, callback) {
    contacts_cache.get(userId, (err, data) => {
        if (err) return callback(err, null);
        return callback(null, data);
    });
}

/*  Gets all contacts owned by username
    POST /api/contacts/?username=foo
*/
app.get('/api/contacts/', sanitizeUsername, isAuthenticated, function (req, res, next) {

    let owning_username = req.query.username;

    if (!owning_username) return res.status(400).contentType("text/plain").end("Unable to parse username for getting contacts");

    if (req.username != owning_username) return res.status(403).contentType("text/plain").end("Not signed in as owning user");

    getContacts(req.userId, (err, data) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal Cache Error");

        let results = [];

        if (data) {
            Object.keys(data).forEach(key => {
                results.push({
                    'ContactId' : key,
                    'TargetUsername' : data[key].Username,
                    'DateAdded' : data[key].DateAdded,
                    'ContactType' : data[key].ContactType,
                });
            });
        }

        return res.json(results);
    });
});


/*  Gets the public key owned by username
    GET /api/crypto/pubkey/?username=foo
*/
app.get('/api/crypto/pubkey/', sanitizeUsername, isAuthenticated, function (req, res, next) {

    const owning_username = req.query.username;

    if (!owning_username) return res.status(400).contentType("text/plain").end("Unable to parse username for getting pubkey");

    conn.query(`SELECT c.PubKey FROM UserCredentials c
                INNER JOIN Users u
                ON u.UserId = c.Users_UserId
                WHERE u.Username = ?`,
    [owning_username], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

        if (!rows.length) return res.status(400).contentType("text/plain").end("Username doesn't exist");

        return res.json({
            'pubkey' : rows[0].PubKey,
        });
    });
});



/*  Delete a contact by ContactId
    DELETE /api/contacts/:id/
*/
app.delete('/api/contacts/:id/', isAuthenticated, function (req, res, next) {
    if (!req.params.id) return res.status(400).contentType("text/plain").end("Unable to parse ContactId for deletion");

    const contactId = req.params.id;

    conn.query(`SELECT Owning_UserId FROM Contacts WHERE ContactId = ?`, [contactId], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

        if (!rows.length) return res.status(400).contentType("text/plain").end("ContactId " + contactId + " not found");
        if (rows[0].Owning_UserId != req.userId) return res.status(403).contentType("text/plain").end("Not signed in as owning user");

        conn.query(`DELETE FROM Contacts WHERE ContactId = ?`, [contactId], (err, rows) => {
            if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

            warmCache(req.userId);

            return res.json("deleted contact at id " + contactId);
        });
    });
});



/*
    Checks for
    body.encrypted_body
    body.nonce
*/
let sanitizeMessage = function(req, res, next) {
    if (!validator.isBase64(req.body.encrypted_body)) return res.status(400).contentType("text/plain").end("bad input");
    if (!validator.isBase64(req.body.nonce)) return res.status(400).contentType("text/plain").end("bad input");
    next();
}


/*  For pushing a new direct message to the server
    POST /api/messages/direct/
*/
app.post('/api/messages/direct/', sanitizeMessage, isAuthenticated, function (req, res, next) {
    if (!validator.isAlphanumeric(req.body.target_username)) return res.status(400).contentType("text/plain").end("bad input");

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

            getMessages(req.userId, target_username, req.username, (err, data) => {
                if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

                longpoll.publishToId("/api/messages/direct/lp/:id/", (req.username + "_" + target_username), data);
                longpoll.publishToId("/api/messages/direct/lp/:id/", (target_username + "_" + req.username), data);
            });

            return res.json("sent message to " + target_username);
        });
    });
});



let longpoll = require("express-longpoll")(app);

// GET /api/message/direct/lp/usernameofcaller_usernameoftarget
longpoll.create("/api/messages/direct/lp/:id/", (req, res, next) => {
    if (!req.session.username) return res.status(401).contentType("text/plain").end("Not signed in - access denied");

    if (req.params.id.split("_")[0] != req.username) return res.status(400).contentType("text/plain").end("Bad username caller");
    if (!validator.isAlphanumeric(req.params.id.split("_")[1])) res.status(400).contentType("text/plain").end("Bad username target");

    console.log("Added longpoll with label " + req.params.id);
    req.id = req.params.id;
    next();
});



let getMessages = function(userId, target_username, username, callback) {

    const query = `SELECT m.DirectMessageId, m.EncryptedText, u.Username SenderUsername, m.Nonce, m.DateSent
        FROM DirectMessages m
        INNER JOIN Users u
        ON m.Sender_UserId = u.UserId
        WHERE (m.Receiver_UserId = ? AND m.Sender_UserId IN (SELECT UserId FROM Users WHERE Username = ?))
        OR (m.Receiver_UserId IN (SELECT UserId FROM Users WHERE Username = ?) AND m.Sender_UserId = ?)
        ORDER BY m.DateSent DESC`;
    let args = [userId, target_username, target_username, userId];

    conn.query(query, args, (err, rows) => {
        if (err) return callback(err, null);

        let results = [];

        rows.forEach(element => {
            results.push({
                'DirectMessageId' : element.DirectMessageId,
                'EncryptedText' : element.EncryptedText,
                'SenderUsername' : element.SenderUsername,
                'ReceiverUsername' : username,
                'Nonce' : element.Nonce,
                'DateSent' : element.DateSent,
            });
        });

        callback(null, results);
    });
}



/*
    For getting all back-and-forth direct messages between 2 users
    GET /api/messages/direct/?toandfrom=foo
*/
app.get('/api/messages/direct/', isAuthenticated, function (req, res, next) {
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
        query = `SELECT m.DirectMessageId, m.EncryptedText, u.Username SenderUsername, m.DateSent
        FROM DirectMessages m
        INNER JOIN Users u
        ON m.Sender_UserId = u.UserId
        WHERE (m.Receiver_UserId = ? AND m.Sender_UserId IN (SELECT UserId FROM Users WHERE Username = ?))
        OR (m.Receiver_UserId IN (SELECT UserId FROM Users WHERE Username = ?) AND m.Sender_UserId = ?)`;
        args = [req.userId, from_username, to_username, req.userId]
    } else if (to_username) {
        query = `SELECT m.DirectMessageId, m.EncryptedText, u.Username SenderUsername, m.DateSent
        FROM DirectMessages m
        INNER JOIN Users u
        ON m.Sender_UserId = u.UserId
        WHERE m.Receiver_UserId IN (SELECT UserId FROM Users WHERE Username = ?) AND m.Sender_UserId = ?`;
        args = [to_username, req.userId];
    } else {
        query = `SELECT m.DirectMessageId, m.EncryptedText, u.Username SenderUsername, m.Nonce, m.DateSent
        FROM DirectMessages m
        INNER JOIN Users u
        ON m.Sender_UserId = u.UserId
        WHERE m.Receiver_UserId = ? AND m.Sender_UserId IN (SELECT UserId FROM Users WHERE Username = ?)`;
        args = [req.userId, from_username];
    }
    query += " ORDER BY m.DateSent DESC";


    conn.query(query, args, (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

        let results = [];

        rows.forEach(element => {
            results.push({
                'DirectMessageId' : element.DirectMessageId,
                'EncryptedText' : element.EncryptedText,
                'SenderUsername' : element.SenderUsername,
                'ReceiverUsername' : req.username,
                'Nonce' : element.Nonce,
                'DateSent' : element.DateSent,
            });
        });

        return res.json(results);
    });
});




/*  Gets all the usernames in the system
    GET /api/users/
*/
app.get('/api/users/', isAuthenticated, function (req, res, next) {

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




/*  For getting info about a group session
    GET /api/group/session/:id/
*/
app.get('/api/group/session/:id/', isAuthenticated, function (req, res, next) {

    let sessionId = parseInt(req.params.id);

    if (isNaN(sessionId)) return res.status(400).contentType("text/plain").end("Did not get required data");

    conn.query(`SELECT s.SessionId, s.SessionType, s.SessionStartDate, u.Username, us.EncryptedSessionKey, us.Nonce
                FROM UserToSession us
                INNER JOIN Sessions s
                    ON us.Sessions_SessionId = s.SessionId
                INNER JOIN Users u
                    ON s.Owner_UserId = u.UserId
                WHERE us.Users_UserId = ? AND s.SessionId = ?`,
    [req.userId, sessionId], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");
        if (!rows.length) return res.status(403).contentType("text/plain").end("Session doesn't exist or user does not have access");

        const session = rows[0];

        return res.json({
            'SessionId' : session.SessionId,
            'SessionType' : session.SessionType,
            'SessionStartDate' : session.SessionStartDate,
            'OwnerUsername' : session.Username,
            'EncryptedSessionKey' : session.EncryptedSessionKey,
            'Nonce' : session.Nonce,
        });
    });
});



/*  For getting the usernames in a particular session
    GET /api/group/session/:id/usernames/
*/
app.get('/api/group/session/:id/usernames/', isAuthenticated, function (req, res, next) {
    let sessionId = parseInt(req.params.id);

    if (isNaN(sessionId)) return res.status(400).contentType("text/plain").end("Did not get required data");

    conn.query(`SELECT Users_UserId, Username FROM UserToSession
                INNER JOIN Users
                    ON Users_UserId = UserId
                WHERE Sessions_SessionId = ?`,
    [sessionId], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

        let accepted = false;
        let users = [];

        rows.forEach(element => {
            if (element.Username == req.username) {
                accepted = true;
            }
            users.push({
                'UserId' : element.Users_UserId,
                'Username' : element.Username
            });
        });

        if (accepted) {
            return res.json(users);
        }

        return res.status(403).contentType("text/plain").end("User not a part of this session");
    });
});




/*  For getting the group sessions the logged-in user is a part of
    GET /api/group/session/
*/
app.get('/api/group/session/', isAuthenticated, function (req, res, next) {

    conn.query(`SELECT s.SessionId, s.SessionType, s.SessionStartDate, s.SessionName, u.Username, us.EncryptedSessionKey, us.Nonce, uc.PubKey
                FROM UserToSession us
                INNER JOIN Sessions s
                    ON us.Sessions_SessionId = s.SessionId
                INNER JOIN Users u
                    ON s.Owner_UserId = u.UserId
                INNER JOIN UserCredentials uc
                    ON uc.Users_UserId = s.Owner_UserId
                WHERE us.Users_UserId = ?;`,
    [req.userId], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

        let sessions = [];

        rows.forEach(element => {
            sessions.push({
                'SessionId' : element.SessionId,
                'SessionName' : element.SessionName,
                'SessionType' : element.SessionType,
                'SessionStartDate' : element.SessionStartDate,
                'OwnerUsername' : element.Username,
                'PubKey' : element.PubKey,
                'EncryptedSessionKey' : element.EncryptedSessionKey,
                'Nonce' : element.Nonce,
            });
        });

        return res.json(sessions);
    });
});




/*
    Checks for
    body.encrypted_session_key
    body.nonce
*/
let sanitizeEncryptedSessionKey = function(req, res, next) {
    if (!validator.isBase64(req.body.encrypted_session_key)) return res.status(400).contentType("text/plain").end("bad input");
    if (!validator.isBase64(req.body.nonce)) return res.status(400).contentType("text/plain").end("bad input");
    next();
}


/*  Adds a new user to an existing group session
    POST /api/group/session/:id/adduser/
*/
app.post('/api/group/session/:id/adduser/', sanitizeEncryptedSessionKey, isAuthenticated, function (req, res, next) {
    let encrypted_session_key = req.body.encrypted_session_key;
    let nonce = req.body.nonce;

    if (!validator.isAlphanumeric(req.body.username_to_add)) return res.status(400).contentType("text/plain").end("bad input");

    let username_to_add = req.body.username_to_add;
    let sessionId = parseInt(req.params.id);

    if ((!encrypted_session_key) || (!nonce) || (!username_to_add) || (isNaN(sessionId))) return res.status(400).contentType("text/plain").end("Did not get required data");

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
            if (rows[0].Owner_UserId != req.userId) return res.status(403).contentType("text/plain").end("Not the owner of this group session");

            conn.query(`INSERT IGNORE INTO UserToSession(Sessions_SessionId, Users_UserId, EncryptedSessionKey, Nonce)
                        VALUES (?,?,?,?)`,
            [sessionId, userId_to_add, encrypted_session_key, nonce], (err, rows) => {
                if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");
                if (!rows.affectedRows) return res.status(400).contentType("text/plain").end("Target user is already in session");

                return res.json("Added user " + username_to_add + " to session with id " + sessionId);
            });
        });
    });
});




/*  For starting a new group message session
    Calling user becomes the owner of the session
    POST /api/group/session/
*/
app.post('/api/group/session/', sanitizeEncryptedSessionKey, isAuthenticated, function (req, res, next) {
    let encrypted_session_key = req.body.encrypted_session_key;
    let nonce = req.body.nonce;

    let session_name;
    if (req.body.session_name) {
        if (!validator.isAlphanumeric(req.body.session_name)) return res.status(400).contentType("text/plain").end("bad input");
        session_name = req.body.session_name;
    } else {
        session_name = "";
    }

    if ((!encrypted_session_key) || (!nonce)) return res.status(400).contentType("text/plain").end("Did not get required data");

    conn.beginTransaction((err) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

        conn.query(`INSERT INTO Sessions(SessionType, Owner_UserId, SessionName)
                    VALUES (?, ?, ?)`,
        ['group', req.userId, session_name], (err, rows) => {
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

                    return res.json({
                        "sessionId" : sessionId,
                    });
                });
            });
        });
    });
});





// GET /api/message/direct/lp/groupmessageid
longpoll.create("/api/messages/group/lp/:id/", (req, res, next) => {
    if (!req.session.username) return res.status(401).contentType("text/plain").end("Not signed in - access denied");
    if (!validator.isNumeric(req.params.id)) return res.status(400).contentType("text/plain").end("bad input");

    conn.query(`SELECT Users_UserId
                FROM UserToSession
                WHERE Sessions_SessionId = ? AND Users_UserId = ?`,
    [req.params.id, req.userId], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");
        if (!rows.length) return res.status(403).contentType("text/plain").end("Session does not exist or user is not part of it");

        console.log("Added group longpoll with session " + req.params.id);
        req.id = req.params.id;
        next();
    });
});




/*  For pushing a new group message to the server
    POST /api/messages/group/:id/
*/
app.post('/api/messages/group/:id/', sanitizeMessage, isAuthenticated, function (req, res, next) {
    const sessionId = req.params.id;

    let encrypted_body = req.body.encrypted_body;
    let nonce = req.body.nonce;

    if ((!sessionId) || (!encrypted_body) || (!nonce)) return res.status(400).contentType("text/plain").end("Did not get required data");

    let senderId = req.userId;

    conn.query(`SELECT Users_UserId
                From UserToSession
                WHERE Sessions_SessionId = ? AND Users_UserId = ?;`,
    [sessionId, senderId], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");
        if (!rows.length) return res.status(403).contentType("text/plain").end("User is not part of this session");

        conn.query(`INSERT INTO GroupMessages(Sessions_SessionId, EncryptedText, Sender_UserId, Nonce) VALUES (?,?,?,?)`,
        [sessionId, encrypted_body, senderId, nonce], (err, rows) => {
            if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

            getGroupMessages(sessionId, (err, data) => {
                if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

                longpoll.publishToId("/api/messages/group/lp/:id/", sessionId, data);
            });

            return res.json("sent message to group session " + sessionId);
        });
    });
});




let getGroupMessages = function(sessionId, callback) {
    conn.query(`SELECT gm.GroupMessageId, u.Username, gm.EncryptedText, gm.Nonce, gm.DateSent
                    FROM GroupMessages gm
                    INNER JOIN Users u
                        ON gm.Sender_UserID = u.UserId
                    WHERE gm.Sessions_SessionId = ?
                    ORDER BY gm.DateSent DESC;`,
    [sessionId], (err, rows) => {
        if (err) return callback(err, null);

        let messages = [];

        rows.forEach(element => {
            messages.push({
                'GroupMessageId' : element.GroupMessageId,
                'Username' : element.Username,
                'EncryptedText' : element.EncryptedText,
                'Nonce' : element.Nonce,
                'DateSent' : element.DateSent,
            });
        });

        callback(null, messages);
    });
};


/*  For the group messages attached to a group session
    GET /api/messages/group/:id/
*/
app.get('/api/messages/group/:id/', isAuthenticated, function (req, res, next) {
    const sessionId = req.params.id;

    if (!sessionId) return res.status(400).contentType("text/plain").end("Did not get required sessionId");

    conn.query(`SELECT Users_UserId
                FROM UserToSession
                WHERE Sessions_SessionId = ? AND Users_UserId = ?`,
    [sessionId, req.userId], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");
        if (!rows.length) return res.status(403).contentType("text/plain").end("Session does not exist or user is not part of it");
    
        conn.query(`SELECT gm.GroupMessageId, u.Username, gm.EncryptedText, gm.Nonce, gm.DateSent
                    FROM GroupMessages gm
                    INNER JOIN Users u
                        ON gm.Sender_UserID = u.UserId
                    WHERE gm.Sessions_SessionId = ?
                    ORDER BY gm.DateSent DESC;`,
        [sessionId], (err, rows) => {
            if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

            let messages = [];

            rows.forEach(element => {
                messages.push({
                    'GroupMessageId' : element.GroupMessageId,
                    'Username' : element.Username,
                    'EncryptedText' : element.EncryptedText,
                    'Nonce' : element.Nonce,
                    'DateSent' : element.DateSent,
                });
            });

            return res.json(messages);
        });
    });
});



/*
    Checks for
    body.encrypted_encryption_key
    body.encrypted_encryption_key_nonce
*/
let sanitizeFileEncryptionHeader = function(req, res, next) {
    if (!validator.isBase64(req.body.encrypted_encryption_key)) return res.status(400).contentType("text/plain").end("bad input");
    if (!validator.isBase64(req.body.encrypted_encryption_key_nonce)) return res.status(400).contentType("text/plain").end("bad input");
    next();
}

/*
    Shares an uploaded file with another user
*/
app.post('/api/file/share/', sanitizeFileEncryptionHeader, isAuthenticated, (req, res, next) => {

    if (!validator.isAlphanumeric(req.body.fileId)) return res.status(400).contentType("text/plain").end("bad input");
    if (!validator.isAlphanumeric(req.body.target_username)) return res.status(400).contentType("text/plain").end("bad input");
    let fileId = req.body.fileId;
    let target_username = req.body.target_username;

    let encrypted_encryption_key = req.body.encrypted_encryption_key;
    let encrypted_encryption_key_nonce = req.body.encrypted_encryption_key_nonce;

    conn.query(`SELECT UserId FROM Users WHERE Username = ?`, [target_username], (err, rows) => {
        if (err) res.status(500).contentType("text/plain").end("Internal MySQL Error");
        if (!rows.length) res.status(400).contentType("text/plain").end("Target username doesn't exist");

        let target_userId = rows[0].UserId;

        conn.query(`INSERT INTO FileEncryptionHeaderStore(Files_FileId, Sharer_UserId, Sharee_UserId, Nonce, EncryptedEncryptionKey) VALUES (?,?,?,?,?)`,
        [fileId, req.userId, target_userId, encrypted_encryption_key_nonce, encrypted_encryption_key], (err, rows) => {
            if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

            return res.json("Successfully shared file with " + target_username);
        });
    });
});



/*
    Get list of file accessible to logged-in user
*/
app.get('/api/file/share/', isAuthenticated, (req, res, next) => {

    conn.query(`SELECT hs.Files_FileId, u.Username, hs.Date, f.FileName
                FROM FileEncryptionHeaderStore hs
                INNER JOIN Users u
                    ON hs.Sharer_UserId = u.UserId
                INNER JOIN Files f
                    ON f.FileId = hs.Files_FileId
                WHERE Sharee_UserId = ?
                ORDER BY hs.Date DESC`,
    [req.userId], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

        let shared_files = [];

        rows.forEach(element => {
            shared_files.push({
                'FileId' : element.Files_FileId,
                'FileName' : element.FileName,
                'SharerUsername' : element.Username,
                'Date' : element.Date,
            });
        });

        return res.json(shared_files);
    });
});


let escapeFilePath = function(req, res, next) {
    req.file.path = validator.escape(req.file.path);
    next();
}



/*
    Uploads a profile picture for the current user
*/
app.post('/api/profilepicture/', escapeFilePath, isAuthenticated, upload_pro.single("profile_picture"), (req, res, next) => {
    let filePath  = req.file.path;

    conn.query(`UPDATE Users
                SET ProfilePicturePath = ?
                WHERE UserId = ?`,
    [filePath, req.userId], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

        return res.json("Uploaded profile picture to user with id " + req.userId);
    });
});


/*
    Downloads a profile picture for the username
*/
app.get('/api/profileture/:username/', isAuthenticated, (req, res, next) => {

    if (!validator.isAlphanumeric(req.params.username)) return res.status(400).contentType("text/plain").end("bad input");

    const username = req.params.username;

    conn.query(`SELECT ProfilePicturePath
                FROM Users
                WHERE username = ?`,
    [username], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");
        if (!rows.length) return res.status(404).contentType("text/plain").end("User doesn't exist");
        if (!rows.ProfilePicturePath) return res.status(404).contentType("text/plain").end("User doesn't have a profile picture");

        const rawPath = validator.unescape(rows[0].Path);

        return res.sendFile(rawPath);
    })
});



/*
    Uploads a new file to the system
*/
app.post('/api/file/upload/', upload_enc.single("encrypted_file"), escapeFilePath, sanitizeFileEncryptionHeader, isAuthenticated, (req, res, next) => {

    let filePath = req.file.path;

    if (!validator.isAlphanumeric(req.body.file_name)) return res.status(400).contentType("text/plain").end("bad input");
    if (!validator.isBase64(req.body.nonce)) return res.status(400).contentType("text/plain").end("bad input");

    let file_name = req.body.file_name;
    let file_nonce = req.body.nonce;

    let encrypted_encryption_key = req.body.encrypted_encryption_key;
    let encrypted_encryption_key_nonce = req.body.encrypted_encryption_key_nonce;


    conn.beginTransaction((err) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

        conn.query(`INSERT INTO Files(FileName, Path, Nonce, FileOwner_UserId) VALUES (?,?,?,?)`,
        [file_name, filePath, file_nonce, req.userId], (err, rows) => {
            if (err) {
                conn.rollback(() => {});
                return res.status(500).contentType("text/plain").end("Internal MySQL Error");
            }

            const fileId = rows.insertId;

            conn.query(`INSERT INTO FileEncryptionHeaderStore(Files_FileId, Sharer_UserId, Sharee_UserId, Nonce, EncryptedEncryptionKey) VALUES (?,?,?,?,?)`,
            [fileId, req.userId, req.userId, encrypted_encryption_key_nonce, encrypted_encryption_key], (err, rows) => {
                if (err) {
                    conn.rollback(() => {});
                    return res.status(500).contentType("text/plain").end("Internal MySQL Error");
                }

                conn.commit((err) => {
                    if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");

                    return res.json({'fileId' : fileId});
                });
            });
        });
    });
});



/*
    Gets the blob of an encrypted file
*/
app.get('/api/file/:id/', isAuthenticated, (req, res, next) => {

    let fileId = req.params.id;

    conn.query(`SELECT 1
                FROM FileEncryptionHeaderStore
                WHERE Files_FileId = ? AND Sharee_UserId = ?`,
    [fileId, req.userId], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");
        if (!rows.length) return res.status(403).contentType("text/plain").end("User does not have permissions on this file");

        conn.query(`SELECT Path FROM Files WHERE FileId = ?`, [fileId], (err, rows) => {
            if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");
            if (!rows.length) return res.status(400).contentType("text/plain").end("File does not exist");

            const path = validator.unescape(rows[0].Path);

            return res.sendFile(path);
        });
    });
});



/*
    Gets the header w/ associated metadata and crypto data of a file
*/
app.get('/api/file/:id/header/', isAuthenticated, (req, res, next) => {

    let fileId = req.params.id;

    conn.query(`SELECT hs.Nonce EncryptedEncryptionKeyNonce, hs.EncryptedEncryptionKey, uc.PubKey, f.FileName, f.Nonce
                FROM FileEncryptionHeaderStore hs
                INNER JOIN UserCredentials uc
                    ON uc.Users_UserId = hs.Sharer_UserId
                INNER JOIN Files f
                    ON f.FileId = hs.Files_FileId
                WHERE hs.Files_FileId = ? AND hs.Sharee_UserId = ?`,
    [fileId, req.userId], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");
        if (!rows.length) return res.status(403).contentType("text/plain").end("User does not have permissions on this file");

        res.json({
            'FileName' : rows[0].FileName,
            'Nonce' : rows[0].Nonce,
            'EncryptedEncryptionKeyNonce' : rows[0].EncryptedEncryptionKeyNonce,
            'EncryptedEncryptionKey' : rows[0].EncryptedEncryptionKey,
            'PubKey' : rows[0].PubKey,
        });
    });
});



/*
    Saves user setting
*/
app.post('/api/settings/', isAuthenticated, (req, res, next) => {
    req.body.colorA = validator.escape(req.body.colorA);
    req.body.colorB = validator.escape(req.body.colorB);
    req.body.colorC = validator.escape(req.body.colorC);
    req.body.colorD = validator.escape(req.body.colorD);
    if (!validator.isNumeric(req.body.turn_speed)) return res.status(400).contentType("text/plain").end("bad input");
    if (!validator.isNumeric(req.body.move_speed)) return res.status(400).contentType("text/plain").end("bad input");
    if (!validator.isNumeric(req.body.font_size)) return res.status(400).contentType("text/plain").end("bad input");

    conn.query(`REPLACE INTO UserSettings(Users_UserId, ColorA, ColorB, ColorC, ColorD, TurnSpeed, MoveSpeed, FontSize)
                VALUES (?,?,?,?,?,?,?,?)`,
    [req.userId, req.body.colorA, req.body.colorB, req.body.colorC, req.body.colorD, req.body.turn_speed, req.body.move_speed, req.body.font_size],
    (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");
        
        return res.json("Saved settings");
    })
});



/*
    Gets saved user setting
*/
app.get('/api/settings/', isAuthenticated, (req, res, next) => {
    conn.query(`SELECT *
                FROM UserSettings
                WHERE Users_UserId = ?`,
    [req.userId], (err, rows) => {
        if (err) return res.status(500).contentType("text/plain").end("Internal MySQL Error");
        if (!rows.length) return res.status(404).contentType("text/plain").end("User does not have saved settings");

        return res.json({
            'colorA' : rows[0].ColorA,
            'colorB' : rows[0].ColorB,
            'colorC' : rows[0].ColorC,
            'colorD' : rows[0].ColorD,
            'turn_speed' : rows[0].TurnSpeed,
            'move_speed' : rows[0].MoveSpeed,
            'font_size' : rows[0].FontSize,
        });
    })
})




const http = require('http');
const PORT = 3001;

http.createServer(app).listen(PORT, function (err) {
    if (err) console.log(err);
    else console.log("HTTP server on http://localhost:%s", PORT);
});
