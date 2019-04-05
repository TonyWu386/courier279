# Courier279 REST API Documentation

Please note that the nature of the application's encryption scheme means that most of the example ``` curl ``` calls may work for a given logged in user, but output non-human readable encrypted data. Cases where cryptographic information is required beyond what a given API call returns are explicitly noted in the description.

## User Management APIs

### Create

Sign-in:

- Description: Logs an existing user into the web application by setting cookies and returning required information required by the cryptographic scheme.
- request: `POST /api/signin/`
    - content-type: `application/json`
    - body: object
      - username: (string) user to login as
      - password: (string) hashed password to attempt
- response: 200
    - content-type: `application/json`
    - body: object
      - ClientSymKdfSalt: (string) Symmetric key fpr the client. Encrypted.
      - PubKey: (string) Public key for the user.
      - EncryptedPrivKey: (string) User's private key. Encrypted.
      - EncryptedPrivKeyNonce: (string) Nonce for User's private key.
- response: 400
    - content-type: `text/plain`
    - body: "bad input"
- response: 401
    - content-type: `text/plain`
    - body: "access denied"
- response: 500
    - content-type: `text/plain`
    - body: "Internal MySQL Error"

``` 
$ curl -X POST 
       -H "Content-Type: `application/json`" 
       -d '{"username":"Test","password":"SampleEncryptedPassword"}'
       https://www.c279.ml/api/signin/
```

- Additional Notes: Most of returned information is encrypted and unusable without further operations. Returns 400 codes if the username is not alphanumeric. 500 codes are not expected during normal operation and indicate server issues.

Sign-up:

- Description: Create a new user for the application and logs in
- request: `POST /api/signup/`
    - content-type: `application/json`
    - body: object
      - username: (string) user to login as
      - password: (string) hashed password to use
      - pubkey: (string) public key for the user
      - enc_privkey: (string) encrypted private key
      - enc_privkey_nonce: (string) nonce for private key
      - client_sym_kdf_salt: (string) salt for client symmetric key
- response: 200
    - content-type: `application/json`
    - body: "user " + username + " signed up"
- response: 400
    - content-type: `text/plain`
    - body: "bad input"
- response: 400
    - content-type: `text/plain`
    - body: "Did not get required crypt data"
- response: 409
    - content-type: `text/plain`
    - body: "username " + given_username + " already exists"
- response: 500
    - content-type: `text/plain`
    - body: "Internal MySQL Error"

``` 
$ curl -X POST 
       -H "Content-Type: `application/json`" 
       -d '{"username":"Test","password":"SampleEncryptedPassword","pubkey":"userspublickey","enc_privkey": "private","enc_privkey_nonce":"salty","client_sym_kdf_salt":"kdfsalt"}'
       https://www.c279.ml/api/signup/
```

- Additional Notes: Most of returned information is encrypted and unusable without further operations. Returns 400 codes if the username is not alphanumeric, or if there is missing information required for cryptography. 500 codes are not expected during normal operation and indicate server issues.

### Read

Signout:

- Description: Signout from the app
- request: `GET /api/signout/`
    - content-type: `application/json`
- response: 200
    - content-type: `application/json`
    - body: "success"

``` 
$ curl -X GET 
       -H "Content-Type: `application/json`" 
       https://www.c279.ml/api/signout/
```

- Additional Notes: None

## Contact APIs

### Create

Make a contact:

- Description: As a logged in user, add a contact to your list
- request: `POST /api/contacts/`
    - content-type: `application/json`
    - body: object
      - owning_username: (string) user to add contact for
      - target_username: (string) user to add
      - contact_type: (string) type of contact. Only 'friend' supported, currently
- response: 200
    - content-type: `application/json`
    - body: "added contact, id " + newId
- response: 400
    - content-type: `text/plain`
    - body: "bad input"
- response: 400
    - content-type: `text/plain`
    - body: "Can't add user as contact to itself"
- response: 401
    - content-type: `text/plain`
    - body: "Not signed in - access denied"
- response: 500
    - content-type: `text/plain`
    - body: "Internal MySQL Error"
- response: 500
    - content-type: `text/plain`
    - body: "Internal Cache Error"
- response: 500
    - content-type: `text/plain`
    - body: "Can't find contact target in DB"

``` 
$ curl -X POST 
       -H "Content-Type: `application/json`" 
       -d '{"owning_username":"Test","target_username":"buddy","contact_type":"friend"}'
       https://www.c279.ml/api/contacts/
```

- Additional Notes: Returns 400 codes if some field is not alphanumeric or is otherwise unacceptable. 500 codes are not expected during normal operation and indicate server issues. Contact_type only recognizes the 'friend" type.

### Read

Get Contacts:

- Description: As a logged in user, get your contacts list
- request: `GET /api/contacts/[?username=foo]`
    
- response: 200
    - content-type: `application/json`
    - body: list of object with following fields
      - ContactId: (string) ID of contact
      - TargetUsername: (string) Contact username.
      - DateAdded: (Date) Date added.
      - ContactType: (string) Type of contact relative to caller.
- response: 400
    - content-type: `text/plain`
    - body: "bad input"
- response: 400
    - content-type: `text/plain`
    - body: "Unable to parse username for getting contacts"
- response: 401
    - content-type: `text/plain`
    - body: "Not signed in - access denied"
- response: 403
    - content-type: `text/plain`
    - body: "Not signed in as owning user"
- response: 500
    - content-type: `text/plain`
    - body: "Internal Cache Error"

``` 
$ curl -X GET 
       -H "Content-Type: `application/json`" 
       https://www.c279.ml/api/contacts/?username=awesomemccoolname
```

- Additional Notes: Returns 400 codes if some field is not alphanumeric or is otherwise unacceptable. 500 codes are not expected during normal operation and indicate server issues.

### Delete

Delete a Contact:

- Description: As a logged in user, delete someone from your contacts list
- request: `DELETE /api/contacts/:id/`
    
- response: 200
    - content-type: `application/json`
    - body: "Deleted contact at id " + contactId
- response: 400
    - content-type: `text/plain`
    - body: "unable to parse ContactId for deletion"
- response: 400
    - content-type: `text/plain`
    - body: "Unable to parse username for getting contacts"
- response: 400
    - content-type: `text/plain`
    - body: "ContactId " + contactId + " not found"
- response: 401
    - content-type: `text/plain`
    - body: "Not signed in - access denied"
- response: 403
    - content-type: `text/plain`
    - body: "Not signed in as owning user"
- response: 500
    - content-type: `text/plain`
    - body: "Internal MySQL Error"

``` 
$ curl -X DELETE 
       -H "Content-Type: `application/json`" 
       https://www.c279.ml/api/contacts/?username=awesomemccoolname
```

- Additional Notes: Returns 400 codes if some field is not alphanumeric or is otherwise unacceptable. 500 codes are not expected during normal operation and indicate server issues.

## Message APIs

### Create

Make a direct message:

- Description: As a logged in user, send a direct message
- request: `POST /api/messages/direct/`
    - content-type: `application/json`
    - body: object
      - ecnrypted_body: (string) Encrypted message body
      - target_username: (string) user to send to
      - nonce: (string) Nonce for use with message
- response: 200
    - content-type: `application/json`
    - body: "sent message to " + target_username
- response: 400
    - content-type: `text/plain`
    - body: "bad input"
- response: 400
    - content-type: `text/plain`
    - body: "Did not get required data"
- response: 401
    - content-type: `text/plain`
    - body: "Not signed in - access denied"
- response: 500
    - content-type: `text/plain`
    - body: "Internal MySQL Error"
- response: 500
    - content-type: `text/plain`
    - body: "Can't find target in DB"

``` 
$ curl -X POST 
       -H "Content-Type: `application/json`" 
       -d '{"target_username":"Test","encrypted_body":"encrypted","nonce":"salty"}'
       https://www.c279.ml/api/messages/direct/
```

- Additional Notes: Returns 400 codes if some field is not alphanumeric or is missing key information. 500 codes are not expected during normal operation and indicate server issues. This will trigger responses to any relevant client waiting on direct message longpolls

Make a group message and send:

- Description: As a logged in user, send a group message to :id
- request: `POST /api/messages/group/:id/`
    - content-type: `application/json`
    - body: object
      - ecnrypted_body: (string) Encrypted message body
      - nonce: (string) Nonce for use with message
- response: 200
    - content-type: `application/json`
    - body: "sent message to group session " + :id
- response: 400
    - content-type: `text/plain`
    - body: "bad input"
- response: 400
    - content-type: `text/plain`
    - body: "Did not get required data"
- response: 401
    - content-type: `text/plain`
    - body: "Not signed in - access denied"
- response: 403
    - content-type: `text/plain`
    - body: "User is not part of this session"
- response: 500
    - content-type: `text/plain`
    - body: "Internal MySQL Error"

``` 
$ curl -X POST 
       -H "Content-Type: `application/json`" 
       -d '{"encrypted_body":"encrypted","nonce":"salty"}'
       https://www.c279.ml/api/messages/group/1337/
```

- Additional Notes: Returns 400 codes if some field is not alphanumeric or is missing key information. 500 codes are not expected during normal operation and indicate server issues. This will trigger responses to any relevant client waiting on message longpolls

### Read

Get Direct Messages:

- Description: As a logged in user, get all direct messages between another user. This version does not do long polling and is only suitable to be used if one wishes to get a static view of messages immediately.
- request: `GET /api/messages/direct/[?from=foo|?to=foo|?toandfrom=foo]`
    
- response: 200
    - content-type: `application/json`
    - body: list of object with following fields
      - DirectMessageId: (string) ID of message
      - SenderUsername: (string) username of the sender.
      - RecieverUsername: (string) username of receiver.
      - EncryptedText: (string) Encrypted message body.
      - DateSent: (Date) Date added.
      - Nonce: (string) Nonce for text.
- response: 400
    - content-type: `text/plain`
    - body: "Incompatible combination of args"
- response: 400
    - content-type: `text/plain`
    - body: "Unable to parse username for getting messages"
- response: 401
    - content-type: `text/plain`
    - body: "Not signed in - access denied"
- response: 500
    - content-type: `text/plain`
    - body: "Internal MySQL Error"

``` 
$ curl -X GET 
       -H "Content-Type: `application/json`" 
       https://www.c279.ml/api/messages/direct/?from=awesomemccoolname
```

- Additional Notes: Returns 400 codes if some field is not alphanumeric or is otherwise unacceptable. 500 codes are not expected during normal operation and indicate server issues.
The from, to and toandfrom queries are mutually exclusive and a request using more than one of these will be ignored. Note that the object returned is unreadable without the corresponding keys.

Get Direct Messages (Long Polling):

- Description: As a logged in user, get all direct messages between another user. This version supports long polling and is generally preferred.
- request: `GET /api/messages/direct/lp/:id`
    
- response: 200
    - content-type: `application/json`
    - body: list of object with following fields
      - DirectMessageId: (string) ID of message
      - SenderUsername: (string) username of the sender.
      - RecieverUsername: (string) username of receiver.
      - EncryptedText: (string) Encrypted message body.
      - DateSent: (Date) Date added.
      - Nonce: (string) Nonce for text.
- response: 400
    - content-type: `text/plain`
    - body: "Bad username caller"
- response: 400
    - content-type: `text/plain`
    - body: "Bad username target"
- response: 401
    - content-type: `text/plain`
    - body: "Not signed in - access denied"
- response: 500
    - content-type: `text/plain`
    - body: "Internal MySQL Error"

``` 
$ curl -X GET 
       -H "Content-Type: `application/json`" 
       https://www.c279.ml/api/messages/direct/callername_targetname
```

- Additional Notes: Returns 400 codes if some field is not alphanumeric or is otherwise unacceptable. 500 codes are not expected during normal operation and indicate server issues.
The id is constructed as usernameofcaller_usernameoftarget. Note that the object returned is unreadable without the corresponding keys.

Get Group Messages:

- Description: As a logged in user, get group messages from a group they belong to with id :id
- request: `GET /api/messages/group/:id/`
    
- response: 200
    - content-type: `application/json`
    - body: list of object with following fields
      - GroupMessageId: (string) ID of message
      - Username: (string) username of the poster.
      - EncryptedText: (string) Encrypted message body.
      - DateSent: (Date) Date added.
      - Nonce: (string) Nonce for text.
- response: 400
    - content-type: `text/plain`
    - body: "Did not get required sessionId"
- response: 401
    - content-type: `text/plain`
    - body: "Not signed in - access denied"
- response: 403
    - content-type: `text/plain`
    - body: "Session does not exist or user is not part of it"
- response: 500
    - content-type: `text/plain`
    - body: "Internal MySQL Error"

``` 
$ curl -X GET 
       -H "Content-Type: `application/json`" 
       https://www.c279.ml/api/messages/group/1337/
```

- Additional Notes: Returns 400 codes if some field is not alphanumeric or is otherwise unacceptable. 500 codes are not expected during normal operation and indicate server issues.
The user should be part of the session. Note that the object returned is unreadable without the corresponding keys.

Get Group Messages (Long Polling):

- Description: As a logged in user, get all group messages in group. This version supports long polling and is generally preferred.
- request: `GET /api/messages/group/lp/:id`
    
- response: 200
    - content-type: `application/json`
    - body: list of object with following fields
      - GroupMessageId: (string) ID of message
      - Username: (string) username of poster.
      - EncryptedText: (string) Encrypted message body.
      - DateSent: (Date) Date added.
      - Nonce: (string) Nonce for text.
- response: 400
    - content-type: `text/plain`
    - body: "bad input"
- response: 401
    - content-type: `text/plain`
    - body: "Not signed in - access denied"
- response: 403
    - content-type: `text/plain`
    - body: "Session does not exist or user is not part of it"
- response: 500
    - content-type: `text/plain`
    - body: "Internal MySQL Error"

``` 
$ curl -X GET 
       -H "Content-Type: `application/json`" 
       https://www.c279.ml/api/messages/group/lp/1337/
```

- Additional Notes: Returns 400 codes if some field is not alphanumeric or is otherwise unacceptable. 500 codes are not expected during normal operation and indicate server issues.
Note that the object returned is unreadable without the corresponding keys.

## Cryptographic APIs

### Read

Get Public Key:

- Description: Gets the public key owned by username
- request: `GET /api/crypto/pubkey/[?username=bar]`
    
- response: 200
    - content-type: `application/json`
    - body: object
      - pubkey: (string) user's public key.
- response: 400
    - content-type: `text/plain`
    - body: "bad input"
- response: 400
    - content-type: `text/plain`
    - body: "username doesn't exist"
- response: 400
    - content-type: `text/plain`
    - body: "unable to parse username for getting pubkey"
- response: 401
    - content-type: `text/plain`
    - body: "Not signed in - access denied"
- response: 500
    - content-type: `text/plain`
    - body: "Internal MySQL Error"

``` 
$ curl -X GET 
       -H "Content-Type: `application/json`" 
       https://www.c279.ml/api/crypto/pubkey/?username=itsasecret
```

- Additional Notes: Returns 400 codes if some field is not alphanumeric or is otherwise unacceptable. 500 codes are not expected during normal operation and indicate server issues. This is often a required call to make before getting messages, as the returned contents will be encrypted

## Session APIs

## File APIs

## User APIs

### Create

Make settings:

- Description: As a logged in user, set your preferences
- request: `POST /api/settings/`
    - content-type: `application/json`
    - body: body: object
      - colorA: (string) Color preference.
      - colorB: (string) Color preference.
      - colorC: (string) Color preference.
      - colorD: (string) Color preference.
      - turn_speed: (number) turn preference.
      - move_speed: (number) speed preference.
      - font_size: (number) font preference.
- response: 200
    - content-type: `application/json`
    - body: "Saved settings"
- response: 400
    - content-type: `text/plain`
    - body: "bad input"
- response: 401
    - content-type: `text/plain`
    - body: "Not signed in - access denied"
- response: 500
    - content-type: `text/plain`
    - body: "Internal MySQL Error"

``` 
$ curl -X POST 
       -H "Content-Type: `application/json`" 
       -d '{"colorA":"0xffffff","colorB":"0xffffff","colorC":"0xffffff","colorD":"0xffffff","turn_speed":3,"move_speed":3,"font_size":30}'
       https://www.c279.ml/api/settings/
```

- Additional Notes: Returns 400 codes if some field is not valid or is missing key information. 500 codes are not expected during normal operation and indicate server issues.

### Read

Get all users:

- Description: Gets a list of users who exist
- request: `GET /api/users/`
    
- response: 200
    - content-type: `application/json`
    - body: list of object with following fields
      - Username: (string) a username.
- response: 401
    - content-type: `text/plain`
    - body: "Not signed in - access denied"
- response: 500
    - content-type: `text/plain`
    - body: "Internal MySQL Error"

``` 
$ curl -X GET 
       -H "Content-Type: `application/json`" 
       https://www.c279.ml/api/users/
```

- Additional Notes: Returns 400 codes if some field is not alphanumeric or is otherwise unacceptable. 500 codes are not expected during normal operation and indicate server issues.

Settings Get:

- Description: Gets a list of settings for the user
- request: `GET /api/settings/`
    
- response: 200
    - content-type: `application/json`
    - body: object
      - colorA: (string) Color preference.
      - colorB: (string) Color preference.
      - colorC: (string) Color preference.
      - colorD: (string) Color preference.
      - turn_speed: (number) turn preference.
      - move_speed: (number) speed preference.
      - font_size: (number) font preference.
- response: 401
    - content-type: `text/plain`
    - body: "Not signed in - access denied"
- response: 404
    - content-type: `text/plain`
    - body: "User does not have saved settings"
- response: 500
    - content-type: `text/plain`
    - body: "Internal MySQL Error"

``` 
$ curl -X GET 
       -H "Content-Type: `application/json`" 
       https://www.c279.ml/api/settings/
```

- Additional Notes: None

