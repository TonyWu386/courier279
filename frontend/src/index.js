import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import nacl from 'tweetnacl';
import util from 'tweetnacl-util';


import SceneTxtCtrl from './SceneTxtController.js';
import LoginPortal from './LoginPortal.js';

import axios from 'axios';
const server = "http://localhost:3000";



class GroupSession extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      username: 'place filler',
      sessionId: 'place filler',
    };
  }

  handleInputChange(event, field) {
    if (field == 'u') {
      this.setState({
        username: event.target.value,
      });
    } else {
      this.setState({
        sessionId: event.target.value,
      });
    }
  }

  createNewSession() {
    // Generate a random key for this group session, then encrypt it for ourselves
    const session_key = nacl.randomBytes(nacl.secretbox.keyLength);
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const pubkey = this.props.getUserPubKey();
    const privkey = this.props.getUserPrivKey();
    const encrypted_session_key = nacl.box(session_key, nonce, pubkey, privkey);

    // Push it to the server
    axios.post(server + "/api/group/session/", {
      encrypted_session_key : util.encodeBase64(encrypted_session_key),
      nonce : util.encodeBase64(nonce),
    })
    .then((response) => {
      this.setState({sessionId : response.data.sessionId});

      // This stores the group session key globally, so it can be used for this session's messages later
      this.props.addGroupSessionCryptData(response.data.sessionId, session_key);

      console.log("Created new group session with id " + response.data.sessionId);
    }).catch((err) => {
      console.log(err);
    });
  }


  addUserToExisting() {
    if ((!this.state.username) || (!this.state.sessionId)) {
      console.log("Need username and sessionId inputs");
      return;
    }

    const sessionId = this.state.sessionId;
    const username = this.state.username;
    const pubkey = this.props.getUserPubKey();
    const privkey = this.props.getUserPrivKey();

    let session_key = null;

    axios.get(server + "/api/group/session/" + sessionId + "/")
    .then((response) => {
      if (response.data.OwnerUsername != this.props.queryLoginName()) throw new Error("Not owner");

      const nonce = util.decodeBase64(response.data.Nonce);
      const encrypted_session_key = util.decodeBase64(response.data.EncryptedSessionKey);

      session_key = nacl.box.open(encrypted_session_key, nonce, pubkey, privkey);

      // This stores the group session key gobally, so it can be used for this session's messages later
      this.props.addGroupSessionCryptData(sessionId, session_key);
      
      return axios.get(server + "/api/crypto/pubkey/?username=" + username);
    }).then((res) => {
      const target_pubkey = util.decodeBase64(res.data.pubkey);
      const target_nonce = nacl.randomBytes(nacl.box.nonceLength);

      // We re-encrypt the group session key for the target user, and send it to the server
      const target_encrypted_session_key = nacl.box(session_key, target_nonce, target_pubkey, privkey);

      return axios.post(server + "/api/group/session/" + sessionId + "/adduser/", {
        'encrypted_session_key': util.encodeBase64(target_encrypted_session_key),
        'nonce': util.encodeBase64(target_nonce),
        'username_to_add': username,
      });
    }).then((res) => {
      console.log("Success added user to existing session");
    }).catch((err) => {
      console.log(err);
    });
  }

  render() {
    return (
      <div>
        <h2>Symm Encryption Demo</h2>
        <button onClick={() => this.createNewSession()}>New Session</button>
        <button onClick={() => this.addUserToExisting()}>Add To Existing</button>
        <h4>Username</h4>
        <input type="text" value={this.state.value} onChange={(i) => this.handleInputChange(i,'u')}/>
        <h4>SessionID</h4>
        <input type="text" value={this.state.value} onChange={(i) => this.handleInputChange(i,'s')}/>
      </div>
    )
  };
}



class FileUp extends React.Component {
  constructor(props) {
    super(props);
    this.state ={
        file: null
    };
    this.onFormSubmit = this.onFormSubmit.bind(this);
    this.onChange = this.onChange.bind(this);
  }

  onFormSubmit(e){
    e.preventDefault();

    function uploadFileAsync(file, callback) {
      let reader = new FileReader();

      reader.addEventListener("load", function () {
        
        // On very large file, encryption process can freeze up 3D canvas
        // TODO maybe switch to web worker?
        const key = nacl.randomBytes(nacl.secretbox.keyLength);
        const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
        let encrypted_file = nacl.secretbox(new Uint8Array(reader.result), nonce, key);

        const formData = new FormData();
        formData.append('encrypted_file', new Blob([encrypted_file]));
        formData.append('nonce', util.encodeBase64(nonce));
        const config = {
          headers: {
            'content-type': 'multipart/form-data'
          }
        };

        axios.post(server + "/api/upload/", formData, config)
        .then((response) => {
          console.log("The file is successfully uploaded");
          callback(null, "The file is successfully uploaded");
        }).catch((error) => {
          console.log(error);
          callback(error, null);
        });
      }, false);

      reader.readAsArrayBuffer(file);
    }

    uploadFileAsync(this.state.file, (err, res) => {
      if (err) console.log("ERROR CAUGHT");
    });
  }

  onChange(e) {
    this.setState({file:e.target.files[0]});
  }

  render() {
    return (
      <form onSubmit={this.onFormSubmit}>
          <h1>File Upload</h1>
          <input type="file" name="myFile" onChange={this.onChange} />
          <button type="submit">Upload</button>
      </form>
    )
  }
}





class Webapp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      pubkey: null,
      privkey: null,
      uname: '',
      error: '',
      staleErr: false,
      feedback: '',
      staleFeed: false,
      group_sessions: {},
      // when set to true, propagate down things that should happen
      newLogin: false,
      loginObservers: [],
    };
  }

  componentDidUpdate(oldProps) {
    // this execs everytime component state changes. Good place for observers
    if (this.state.newLogin === true) {
      this.state.loginObservers.forEach((observerFunc) => {
        observerFunc();
      });
      this.setState({
        newLogin: false,
      });
      console.log("New login detected");
    }
    console.log("Update detected");
  }

  // The below are funcs passed to login for communicating with us

  handleLoginResponse(loginState, unameNew) {
    if (loginState) {
      this.setState({
        uname: unameNew,
        staleErr: false,
        newLogin: true,
      });
    } else {
      this.setState({
        uname: '',
        staleErr: false,
        staleFeed: false,
      });
    }
  }

  handleSignupFeedback(feedbackmsg) {
    this.setState({
      feedback: feedbackmsg,
      staleFeed: true,
      staleErr: false,
    });
  }

  handleLoginErr(errormsg) {
    this.setState({
      error: errormsg,
      staleErr: true,
    });
  }

  // Abstract away login details for child components
  queryLoginStatus() {
    // If there are any additional checks for being logged in, they go here.
    return this.state.uname !== '';
  }

  queryLoginName() {
    return this.state.uname;
  }

  queryNewLogin() {
    return this.state.newLogin;
  }

  // get user public key, is null if no logged in user
  queryUserPubKey() {
    return this.state.pubkey;
  }

  // get user private key, is null if no logged in user
  queryUserPrivKey() {
    return this.state.privkey;
  }

  setCryptData(pubkey, privkey) {
    this.setState({
      pubkey: pubkey,
      privkey: privkey,
    });
    console.log("Set crypt info in index.js done");
  }

  watchNewLogin(func) {
    this.setState((old) => ({
      loginObservers : [...old.loginObservers, func],
    }));
  }

  render() {

    return (
      <div className="contain-all">
        <div class="signup-feedback">{this.state.staleFeed ? 
            this.state.feedback : 
            'Hi! Signup or Login below to begin'}</div>
        <div class="login-status">You currently are {this.state.uname === '' ? 
            'Not Logged In - You won\'t be able to send or recieve anything' : 
            'Logged in as ' + this.state.uname}</div>
        <br />
        <div className="login-contain">
          <div className="instructext">Sign in to view messages</div>
          <LoginPortal
            setCryptData={(pubkey, privkey) => this.setCryptData(pubkey, privkey)}
            loginResponse={(loginState, unameNew) => this.handleLoginResponse(loginState, unameNew) }
            loginError={(errmsg) => this.handleLoginErr(errmsg)}
            signupResponse={(feedmsg) => this.handleSignupFeedback(feedmsg)}
          />
          <br />
          <div class="login-error">{this.state.staleErr ? 
          this.state.error : 
          ''}</div>
        </div>
        <br />
        <div className="threejs-text">
            <SceneTxtCtrl
              isUserLogin={() => this.queryLoginStatus()}
              getUserPubKey={() => this.queryUserPubKey()}
              getUserPrivKey={() => this.queryUserPrivKey()}
              getUserName={() => this.queryLoginName()}
              addNewLoginObserver={(func) => this.watchNewLogin(func)}
            />
        </div>
        <div>
          <FileUp/>
        </div>
      </div>
    );
  }
}

// ========================================

ReactDOM.render(
  <Webapp />,
  document.getElementById('root')
);
