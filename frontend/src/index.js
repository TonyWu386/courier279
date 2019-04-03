import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import nacl from 'tweetnacl';
import util from 'tweetnacl-util';


import SceneTxtCtrl from './SceneTxtController.js';
import LoginPortal from './LoginPortal.js';

import axios from 'axios';
const server = "https://www.c279.ml";



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

    }).catch((err) => {
      console.log(err);
    });
  }


  addUserToExisting() {
    if ((!this.state.username) || (!this.state.sessionId)) {
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
        file: null,
        file_name: null,
        fileId: null,
        username: null,
        selectIdx: 0,
        available: [],
        feedback: "Press button to check files",
    };
    this.onFormSubmit = this.onFormSubmit.bind(this);
    this.onChange = this.onChange.bind(this);
  }

  getAvailableFiles() {
    axios.get(server + "/api/file/share/")
    .then((response) => {
      this.setState({
        available : response.data,
        feedback : "You have " + response.data.length + " files"
      });
      if (response.data.length > 0) {
        this.setState({
          feedback : this.state.feedback + " - selected for action file " + this.state.available[this.state.selectIdx].FileName + " from user " + this.state.available[this.state.selectIdx].SharerUsername,
        });
      }
    }).catch((error) => {
      console.log(error);
    });
  }

  nextFile() {
    if (this.state.available.length > this.state.selectIdx + 1) {
      let idx = this.state.selectIdx + 1;
      this.setState({
        feedback : "Selected for action file " + this.state.available[idx].FileName + " from user " + this.state.available[idx].SharerUsername,
        selectIdx : idx,
      });
    }
  }

  prevFile() {
    if (this.state.selectIdx > 0) {
      let idx = this.state.selectIdx - 1;
      this.setState({
        feedback : "Selected for action file " + this.state.available[idx].FileName + " from user " + this.state.available[idx].SharerUsername,
        selectIdx : idx,
      });
    }
  }

  onFormSubmit(e, field){
    e.preventDefault();

    if (field == 'u') {
      // UPLOAD
      function uploadFileAsync(file, file_name, pubkey, privkey, callback) {
        let reader = new FileReader();

        reader.addEventListener("load", function () {
          const random_key = nacl.randomBytes(nacl.secretbox.keyLength);
          const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
          const encrypted_file = nacl.secretbox(new Uint8Array(reader.result), nonce, random_key);

          const formData = new FormData();

          const encrypted_encryption_key_nonce = nacl.randomBytes(nacl.box.nonceLength);

          const encrypted_encryption_key = nacl.box(random_key, encrypted_encryption_key_nonce, pubkey, privkey);

          formData.append('encrypted_file', new Blob([encrypted_file]));
          formData.append('file_name', file_name);
          formData.append('nonce', util.encodeBase64(nonce));
          formData.append('encrypted_encryption_key', util.encodeBase64(encrypted_encryption_key));
          formData.append('encrypted_encryption_key_nonce', util.encodeBase64(encrypted_encryption_key_nonce));

          const config = {
            headers: {
              'content-type': 'multipart/form-data'
            }
          };

          axios.post(server + "/api/file/upload/", formData, config)
          .then((response) => {
            this.setState({
              feedback : "File uploaded successfully",
            });
            callback(null, response);
          }).catch((error) => {
            console.log(error);
            callback(error, null);
          });
        }, false);

        reader.readAsArrayBuffer(file);
      }

      uploadFileAsync(this.state.file, this.state.file_name, this.props.getUserPubKey(), this.props.getUserPrivKey(), (err, res) => {
        if (err) console.log("ERROR CAUGHT");
        if (res) {
          this.setState({ feedback : "Uploaded to server successfully"});
        }
      });

    } else if (field == 'd') {
      if (!this.state.available[this.state.selectIdx]) return;

      // DOWNLOAD
      let encrypted_file_blob = null;

      axios.get(server + "/api/file/" + this.state.available[this.state.selectIdx].FileId + "/", {
        responseType: 'arraybuffer',
      })
      .then((response) => {

        encrypted_file_blob = new Uint8Array(response.data);

        return axios.get(server + "/api/file/" + this.state.available[this.state.selectIdx].FileId + "/header/");
      }).then((response) => {


        const nonce = util.decodeBase64(response.data.Nonce);
        const encrypted_encryption_key = util.decodeBase64(response.data.EncryptedEncryptionKey);
        const encrypted_encryption_key_nonce = util.decodeBase64(response.data.EncryptedEncryptionKeyNonce);
        const pubkey = util.decodeBase64(response.data.PubKey);

        const privkey = this.props.getUserPrivKey();

        const file_encryption_key = nacl.box.open(encrypted_encryption_key, encrypted_encryption_key_nonce, pubkey, privkey);
        const decryptedFile = nacl.secretbox.open(encrypted_file_blob, nonce, file_encryption_key);


        const url = window.URL.createObjectURL(new Blob([decryptedFile]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', this.state.available[this.state.selectIdx].FileName);
        document.body.appendChild(link);
        link.click();

      }).catch((error) => {
        this.setState({ feedback : "Could not fetch a file with that ID" });
        console.log(error);
      });
    } else {
      // SHARE

      if (!this.state.available[this.state.selectIdx]) return;

      let target_user_pubkey;

      axios.get(server + "/api/crypto/pubkey/?username=" + this.state.username)
      .then((response) => {
        target_user_pubkey = util.decodeBase64(response.data.pubkey);

        return axios.get(server + "/api/file/" + this.state.available[this.state.selectIdx].FileId + "/header/");
      }).then((response) => {

        const encrypted_encryption_key = util.decodeBase64(response.data.EncryptedEncryptionKey);
        const encrypted_encryption_key_nonce = util.decodeBase64(response.data.EncryptedEncryptionKeyNonce);
        const pubkey = util.decodeBase64(response.data.PubKey);

        const privkey = this.props.getUserPrivKey();
        const file_encryption_key = nacl.box.open(encrypted_encryption_key, encrypted_encryption_key_nonce, pubkey, privkey);

        const target_encrypted_encryption_key_nonce = nacl.randomBytes(nacl.box.nonceLength);
        const target_encrypted_encryption_key = nacl.box(file_encryption_key, target_encrypted_encryption_key_nonce, target_user_pubkey, privkey);
        
        return axios.post("/api/file/share/", {
          encrypted_encryption_key: util.encodeBase64(target_encrypted_encryption_key),
          encrypted_encryption_key_nonce: util.encodeBase64(target_encrypted_encryption_key_nonce),
          target_username: this.state.username,
          fileId: this.state.available[this.state.selectIdx].FileId.toString(),
        });
      }).then((response) => {
        this.setState({
          feedback : "File uploaded successfully",
        });
      }).catch((error) => {
        console.log(error);
      });
    }
  }

  onChange(e, field) {
    if (field == 'f') {
      this.setState({ file : e.target.files[0] });
    } else if (field == 'n') {
      this.setState({ file_name : e.target.value });
    } else if (field == 'i') {
      this.setState({ fileId : e.target.value });
    } else {
      this.setState({ username : e.target.value });
    }
  }

  render() {
    return (
      <div>
        <form onSubmit={(e) => this.onFormSubmit(e, 'u')}>
            <h1>File Upload</h1>
            <input type="file" name="myFile" onChange={(e) => this.onChange(e, 'f')} />
            <input type="text" name="fileName" placeholder="Stored file name" onChange={(e) => this.onChange(e, 'n')} />
            <button type="submit">Upload</button>
        </form>
        <button onClick={(e) => this.onFormSubmit(e, 'd')}>Download</button>
        <form onSubmit={(e) => this.onFormSubmit(e, 's')}>
            <h1>File Share</h1>
            <input type="text" name="username" placeholder="target username" onChange={(e) => this.onChange(e, 'u')} />
            <button type="submit">Share</button>
        </form>
        <button onClick={() => this.getAvailableFiles()}>Check Files</button>
        <button onClick={() => this.prevFile()}>Prev File</button>
        <button onClick={() => this.nextFile()}>Next File</button>
        <div class="file-feedback">{this.state.feedback}</div>
      </div>
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
    }
  }

  handleLogout() {
    axios.get(server + "/api/signout/")
    .then((response) => {
      this.handleLoginResponse(false, "");
    }).catch((err) => {
      console.log(err);
    });
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
  }

  watchNewLogin(func) {
    this.setState((old) => ({
      loginObservers : [...old.loginObservers, func],
    }));
  }

  render() {
    let loginfragment;
    // conditional rendering based on login status
    if (!this.queryLoginStatus()) {
      loginfragment = <LoginPortal
      setCryptData={(pubkey, privkey) => this.setCryptData(pubkey, privkey)}
      loginResponse={(loginState, unameNew) => this.handleLoginResponse(loginState, unameNew) }
      loginError={(errmsg) => this.handleLoginErr(errmsg)}
      signupResponse={(feedmsg) => this.handleSignupFeedback(feedmsg)}
      />;
    } else {
      loginfragment = <button class="btn" onClick={() => this.handleLogout()}>Logout?</button>;
    }


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
          <div className="instructext">{this.state.uname === '' ?
          "Sign in to view messages" : "You have signed in. Environment has been unlocked."}</div>
          {loginfragment}
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
        <div className="box-manage">
          <FileUp
            getUserPubKey={() => this.queryUserPubKey()}
            getUserPrivKey={() => this.queryUserPrivKey()}
          />
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
