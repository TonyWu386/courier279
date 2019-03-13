import React from 'react';
import './index.css';


import SceneTxt from './SceneTxt.js';


export default class SceneTxtController extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      txt: "Text goes here",
      existingMsg: [],
      hasBeenChanged: false, // currently unused. Will want later
    }
  }

  handleInputChange(event) {
    this.setState({
      txt : event.target.value,
    }, () => {
      console.log('says ', this.state.txt);
    });
  }

  handleAdd(e) {
    // be very careful with immutability
    this.setState((old) => ({
      existingMsg : [...old.existingMsg, old.txt],
    }), () => {
      console.log('says ', this.state.existingMsg);
    });
  }

  queryMsg() {
    return this.state.existingMsg
  }

  queryTxt() {
    return this.state.txt
  }

  render() {
    return (
      <div>
        <input type="text" value={this.state.value} onChange={(i) => this.handleInputChange(i)}/>
        <button class="btn" id="msg-add" onClick={(i) => this.handleAdd(i)}>Add</button>
        <SceneTxt 
          txt={() => this.queryTxt()}
          msgs={() => this.queryMsg()}
        />
      </div>
    );
  }
}
