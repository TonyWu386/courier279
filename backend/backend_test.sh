printf "Adding test users...\n"
curl --header 'Content-Type: application/json' --request POST --data '{"username":"testuserA", "password":"hunter1", "pubkey":"x", "enc_privkey_nonce":"x", "enc_privkey":"x"}' -c cookiefileA localhost:3001/signup/
curl --header 'Content-Type: application/json' --request POST --data '{"username":"testuserB", "password":"hunter2", "pubkey":"x", "enc_privkey_nonce":"x", "enc_privkey":"x"}' -c cookiefileB localhost:3001/signup/
curl --header 'Content-Type: application/json' --request POST --data '{"username":"testuserC", "password":"hunter3", "pubkey":"x", "enc_privkey_nonce":"x", "enc_privkey":"x"}' -c cookiefileC localhost:3001/signup/
curl --header 'Content-Type: application/json' --request POST --data '{"username":"testuserD", "password":"hunter4", "pubkey":"x", "enc_privkey_nonce":"x", "enc_privkey":"x"}' -c cookiefileD localhost:3001/signup/
curl --header 'Content-Type: application/json' --request POST --data '{"username":"testuserE", "password":"hunter5", "pubkey":"x", "enc_privkey_nonce":"x", "enc_privkey":"x"}' -c cookiefileE localhost:3001/signup/

printf "\nAdding test contacts...\n"
curl --header 'Content-Type: application/json' --request POST --data '{"owning_username":"testuserA", "target_username":"testuserB"}' -b cookiefileA localhost:3001/api/contacts/
curl --header 'Content-Type: application/json' --request POST --data '{"owning_username":"testuserA", "target_username":"testuserC"}' -b cookiefileA localhost:3001/api/contacts/
curl --header 'Content-Type: application/json' --request POST --data '{"owning_username":"testuserB", "target_username":"testuserD"}' -b cookiefileB localhost:3001/api/contacts/

printf "\nTesting GET + DELETE contacts...\n"
curl --header 'Content-Type: application/json' -b cookiefileA localhost:3001/api/contacts/?username=testuserA
printf "\n"
curl --header 'Content-Type: application/json' -b cookiefileB localhost:3001/api/contacts/?username=testuserB
printf "\n"
curl --header 'Content-Type: application/json' --request DELETE -b cookiefileA localhost:3001/api/contacts/1/
printf "\n"
curl --header 'Content-Type: application/json' -b cookiefileA localhost:3001/api/contacts/?username=testuserA

printf "\nTesting bad contact auth...\n"
curl --header 'Content-Type: application/json' -b cookiefileE localhost:3001/api/contacts/?username=testuserA
printf "\n"
curl --header 'Content-Type: application/json' --request DELETE -b cookiefileE localhost:3001/api/contacts/2/
printf "\nDone\n"
