# Courier279 Proposal

## A secure end-to-end encrypted messaging and sharing app with an immersive 3-D UI

### Team:
- Alexander Tam
- Tony Wu

### What is Courier279?

A secure and decentralized messaging and sharing application that respects the privacy of its users.
- Messages are only ever readable by intended recipients. The server will store messages, but will never be able to access anything. 
- Files may also be shared with a single other user, or to a group. In either case, the files will be secured in the same way messages are
- Create and manage contacts

Courier279 also balances security with aesthetics:
- Immersive first-person 3-D UI, all interactions such as file sharing, messaging, etc. will be done in this environment.
- Customize your own environment with flexible tools
- Visit other users in their customized environment, interact in real time.

### Beta Features

- 3D UI used for secure messaging between users

- Contact list to manage communications with other users

### Final Features

- Secure file sharing with flexible permissions

- Manage group chats and sharing

- Customize your own personal environment

- Visit other users in their environment; movements update in real time.

### Technologies

- Heavy use of the javascript port of the TweetNaCl crypto library

- Frontend will rely heavily on the three.js library to handle 3-D rendering

- Express backend and a mySQL backend for data storage (possibly mariaDB)

### Challenges expected

- Performance is expected to be an issue. There is much work to be performed on the client side between cryptographic work and 3-D rendering. Balancing responsiveness with having a full-featured application may take time.

- TweetNaCl and three.js are libraries the team will have to learn independently. There is some familiarity with the structure of both libraries already, but there will still be a learning curve.

- Race conditions and synchronization may be an issue once we begin attempting to handle sharing between multiple users

- A 3-D First-Person UI will be attractive, but likely difficult to work with and test on. It is expected that there will be many issues related to user interaction in the environment.

- Truly ensuring secrecy and security in the setup we've created may be an issue, especially when it comes to enforcing secrecy with multiple users
