# Courier279

## A secure end-to-end encrypted messaging and sharing app with an immersive 3-D UI

https://www.c279.ml

### Team:
- Alexander Tam
  - Frontend
  - 3D Environment
- Tony Wu
  - Backend/DB
  - E2E Crypto
  - DevOps

### What is Courier279?

A secure and trustless messaging and sharing application that respects the privacy of its users.
- End-to-end encryption for direct messages, group messages, and files
- Seamless crypto code handles everything from encryption to key management, no special user actions required
- Files utilize seperated volume/header encryption, allowing rapid sharing with any number of users
- Trustless security model ensures the server never has access to users' private data
- Create and manage contacts, and configure sharing permissions among contacts

Courier279 offers a unique 3-D user experience:
- Centers on an immersive first-person 3-D operating environment
- Interactions such as viewing messages, contacts, group messages, etc. will be done in this 3-D environment
- Simple, minimalistic design enables users to focus on the environment created by their conversations.

### Features

- 3D environment used for secure messaging between users

- Contact list to manage communications with other users

- Secure file sharing with flexible permissions, encryption transparent to the user

- Manage encrypted group chats and sharing

- Smart updating of contact messages

- Quickly cycle through contacts and group sessions using keybinds alone - no standard button elements used

### Technologies

- Frontend use of the TweetNaCL crypto library for end-to-end encryption
  - NaCL box format (ECDH) for direct messages
  - NaCL secretbox format (shared secret key) for group messages and files, key distribution via NaCL box

- Trustless end-to-end encryption and key management
  - Each user has a client-generated EC keypair, created upon signup
    - Private key is encrypted with Scrypt digest of user password, before leaving the client
    - Independent hash of password sent for server authenication, preseving secrecy of the Scrypt digest
    - Private key is restored in the client upon subsequent logins
  - Group message sessions use unique client-generated symmetric keys
    - Symmetric keys re-encrypted with group members' public keys for secure distribution
  - Files use client-side seperate-header encryption for flexible sharing
    - Only symmetric key needs to be re-encrypted for sharing, eliminating unnecessary downloads

- Frontend use of React to manage client state, server communication, and the main 3-D UI

- The UI centers around a 3-D three.js canvas to provide an unique user experience

- Backend composed of an Express server with a MySQL database for data storage
  - Caching via Memcached
  - Uses Long Polling for seamless updates between users

- Automated deployment via Docker, static files served by Nginx with reverse-proxy to Express servers
