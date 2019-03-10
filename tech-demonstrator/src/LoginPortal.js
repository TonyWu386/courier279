import React from 'react';
import axios from 'axios';


const server = "http://localhost:3001";

export default class LoginPortal extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      username : null,
      password : null,
    }
  }

  SendToServer() {
    axios.post(server + "/signup/", {
      username: this.state.username,
      password: this.state.password,
    }).then((response) => {
      console.log("Success ", response);
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
        <button onClick={() => this.SendToServer()}>Send To Server</button>
      </div>
    );
  }
}
