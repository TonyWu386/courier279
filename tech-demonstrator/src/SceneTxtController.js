import React from 'react';
import './index.css';


import SceneTxt from './SceneTxt.js';


export default class SceneTxtController extends React.Component {
  constructor(props) {
    super(props)

    this.handleKeyD = this.handleKeyDown.bind(this);
    this.handleKeyU = this.handleKeyUp.bind(this);

    this.state = {
      txt: "Text goes here",
      existingMsg: [],
      movements: {forward: false, backward: false, right: false, left: false},
      isCameraLocked: false,
      hasBeenChanged: false, // currently unused. Will want later
      staleLiveInfo: false,
      liveInfo: '',
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

  handleAdd(e) {
    // Basic frontend check that non-auth users can't do anything
    if (this.props.isUserLogin()) {

      // be very careful with immutability
      this.setState((old) => ({
        staleLiveInfo: true,
        liveInfo: "Message Sent...",
        existingMsg : [...old.existingMsg, old.txt],
      }), () => {
        // TODO handle pushing the new MSG to db by calling the helper below
        // this.pushUserMessage();
        console.log('says ', this.state.existingMsg);
      });
    } else {
      this.setState({
        staleLiveInfo: true,
        liveInfo: "You must be logged in to send messages",
      })
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
    // TODO corresponds to backend GET for this user
    // grab the messages
    // Unencrypt them with the relevant keys (which should be passed down)
    // and store the result inside of this.state.existingMsg so they can be drawn
  }

  pushUserMessage() {
    // TODO corresponds to backend POST for this user
    // convert the message to a form the backend understands
    // needs a target_username field... need a UI elem for this still...
    // encrypt the message before sending
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
        <input id="target-msg" type="text" value={this.state.value}/>
        <button class="btn" id="msg-add" onClick={(i) => this.handleAdd(i)}>Add</button>
        <button class="btn" id="lock-view" onClick={(i) => this.handleLock(i)}>Toggle Camera Locking</button>
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
