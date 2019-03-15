printf "Adding test users...\n"
curl --header 'Content-Type: application/json' --request POST --data '{"username":"testuserA", "password":"hunter1", "pubkey":"x", "enc_privkey_nonce":"x", "enc_privkey":"x", "client_sym_kdf_salt":"s"}' -c cookiefileA localhost:3001/api/signup/
curl --header 'Content-Type: application/json' --request POST --data '{"username":"testuserB", "password":"hunter2", "pubkey":"x", "enc_privkey_nonce":"x", "enc_privkey":"x", "client_sym_kdf_salt":"s"}' -c cookiefileB localhost:3001/api/signup/
curl --header 'Content-Type: application/json' --request POST --data '{"username":"testuserC", "password":"hunter3", "pubkey":"x", "enc_privkey_nonce":"x", "enc_privkey":"x", "client_sym_kdf_salt":"s"}' -c cookiefileC localhost:3001/api/signup/
curl --header 'Content-Type: application/json' --request POST --data '{"username":"testuserD", "password":"hunter4", "pubkey":"x", "enc_privkey_nonce":"x", "enc_privkey":"x", "client_sym_kdf_salt":"s"}' -c cookiefileD localhost:3001/api/signup/
curl --header 'Content-Type: application/json' --request POST --data '{"username":"testuserE", "password":"hunter5", "pubkey":"x", "enc_privkey_nonce":"x", "enc_privkey":"x", "client_sym_kdf_salt":"s"}' -c cookiefileE localhost:3001/api/signup/

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

printf "\n\nTesting bad contact auth...\n"
curl --header 'Content-Type: application/json' -b cookiefileE localhost:3001/api/contacts/?username=testuserA
printf "\n"
curl --header 'Content-Type: application/json' --request DELETE -b cookiefileE localhost:3001/api/contacts/2/

printf "\n\nTesting sending messages...\n"
curl --header 'Content-Type: application/json' --request POST --data '{"target_username":"testuserB", "encrypted_body":"x", "nonce":"n"}' -b cookiefileA localhost:3001/api/messages/direct/

printf "\n\nTesting getting messages...\n"
curl --header 'Content-Type: application/json' -b cookiefileB localhost:3001/api/messages/direct/?sender=testuserA

printf "\nDone\n"
