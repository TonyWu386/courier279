import React from 'react';
import axios from 'axios';
import nacl from 'tweetnacl';
import util from 'tweetnacl-util';
import './index.css';


import SceneTxt from './SceneTxt.js';

// ========== TODO ============ change this for production
// ATTENTION change the port to 8888 if using the Nginx reverse proxy
// const server = "http://localhost:8888";
const server = "http://localhost:3000";


export default class SceneTxtController extends React.Component {
  constructor(props) {
    super(props)

    this.pushUserMessage = this.pushUserMessage.bind(this);

    this.handleKeyD = this.handleKeyDown.bind(this);
    this.handleKeyU = this.handleKeyUp.bind(this);

    this.state = {
      txt: '',
      target: '',
      existingMsg: [],
      movements: {forward: false, backward: false, right: false, left: false},
      isCameraLocked: false,
      hasBeenChanged: false, // currently unused. Will want later
      staleLiveInfo: false,
      liveInfo: '',
      testgotmsg: '',
    }
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyD, false);
    document.addEventListener('keyup', this.handleKeyU, false);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown, false);
    document.removeEventListener('keyup', this.handleKeyUp, false);
  }

  handleInputChange(event) {
    this.setState({
      txt : event.target.value,
    }, () => {
      console.log('says ', this.state.txt);
    });
  }

  handleContactChange(event) {
    this.setState({
      target : event.target.value,
    }, () => {
      console.log('target is ', this.state.target);
    });
  }

  handleAdd(e) {
    // Basic frontend check that non-auth users can't do anything
    if (this.props.isUserLogin()) {
      // TODO this entire section is a mess and needs a rework
      // be very careful with immutability
      this.setState((old) => ({
        existingMsg : [...old.existingMsg, old.txt],
      }), () => {
        // handle pushing the new MSG to db by calling the helper below
        this.pushUserMessage();
        console.log('says ', this.state.existingMsg);
      });
    } else {
      this.setState({
        staleLiveInfo: true,
        liveInfo: "You must be logged in to send messages",
      });
    }
  }

  handleLock(event) {
    // be very careful with immutability
    this.setState((old) => ({
      // XOR with 1, should act as a toggle
      isCameraLocked : (old.isCameraLocked ^ 1) === 1,
    }), () => {
      console.log('Camera Locked ', this.state.isCameraLocked);
      // if locked while moving, the camera can get stuck. prevent that here.
      if (this.state.isCameraLocked) {
        let temp = {...this.state.movements};
        temp.forward = false;
        temp.left = false;
        temp.backward = false;
        temp.right = false;
        this.setState({
          movements : temp,
        });
      }

    });
  }

  handleKeyDown(event) {
    if (!this.state.isCameraLocked) {
      let temp = {...this.state.movements};
      switch(event.key) {
        case 'w': 
                  temp.forward = true;
                  this.setState({movements : temp,}, () => {console.log('W down');}); break;

        case 'a': 
                  temp.left = true;
                  this.setState({movements : temp,}, () => {console.log('A down');}); break;

        case 's': 
                  temp.backward = true;
                  this.setState({movements : temp,}, () => {console.log('S down');}); break;

        case 'd': 
                  temp.right = true;
                  this.setState({movements : temp,}, () => {console.log('D down');}); break;

        default:
      }
    }
  }

  handleKeyUp(event) {
    if (!this.state.isCameraLocked) {
      let temp = {...this.state.movements};
      switch(event.key) {
        case 'w': 
                  temp.forward = false;
                  this.setState({movements : temp,}, () => {console.log('W up');}); break;

        case 'a': 
                  temp.left = false;
                  this.setState({movements : temp,}, () => {console.log('A up');}); break;

        case 's': 
                  temp.backward = false;
                  this.setState({movements : temp,}, () => {console.log('S up');}); break;

        case 'd': 
                  temp.right = false;
                  this.setState({movements : temp,}, () => {console.log('D up');}); break;

        default:
      }
    }
  }

  fetchUserMessages() {
    // corresponds to backend GET for this user
    // TODO engineer this to be able to get message from a specific user
    axios.get(server + "/api/messages/direct/?from=" + this.state.target)
      .then((response) => {
        // grab the messages
        // Unencrypt them with the relevant keys (which should be passed down)
        // and store the result so they can be drawn
        let msg_str = '';
        response.data.forEach(msg => {
          msg_str += "ID " + msg.DirectMessageId;
          msg_str += " :Encrypted text " + msg.EncryptedText;
          msg_str += " :Sender " + msg.SenderUsername;
          msg_str += " :Target " + msg.ReceiverUsername;
          msg_str += " :Nonce " + msg.Nonce;
        });

        this.setState({
          testgotmsg: msg_str,
        });

        console.log("Got following direct messages from DB" + response.data);
      }).catch((err) => {
        console.log("Messed up while getting user msgs " + err.response.data);
      });
    
  }

  pushUserMessage() {
    //  corresponds to backend POST for this user
    // convert the message to a form the backend understands

    axios.get(server + "/api/crypto/pubkey/?username=" + this.state.target)
    .then((response) => {
      let target_pubkey = util.decodeBase64(response.data.pubkey);
      let message_nonce = nacl.randomBytes(nacl.box.nonceLength);

      const ecdh_shared_secret = nacl.box.before(target_pubkey, this.props.getUserPrivKey());

      const encrypted_message = nacl.box.after(util.decodeUTF8(this.state.txt), message_nonce, ecdh_shared_secret);

      return axios.post(server + "/api/messages/direct/", {
        encrypted_body: util.encodeBase64(encrypted_message),
        nonce: util.encodeBase64(message_nonce),
        target_username: this.state.target,
      });
    }).then((res) => {
      this.setState({
        staleLiveInfo: true,
        liveInfo: "Success: "  + res.data,
      });
    }).catch((err) => {
      this.setState({
        staleLiveInfo: true,
        liveInfo: "Send failure: "  + (err.response.data || err.response || err),
      });
      console.log(err);
    });

  }

  

  queryMsg() {
    return this.state.existingMsg
  }

  queryTxt() {
    return this.state.txt
  }

  queryMovement() {
    return this.state.movements;
  }

  render() {
    return (
      <div>
        <input id="content-msg" type="text" value={this.state.value} onChange={(i) => this.handleInputChange(i)}/>
        <input id="target-msg" type="text" value={this.state.value} onChange={(i) => this.handleContactChange(i)}/>
        <button class="btn" id="msg-add" onClick={(i) => this.handleAdd(i)}>Add</button>
        <button class="btn" id="lock-view" onClick={(i) => this.handleLock(i)}>Toggle Camera Locking</button>
        <button class="btn" id="force" onClick={() => this.fetchUserMessages()}>DEV ONLY - Force Self Message Check and Show</button>
        <div id="show-msg">{this.state.testgotmsg}</div>
        <div class="lock">Camera is currently {this.state.isCameraLocked ? 
          'LOCKED - typing will not move the camera' : 'UNLOCKED - you can move in the world'}</div>
        <div id="controls">WASD to move. Use the Toggle Camera Locking button when you want to type</div>
        <div id="liveinfo">{this.state.staleLiveInfo ? this.state.liveInfo 
          : 'Send messages to known usernames using the box at the top.'}</div>
        <SceneTxt 
          txt={() => this.queryTxt()}
          msgs={() => this.queryMsg()}
          movementsIn={() => this.queryMovement()}
        />
      </div>
    );
  }
}
