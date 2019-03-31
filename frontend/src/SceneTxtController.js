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
    this.fetchUserMessages = this.fetchUserMessages.bind(this);
    this.refreshUserMessages = this.refreshUserMessages.bind(this);

    this.handleKeyD = this.handleKeyDown.bind(this);
    this.handleKeyU = this.handleKeyUp.bind(this);
    this.handleKeyQE = this.handleContactNav.bind(this);

    this.state = {
      txt: '',
      target: '',
      contactField: '',
      sessionUname: '',
      sessionId: '',
      movements: {forward: false, backward: false, right: false, left: false},
      isCameraLocked: true,
      openPolls: {}, // polls currently open, so we don't open too much
      staleLiveInfo: false,
      liveInfo: '',

      newLoginRender : false, // indicate that we should draw newlogin objects

      staleRender: false,
      toBeRendered: [], // {sender, text}
      staleContacts: false,
      contactList: [], // list of contact objects
      activeContact: -1, // currently none

      staleGroupRender: false,
      toBeGroupRendered: [], // {sender, text, group ID}
      staleGroups: false,
      groupSessions: {}, // list of group message sessions
      activeGroup: -1, // currently none

      staleFileRender: false,
      sharedFiles: [],
      activeFile: -1,
    }
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyD, false);
    document.addEventListener('keyup', this.handleKeyU, false);
    document.addEventListener('keyup', this.handleKeyQE, false);
    // add to parent's observer list
    this.props.addNewLoginObserver(function() {
      // simple mirroring of state
      this.setState({
        newLoginRender : true,
      });
      // fetch contacts and groups on login.
      this.fetchUserContactList();
      this.fetchUserSessionList();
      //this.getAvailableFiles();
    }.bind(this));
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyD, false);
    document.removeEventListener('keyup', this.handleKeyU, false);
    document.removeEventListener('keyup', this.handleKeyQE, false);
  }

  handleInputChange(event) {
    this.setState({
      txt : event.target.value,
    }, () => {
      console.log('says ', this.state.txt);
    });
  }

  handleSessionInputChange(event, field) {
    if (field == 'u') {
      this.setState({
        sessionUname: event.target.value,
      });
    } else {
      this.setState({
        sessionId: event.target.value,
      });
    }
  }

  handleContactChange(event) {
    this.setState({
      target : event.target.value,
    }, () => {
      console.log('target is ', this.state.target);
    });
  }

  handleContactAddChange(event) {
    this.setState({
      contactField : event.target.value,
    }, () => {
      console.log('contact add contains ', this.state.contactField);
    });
  }

  handleAdd(e) {
    // Basic frontend check that non-auth users can't do anything
    if (this.props.isUserLogin()) {
      // handle pushing the new MSG to db by calling the helper below
      this.pushUserMessage();
    } else {
      this.setState({
        staleLiveInfo: true,
        liveInfo: "You must be logged in to send messages",
      });
    }
  }

  handleGroupMessageAdd(e) {
    // Basic frontend check that non-auth users can't do anything
    if (this.props.isUserLogin()) {
      // handle pushing the new MSG to db by calling the helper below
      this.pushGroupMessage();
    } else {
      this.setState({
        staleLiveInfo: true,
        liveInfo: "You must be logged in to send messages",
      });
    }
  }
  

  handleLock(event) {
    // just in case
    if (!this.props.isUserLogin()) return;
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

  // for handling file related presses
  handleFile(event) {
    if (!this.state.isCameraLocked) {
      
      switch(event.key) {
        case 'f': 
                  // TODO shared file handler. Use F to grab uploaded files
                  // RT cycle???
                  break;
        default:
      }
    }
  }

  // for nav through group submenu
  // TODO complete and hook
  handleGroupNav(event) {
    if (!this.state.isCameraLocked && this.state.activeGroup != -1) {
      let activeG = this.state.activeGroup;
      switch(event.key) {
        case 'c': 
                  if (activeG < Object.keys(this.state.groupSessions).length - 1) {
                    this.setState({
                      activeGroup : activeG + 1,
                    }, () => {
                      this.fetchGroupMessage();
                    }); 
                  } break;

        case 'z': 
                  if (activeG > 0) {
                    this.setState({
                      activeGroup : activeG - 1,
                    }, () => {
                      this.fetchGroupMessage();
                    });
                  } break;
        default:
      }
    }
  }

  // for navigation through the contacts submenu
  handleContactNav(event) {
    if (!this.state.isCameraLocked && this.state.activeContact != -1) {
      let activeC = this.state.activeContact;
      switch(event.key) {
        case 'e': 
                  if (activeC < this.state.contactList.length - 1) {
                    this.setState({
                      activeContact : activeC + 1,
                    }, () => {
                      this.fetchUserMessages();
                      console.log('E up' + this.state.activeContact);
                    }); 
                  } break;

        case 'q': 
                  if (activeC > 0) {
                    this.setState({
                      activeContact : activeC - 1,
                    }, () => {
                      this.fetchUserMessages();
                      console.log('Q up' + this.state.activeContact);
                    });
                  } break;
        default:
      }
    }
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

  // == File handling ==

  getAvailableFiles() {
    axios.get(server + "/api/file/share/")
    .then((res) => {
      let temp = res.data;
      let active = -1;
      if (temp.length > 0) active = 0;
      this.setState({
        staleFileRender : true,
        sharedFiles : temp,
        activeFile : active
      })
    }).catch((error) => {
      console.error("Something went wrong while getting shared files " + error.response.data);
    });
  }

  downloadActiveFile() {

  }
  // == Contact and group management ==

  fetchUserContactList() {
    axios.get(server + "/api/contacts/?username=" + this.props.getUserName())
      .then((res) => {
        let temp = res.data;
        let active = -1;
        if (temp.length > 0) active = 0;
        this.setState({
          staleContacts: true,
          contactList: temp,
          activeContact : active,
          openPolls: {},
        }, () => {
          // callback on whose msgs to display
          this.fetchUserMessages();
        });
        console.log("contact list is " + temp);
      }).catch((err) => {
        console.error(err.response.data);
      });
  }

  updateUserContactList() {
    axios.post(server + "/api/contacts/", {
      owning_username : this.props.getUserName(),
      target_username : this.state.contactField,
      contact_type : "friend",
    }).then((res) => {
      this.setState({
        staleLiveInfo: true,
        liveInfo: "Added new contact",
        contactField: '',
      });
      this.fetchUserContactList();
      console.log(res.data);
    }).catch((err) => {
      this.setState({
        staleLiveInfo: true,
        liveInfo: "Contact update failure: "  + (err.response.data || err.response || err),
      });
      console.error(err);
    });
  }

  fetchUserMessages() {
    // corresponds to backend GET for this user
    if (this.state.activeContact == -1) {
      this.setState({
        toBeRendered: [],
        staleRender : true,
      });
      return;
    };
    let target_pubkey = null;
    let contactTar = this.state.contactList[this.state.activeContact].TargetUsername;
    axios.get(server + "/api/crypto/pubkey/?username=" + contactTar)
    .then((response) => {
      target_pubkey = util.decodeBase64(response.data.pubkey);

      return axios.get(server + "/api/messages/direct/?from=" + contactTar);
    })
    .then((response) => {
      // grab the messages
      // Unencrypt them with the relevant keys (which should be passed down)
      // and store the result so they can be drawn
      const ecdh_shared_secret = nacl.box.before(target_pubkey, this.props.getUserPrivKey());

      let newMessage = [];
      response.data.forEach(msg => {
        const decrypted_text = nacl.box.open.after(util.decodeBase64(msg.EncryptedText), util.decodeBase64(msg.Nonce), ecdh_shared_secret);

        // set stuff that needs to be passed down to renderer
        newMessage.push({sender : msg.SenderUsername, text : " " + util.encodeUTF8(decrypted_text)});
      });

      this.setState({
        toBeRendered: newMessage,
        staleRender : true,
      });

      // do some checks and determine whether to open a new long poll request
      if (!this.state.openPolls[contactTar]) {
        this.refreshUserMessages();
      }

      console.log("Got following direct messages from DB" + response.data);
    }).catch((err) => {
      console.log("Messed up while getting user msgs " + err.response.data);
    });
    
  }

  refreshUserMessages() {
    if (this.state.activeContact == -1) {
      this.setState({
        toBeRendered: [],
        staleRender : true,
      });
      return;
    };

    console.log("Longpoll opening " + this.state.openPolls);
    let calltimeActiveContact = this.state.contactList[this.state.activeContact].TargetUsername;

    // make sure we're not going to be opening redundant long polls
    this.setState(oldState => ({
      openPolls : {
        ...oldState.openPolls,
        [calltimeActiveContact]: true},
    }));

    // we may get longpoll requests from an older active contact. Just discard these.
    axios.get(server + "/api/messages/direct/lp/" + this.props.getUserName() + "_" + calltimeActiveContact + "/")
      .then((res) => {
        console.log("DM Longpolling was responded to");
        // if this is a response to a contact we no longer care about, discard it
        if (calltimeActiveContact == this.state.contactList[this.state.activeContact].TargetUsername) {

          axios.get(server + "/api/crypto/pubkey/?username=" + calltimeActiveContact)
          .then((reskeys) => {
            const ecdh_shared_secret = nacl.box.before(util.decodeBase64(reskeys.data.pubkey), this.props.getUserPrivKey());

            let newMessage = [];
            res.data.forEach(msg => {
              const decrypted_text = nacl.box.open.after(util.decodeBase64(msg.EncryptedText), util.decodeBase64(msg.Nonce), ecdh_shared_secret);
      
              // set stuff that needs to be passed down to renderer
              newMessage.push({sender : msg.SenderUsername, text : " " + util.encodeUTF8(decrypted_text)});
            });
      
            this.setState({
              toBeRendered: newMessage,
              staleRender : true,
            });

            // keeps calling itself to open a new longpoll request
            this.refreshUserMessages();
          });
        } else {
          // this longpoll was discarded and kept dead
          this.setState(oldState => ({
            openPolls : {
              ...oldState.openPolls,
              [calltimeActiveContact]: false},
          }));
        }
      }).catch((err) => {
        console.log(err);
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

  // similar to contacts, load this on login
  fetchUserSessionList() {
    axios.get(server + "/api/group/session/")
      .then((res) => {
        let temp = {};
        // copy over needed info on sessions user is part of
        
        res.data.forEach(function(session) {
          let nonce = util.decodeBase64(session.Nonce);
          let encrypted_session_key = util.decodeBase64(session.EncryptedSessionKey);
          let encrypted_session_key_pubkey = util.decodeBase64(session.PubKey);
          // NULL if authentication fails. Happens on unowned sessions
          let session_key = nacl.box.open(encrypted_session_key, nonce, 
            encrypted_session_key_pubkey, this.props.getUserPrivKey());
          temp[session.SessionId] = session_key;
        }.bind(this));

        let active = -1;
        // temp.sort(); // sort into a logical ordering
        if (Object.keys(temp).length > 0) active = Object.keys(temp)[0];
        this.setState({
          staleGroups: true,
          groupSessions: temp,
          activeGroup : active,
        }, () => {
          // callback on the group messages to display
          this.fetchGroupMessage()
        });
        console.log("Fetch sessions success " + Object.keys(temp));
      }).catch((err) => {
        console.error(err.response.data);
      });
  }

  pushGroupMessage() {
    // Figure out the active group
    if (this.state.activeGroup == -1) return;
    let targetGroupKey = this.state.groupSessions[this.state.activeGroup];
    if (targetGroupKey === null) { console.error("Could not send. Error obtaining Key."); return;}

    // TODO is there an elegant way to switch between group/contact setting?
    // this reuses the same message sending field as contacts
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const encrypted_message = nacl.secretbox(util.decodeUTF8(this.state.txt), nonce, targetGroupKey);

    axios.post(server + "/api/messages/group/" + this.state.activeGroup + "/", {
      encrypted_body : util.encodeBase64(encrypted_message),
      nonce : util.encodeBase64(nonce),

    }).then((res) => {

      this.setState({
        staleLiveInfo: true,
        liveInfo: "Sent Message to Group" + this.state.activeGroup,
      });
      this.fetchGroupMessage();
      console.log(res.data);
    }).catch((err) => {
      this.setState({
        staleLiveInfo: true,
        liveInfo: "Group Message failure: "  + (err.response.data || err.response || err),
      });
      console.error(err.response.data);
    });
  }

  fetchGroupMessage() {
    // Figure out the active group
    if (this.state.activeGroup == -1) {
      this.setState({
        toBeGroupRendered: [],
        staleGroupRender : true,
      });
      return;
    }
    let targetGroupKey = this.state.groupSessions[this.state.activeGroup];
    if (targetGroupKey === null) { console.error("Could not get. Error obtaining Key."); return;}

    axios.get(server + "/api/messages/group/" + this.state.activeGroup + "/")
    .then((res) => {

      let newGroupMessage = [];
      res.data.forEach(msg => {
        const nonce = util.decodeBase64(msg.Nonce);
        const encrypted_message = util.decodeBase64(msg.EncryptedText);
        const decryptedText = nacl.secretbox.open(encrypted_message, nonce, targetGroupKey);


        newGroupMessage.push({sender : msg.Username, text : util.encodeUTF8(decryptedText), GroupID : this.state.activeGroup});
      });
      // render staleness settings
      this.setState({
        toBeGroupRendered: newGroupMessage,
        staleGroupRender : true,
      });

      console.log("Got following group messages on" + this.state.activeGroup + " - " + newGroupMessage);
    }).catch((err) => {
      
      console.log("Messed up while getting group msgs - " + err.response.data);
    });
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


      // This stores the group session key globally, so it can be used for this session's messages later
      this.addGroupSessionCryptData(response.data.sessionId, session_key);

      this.setState({
        staleLiveInfo: true,
        liveInfo: "Created new group session. It has ID " + response.data.sessionId,
      });

      console.log("Created new group session with id " + response.data.sessionId);
    }).catch((err) => {
      console.log(err);
    });
  }


  addUserToExisting() {
    if ((!this.state.sessionUname) || (!this.state.sessionId)) {
      console.log("Need username and sessionId inputs");
      return;
    }

    const sessionId = this.state.sessionId;
    const username = this.state.sessionUname;
    const pubkey = this.props.getUserPubKey();
    const privkey = this.props.getUserPrivKey();

    let session_key = null;

    axios.get(server + "/api/group/session/" + sessionId + "/")
    .then((response) => {
      if (response.data.OwnerUsername != this.props.getUserName()) {
        this.setState({
          staleLiveInfo: true,
          liveInfo: "You are not the owner of session #" + sessionId,
        });
      };

      const nonce = util.decodeBase64(response.data.Nonce);
      const encrypted_session_key = util.decodeBase64(response.data.EncryptedSessionKey);

      session_key = nacl.box.open(encrypted_session_key, nonce, pubkey, privkey);

      // This stores the group session key globally, so it can be used for this session's messages later
      this.addGroupSessionCryptData(sessionId, session_key);
      
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
      // TODO I am fairly certain this produces a change in the session key. Refetch
      console.log("Successfully added user to existing session");
    }).catch((err) => {
      console.log(err);
    });
  }

  addGroupSessionCryptData(sessionId, key) {
    this.setState(oldSessions => ({
      groupSessions : {
        ...oldSessions.groupSessions,
        [sessionId]: key},
    }));
    console.log("Group sessions ", this.state.groupSessions);
  }

  queryTxt() {
    return this.state.txt
  }

  queryMovement() {
    return this.state.movements;
  }

  queryNewMessages() {
    return this.state.toBeRendered;
  }

  queryRenderStaleness() {
    return this.state.staleRender;
  }

  updateRenderStaleness(newStaleness) {
    this.setState({
      staleRender: newStaleness,
    });
  }

  queryNewLogin() {
    return this.state.newLoginRender;
  }

  resetNewLogin() {
    this.setState({
      newLoginRender: false,
    });
  }

  queryContacts() {
    return this.state.contactList;
  }

  queryActiveContactIndex() {
    return this.state.activeContact;
  }

  queryContactStaleness() {
    return this.state.staleContacts;
  }

  updateContactStaleness(newStaleness) {
    this.setState({
      staleContacts: newStaleness,
    });
  }

  // Group queries

  queryNewGroupMessages() {
    return this.state.toBeGroupRendered;
  }

  queryGroupRenderStaleness() {
    return this.state.staleGroupRender;
  }

  updateGroupRenderStaleness(newStaleness) {
    this.setState({
      staleGroupRender: newStaleness,
    });
  }

  queryGroups() {
    return this.state.groupSessions;
  }

  queryGroupStaleness() {
    return this.state.staleGroups;
  }

  updateGroupStaleness(newStaleness) {
    this.setState({
      staleGroups: newStaleness,
    });
  }

  // File data queries

  queryFileStaleness() {
    return this.state.staleFileRender;
  }

  updateFileRenderStaleness(newStaleness) {
    this.setState({
      staleFileRender: newStaleness,
    });
  }

  queryFilesShared() {
    return this.state.sharedFiles;
  }

  queryFileSharedIndex() {
    return this.state.activeFile;
  }
  

  render() {
    return (
      <div>
        <input id="contact-type" type="text" value={this.state.contactField} onChange={(i) => this.handleContactAddChange(i)}/>
        <button class="btn" id="contact-add" onClick={() => this.updateUserContactList()}>Add a contact</button>
        <br />

        <h2>Session Management</h2>
        <button onClick={() => this.createNewSession()}>New Session</button>
        <button onClick={() => this.addUserToExisting()}>Add User To Existing</button>
        <h4>Username</h4>
        <input type="text" value={this.state.sessionUname} onChange={(i) => this.handleSessionInputChange(i,'u')}/>
        <h4>SessionID</h4>
        <input type="text" value={this.state.sessionId} onChange={(i) => this.handleSessionInputChange(i,'s')}/>
        <br />

        <input id="content-msg" type="text" value={this.state.value} onChange={(i) => this.handleInputChange(i)}/>
        <input id="target-msg" type="text" value={this.state.value} onChange={(i) => this.handleContactChange(i)}/>
        <button class="btn" id="msg-add" onClick={(i) => this.handleAdd(i)}>Send to Contact</button>
        <button class="btn" id="msg-add-group" onClick={(i) => this.handleGroupMessageAdd(i)}>Send to Group</button>
        <button class="btn" id="lock-view" onClick={(i) => this.handleLock(i)}>Toggle Key Locking</button>
        
        <div class="lock">Camera is currently {this.state.isCameraLocked ? 
          'LOCKED - typing will not move the camera' : 'UNLOCKED - you can interact with the world'}</div>
        <div id="controls">WASD to move. QE changes active contact. ZC changes active group. Use the Toggle Key Locking button to toggle these controls.</div>
        <div id="liveinfo">{this.state.staleLiveInfo ? this.state.liveInfo 
          : 'Send messages to known usernames using the box at the top.'}</div>
        
        <div id='scene-container'>
          {!(this.props.isUserLogin()) &&
            <div id='disabled-warn'>Login to enable interaction...</div>
          }
          <SceneTxt 
            txt={() => this.queryTxt()}
            movementsIn={() => this.queryMovement()}

            newMsg={() => this.queryNewMessages()}
            getRenderStaleness={() => this.queryRenderStaleness()}
            updateRenderStaleness ={(stale) => this.updateRenderStaleness(stale)}
            getActiveContactIndex = {() => this.queryActiveContactIndex()}
            fetchContact={() => this.queryContacts()}
            fetchContactStaleness={() => this.queryContactStaleness()}

            newGroupMsg={() => this.queryNewGroupMessages()}
            getGroupRenderStaleness={() => this.queryGroupRenderStaleness()}
            updateGroupRenderStaleness ={(stale) => this.updateGroupRenderStaleness(stale)}
            fetchGroups={() => this.queryGroups()}
            fetchGroupStaleness={() => this.queryGroupStaleness()}

            getFileRenderStaleness={() => this.queryFileStaleness()}
            updateFileRenderStaleness={() => this.updateFileRenderStaleness()}
            fetchSharedFiles={() => this.queryFilesShared()}
            getActiveFileIndex={() => this.queryFileSharedIndex()}

            isNewLogin={() => this.queryNewLogin()}
          />
        </div>
      </div>
    );
  }
}
