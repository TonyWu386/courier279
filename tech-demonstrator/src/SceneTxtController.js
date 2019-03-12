import React from 'react';
import './index.css';


import SceneTxt from './SceneTxt.js';


export default class SceneTxtController extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      txt: "Text goes here",
    }
  }

  handleInputChange(event) {
    this.setState({
      txt : event.target.value,
    }, () => {
      console.log('says ', this.state.txt);
    });
  }

  queryTxt() {
    return this.state.txt
  }

  render() {
    return (
      <div>
        <input type="text" value={this.state.value} onChange={(i) => this.handleInputChange(i)}/>
        <SceneTxt 
          txt={() => this.queryTxt()}
        />
      </div>
    );
  }
}
