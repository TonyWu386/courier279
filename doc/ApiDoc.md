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

## Message APIs

