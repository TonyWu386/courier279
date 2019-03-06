import React from 'react';
import './index.css';


import Scene from './Scene.js';


export default class SceneController extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      speed: 0.1,
    }
  }

  handleInputChange(event) {
    this.setState({
      speed : (isNaN(parseFloat(event.target.value)))? '0.1' : parseFloat(event.target.value),
    }, () => {
      console.log('speed ', this.state.speed);
    });
  }

  querySpeed() {
    return this.state.speed
  }

  render() {
    return (
      <div>
        <input type="text" value={this.state.value} onChange={(i) => this.handleInputChange(i)}/>
        <Scene 
          speed={() => this.querySpeed()}
        />
      </div>
    );
  }
}
