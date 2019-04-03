# Courier279 Proposal

## A secure end-to-end encrypted messaging and sharing app with an immersive 3-D UI

https://www.c279.ml

[View Demo Video](https://drive.google.com/open?id=1d6muBwppWbUFVkLFFtEspeMw_ltLkxgd)

### Team:
- Alexander Tam
- Tony Wu

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

### Beta Features

- 3D environment used for secure messaging between users

- Contact list to manage communications with other users

### Final Features

- Secure file sharing with flexible permissions, encryption transparent to the user

- Manage encrypted group chats and sharing

- Smart updating of contact messages

- Quickly cycle through contacts and group sessions using keybinds alone - no standard button elements used

### Technologies

- Heavy frontend use of the *TweetNaCL* crypto library for end-to-end encryption
  - NaCL box format (ECDH) for direct messages
  - NaCL secretbox format (shared secret key) for group messages and files, key distribution via NaCL box

- Trustless end-to-end encryption and key management
  - Each user has a client-generated EC keypair
    - Private key is encrypted with Scrypt digest of user password
    - Independent hash of password sent for server authenication, preseving secrecy of the Scrypt digest
  - Group message sessions use unique client-generated symmetric keys
    - Symmetric keys re-encrypted with group members' public keys for secure distribution
  - Files use client-side seperate-header encryption for flexible sharing
    - Only symmetric key needs to be re-encrypted for sharing, eliminating unnecessary downloads

- Frontend use of *React* to manage client state, server communication, and the main 3-D UI

- The UI centers around a 3-D *three.js* canvas to provide an unique user experience

- Backend composed of an *Express* server with a *MySQL* database for data storage
  - Caching via *Memcached*
  - Uses *Long Polling* for seamless updates between users

- Automated deployment via *Docker*, static files served by *Nginx* with reverse-proxy to *Express* servers

### Challenges expected

- Performance is expected to be an issue. There is much work to be performed on the client side between cryptographic work and 3-D rendering. Balancing responsiveness with having a full-featured application may take time.

- TweetNaCL and three.js are libraries the team will have to learn independently. There is some familiarity with the structure of both libraries already, but there will still be a learning curve.

- Race conditions and synchronization may be an issue once we begin attempting to handle sharing between multiple users

- A 3-D First-Person UI will be attractive, but likely difficult to work with and test on. It is expected that there will be many issues related to user interaction in the environment.

- Truly ensuring secrecy and security in the setup we've created may be an issue, especially when it comes to enforcing secrecy with multiple users
