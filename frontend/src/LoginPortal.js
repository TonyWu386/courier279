import React from 'react';
import axios from 'axios';
import nacl from 'tweetnacl';
import util from 'tweetnacl-util';
import scrypt from 'scrypt-async';

// ========== TODO ============ change this for production
// ATTENTION change the port to 8888 if using the Nginx reverse proxy
// const server = "http://localhost:8888";
const server = "http://localhost:3000";

export default class LoginPortal extends React.Component {
  constructor(props) {
    super(props)

    // Properties should include


    this.state = {
      username : null,
      password : null,
    }
  }


  setupNewUserCryptData(callback) {
    // Will probably switch to better KDF later, but this will work for creating two mutually independent keys
    const client_sym_kdf_salt = nacl.randomBytes(32);

    scrypt(("client_sym" + this.state.password), client_sym_kdf_salt, {
            N: 16384,
            r: 8,
            p: 1,
            dkLen: 32,
            encoding: 'binary'
    }, (secret_client_sym_key) => {

      console.log(secret_client_sym_key);

      const server_auth_key = nacl.hash(util.decodeUTF8('server_auth' + this.state.password));
  
      const keypair = nacl.box.keyPair();
  
      const pubkey = keypair.publicKey;
  
      const enc_privkey_nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
      const enc_privkey = nacl.secretbox(keypair.secretKey, enc_privkey_nonce, secret_client_sym_key);
  
      callback({
        'client_sym_kdf_salt' : util.encodeBase64(client_sym_kdf_salt),
        'server_auth_key' : util.encodeBase64(server_auth_key),
        'pubkey' : util.encodeBase64(pubkey),
        'enc_privkey_nonce' : util.encodeBase64(enc_privkey_nonce),
        'enc_privkey' : util.encodeBase64(enc_privkey),
      });
    });
  }


  // Sets up crypto for new user and creates an account
  EnrollUser() {
    if ((!this.state.username) || (!this.state.password)) return;

    this.setupNewUserCryptData((new_user_data) => {
      this.ServerSignup(new_user_data, this.state.username);
    });
  }


  SigninUser() {
    if ((!this.state.username) || (!this.state.password)) return;

    const server_auth_key = nacl.hash(util.decodeUTF8('server_auth' + this.state.password));

    axios.post(server + "/api/signin/", {
      username: this.state.username,
      password: util.encodeBase64(server_auth_key),
    }).then((response) => {
      const pubkey = util.decodeBase64(response.data.PubKey);
      const enc_privkey = util.decodeBase64(response.data.EncryptedPrivKey);
      const enc_privkey_nonce = util.decodeBase64(response.data.EncryptedPrivKeyNonce);
      const client_sym_kdf_salt = util.decodeBase64(response.data.ClientSymKdfSalt);

      console.log("Signed in and extracted", pubkey, enc_privkey, enc_privkey_nonce);

      scrypt(("client_sym" + this.state.password), client_sym_kdf_salt, {
        N: 16384,
        r: 8,
        p: 1,
        dkLen: 32,
        encoding: 'binary'
      }, (secret_client_sym_key) => {
        const privkey = nacl.secretbox.open(enc_privkey, enc_privkey_nonce, secret_client_sym_key);

        this.props.setCryptData(pubkey, privkey);
        // this.state.username should be fine, perhaps we should use response?
        this.props.loginResponse(true, this.state.username);
      });
    }).catch((err) => {
      if (err.response.status == 401) this.props.loginError(err.response.data +
         ". Please enter credentials again");
      else this.props.loginError("MySQL server had an accident: " + err.response.data);
      console.log(err);
    });
  }


  ServerSignup(new_user_data, username) {
    axios.post(server + "/api/signup/", {
      username: username,
      password: new_user_data.server_auth_key,
      pubkey: new_user_data.pubkey,
      enc_privkey: new_user_data.enc_privkey,
      enc_privkey_nonce: new_user_data.enc_privkey_nonce,
      client_sym_kdf_salt: new_user_data.client_sym_kdf_salt,
    }).then((response) => {
      this.props.signupResponse(response.data + ", Good for you!");
      // this.state.username should be fine, perhaps we should use response?
      this.props.loginResponse(true, this.state.username);
      console.log("Success ", response);
    }).catch((err) => {
      if (err.response.status == 409) this.props.loginError("Sorry, but " + err.response.data);
      else this.props.loginError("MySQL server had an accident: " + err.response.data);
      console.log(err);
    });
  }

  handleInputChange(event, field) {
    this.setState({
      username: (field === 'u')? event.target.value : this.state.username,
      password: (field === 'p')? event.target.value : this.state.password,
    });
  }

  render() {
    return (
      <div>
        Username<input type="text" value={this.state.value} onChange={(i) => this.handleInputChange(i, 'u')}/>
        Password<input type="text" value={this.state.value} onChange={(i) => this.handleInputChange(i, 'p')}/>
        <button class="btn" onClick={() => this.EnrollUser()}>Enroll User</button>
        <button class="btn" onClick={() => this.SigninUser()}>Signin User</button>
      </div>
    );
  }
}
