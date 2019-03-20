printf "Adding test users...\n"
curl --header 'Content-Type: application/json' --request POST --data '{"username":"testuserA", "password":"hunter1", "pubkey":"bg==", "enc_privkey_nonce":"bg==", "enc_privkey":"YQ==", "client_sym_kdf_salt":"cw=="}' -c cookiefileA localhost:3001/api/signup/
curl --header 'Content-Type: application/json' --request POST --data '{"username":"testuserB", "password":"hunter2", "pubkey":"bg==", "enc_privkey_nonce":"bg==", "enc_privkey":"YQ==", "client_sym_kdf_salt":"cw=="}' -c cookiefileB localhost:3001/api/signup/
curl --header 'Content-Type: application/json' --request POST --data '{"username":"testuserC", "password":"hunter3", "pubkey":"bg==", "enc_privkey_nonce":"bg==", "enc_privkey":"YQ==", "client_sym_kdf_salt":"cw=="}' -c cookiefileC localhost:3001/api/signup/
curl --header 'Content-Type: application/json' --request POST --data '{"username":"testuserD", "password":"hunter4", "pubkey":"bg==", "enc_privkey_nonce":"bg==", "enc_privkey":"YQ==", "client_sym_kdf_salt":"cw=="}' -c cookiefileD localhost:3001/api/signup/
curl --header 'Content-Type: application/json' --request POST --data '{"username":"testuserE", "password":"hunter5", "pubkey":"bg==", "enc_privkey_nonce":"bg==", "enc_privkey":"YQ==", "client_sym_kdf_salt":"cw=="}' -c cookiefileE localhost:3001/api/signup/

printf "\n\nTesting getting users...\n"
curl --header 'Content-Type: application/json' -b cookiefileA localhost:3001/api/users/

printf "\n\nAdding test contacts...\n"
curl --header 'Content-Type: application/json' --request POST --data '{"owning_username":"testuserA", "target_username":"testuserB", "contact_type":"Friend"}' -b cookiefileA localhost:3001/api/contacts/
curl --header 'Content-Type: application/json' --request POST --data '{"owning_username":"testuserA", "target_username":"testuserC", "contact_type":"Friend"}' -b cookiefileA localhost:3001/api/contacts/
curl --header 'Content-Type: application/json' --request POST --data '{"owning_username":"testuserB", "target_username":"testuserD", "contact_type":"Friend"}' -b cookiefileB localhost:3001/api/contacts/
curl --header 'Content-Type: application/json' --request POST --data '{"owning_username":"testuserB", "target_username":"testuserE", "contact_type":"Blocked"}' -b cookiefileB localhost:3001/api/contacts/

printf "\nTesting GET + DELETE contacts...\n"
curl --header 'Content-Type: application/json' -b cookiefileA localhost:3001/api/contacts/?username=testuserA
printf "\n"
curl --header 'Content-Type: application/json' -b cookiefileB localhost:3001/api/contacts/?username=testuserB
printf "\n"
curl --header 'Content-Type: application/json' --request DELETE -b cookiefileA localhost:3001/api/contacts/1/
printf "\n"
curl --header 'Content-Type: application/json' -b cookiefileA localhost:3001/api/contacts/?username=testuserA

printf "\n\nTesting BAD contact auth...\n"
curl --header 'Content-Type: application/json' -b cookiefileE localhost:3001/api/contacts/?username=testuserA
printf "\n"
curl --header 'Content-Type: application/json' localhost:3001/api/contacts/?username=testuserA
printf "\n"
curl --header 'Content-Type: application/json' --request DELETE -b cookiefileE localhost:3001/api/contacts/2/

printf "\n\nTesting sending messages...\n"
curl --header 'Content-Type: application/json' --request POST --data '{"target_username":"testuserB", "encrypted_body":"YQ==", "nonce":"bg=="}' -b cookiefileA localhost:3001/api/messages/direct/

printf "\n\nTesting getting messages...\n"
curl --header 'Content-Type: application/json' -b cookiefileB localhost:3001/api/messages/direct/?from=testuserA
printf "\n"
curl --header 'Content-Type: application/json' -b cookiefileA localhost:3001/api/messages/direct/?to=testuserB
printf "\n"
curl --header 'Content-Type: application/json' --request POST --data '{"target_username":"testuserA", "encrypted_body":"YTI=", "nonce":"bjI="}' -b cookiefileB localhost:3001/api/messages/direct/
printf "\n"
curl --header 'Content-Type: application/json' -b cookiefileA localhost:3001/api/messages/direct/?toandfrom=testuserB

printf "\n\nTesting BAD formatted message...\n"
curl --header 'Content-Type: application/json' --request POST --data '{"target_username":"testuserA", "encrypted_body":"a", "nonce":"bjI="}' -b cookiefileB localhost:3001/api/messages/direct/
printf "\n"
curl --header 'Content-Type: application/json' --request POST --data '{"target_username":"testuserA", "encrypted_body":"YTI=", "nonce":"a"}' -b cookiefileB localhost:3001/api/messages/direct/

printf "\n\nTesting group message sessions...\n"
curl --header 'Content-Type: application/json' --request POST --data '{"encrypted_session_key":"bg==", "nonce":"bg=="}' -b cookiefileA localhost:3001/api/group/session/
printf "\n"
curl --header 'Content-Type: application/json' -b cookiefileA localhost:3001/api/group/session/
printf "\n"
curl --header 'Content-Type: application/json' --request POST --data '{"encrypted_session_key":"YQ==", "nonce":"bg==", "username_to_add":"testUserB"}' -b cookiefileA localhost:3001/api/group/session/1/adduser/
curl --header 'Content-Type: application/json' --request POST --data '{"encrypted_session_key":"YQ==", "nonce":"bg==", "username_to_add":"testUserC"}' -b cookiefileA localhost:3001/api/group/session/1/adduser/

printf "\n\nAdding to group session with BAD info...\n"
curl --header 'Content-Type: application/json' --request POST --data '{"encrypted_session_key":"YQ==", "nonce":"bg==", "username_to_add":"testUserB"}' -b cookiefileA localhost:3001/api/group/session/2/adduser/
printf "\n"
curl --header 'Content-Type: application/json' --request POST --data '{"encrypted_session_key":"YQ==", "nonce":"bg==", "username_to_add":"testUserD"}' -b cookiefileB localhost:3001/api/group/session/1/adduser/
printf "\n\n"

curl --header 'Content-Type: application/json' -b cookiefileA localhost:3001/api/group/session/1/
printf "\nFrom another user\n"
curl --header 'Content-Type: application/json' -b cookiefileB localhost:3001/api/group/session/1/
printf "\nDone\n"
