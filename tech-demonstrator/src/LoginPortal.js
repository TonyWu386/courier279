import React from 'react';
import axios from 'axios';
import nacl from 'tweetnacl';
import util from 'tweetnacl-util';

// ========== TODO ============ change this for production
const server = "http://localhost:3000";

export default class LoginPortal extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      username : null,
      password : null,
    }
  }


  setupNewUserCryptData() {
    // Will probably switch to better KDF later, but this will work for creating two mutually independent keys
    const secret_client_sym_key = nacl.hash(util.decodeUTF8('client_sym' + this.state.password)).slice(0, nacl.secretbox.keyLength);
    const server_auth_key = nacl.hash(util.decodeUTF8('server_auth' + this.state.password));

    const keypair = nacl.box.keyPair();

    const pubkey = keypair.publicKey;

    const enc_privkey_nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const enc_privkey = nacl.secretbox(keypair.secretKey, enc_privkey_nonce, secret_client_sym_key);

    return {
      'server_auth_key' : server_auth_key,
      'pubkey' : pubkey,
      'enc_privkey_nonce' : enc_privkey_nonce,
      'enc_privkey' : enc_privkey,
    }
  }


  // Sets up crypto for new user and creates an account
  EnrollUser() {
    if ((!this.state.username) || (!this.state.password)) return;

    const new_user_data = this.setupNewUserCryptData();
    this.ServerSignup(new_user_data, this.state.username);
  }


  ServerSignup(new_user_data, username) {
    axios.post(server + "/signup/", {
      username: username,
      password: new_user_data.server_auth_key,
      pubkey: new_user_data.pubkey,
      enc_privkey: new_user_data.enc_privkey,
      enc_privkey_nonce: new_user_data.enc_privkey_nonce,
    }).then((response) => {
      console.log("Success ", response);
      axios.post(server + "/test/", {});
    }).catch((err) => {
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
        <button onClick={() => this.EnrollUser()}>EnrollUser</button>
      </div>
    );
  }
}
