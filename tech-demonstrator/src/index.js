import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import nacl from 'tweetnacl';
import util from 'tweetnacl-util';


import SceneTxtCtrl from './SceneTxtController.js';
import LoginPortal from './LoginPortal.js';

// TODO need to sort through and delete stuff we don't actually need
class PubKeyObj extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      public_key: null,
      private_key: null,
      pubkey: null,
      privkey: null,
    };
  }

  generateKeyPair() {
    const keypair = nacl.box.keyPair();
    this.setState({
      public_key: keypair.publicKey,
      private_key: keypair.secretKey,
    });
  }

  render() {
    let public_key = (this.state.public_key)? util.encodeBase64(this.state.public_key) : '';
    let private_key = (this.state.private_key)? util.encodeBase64(this.state.private_key) : '';

    return(
      <div>
        <button onClick={() => this.generateKeyPair()}>Generate EC Keypair</button>
        <h2>Pub Key Encryption Demo</h2>
        <h6>Key Pub {public_key}</h6>
        <h6>Key Priv {private_key}</h6>
      </div>
    );
  }
}



class CryptObj extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      input_value: 'place filler',
      output_value: 'place filler',
    };
  }

  handleInputChange(event) {
    this.setState({
      input_value: event.target.value,
    });
  }

  handleComClick() {
    const key = nacl.hash(util.decodeUTF8(this.props.password)).slice(0, nacl.secretbox.keyLength);
    const message = util.decodeUTF8(this.state.input_value);
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const ciphertext = nacl.secretbox(message, nonce, key);

    this.setState({
      output_value: util.encodeBase64(ciphertext),
    }, () => {
      this.props.handleCryptResult(this.state.output_value);
    });
  }

  render() {
    let ciphertext = this.state.output_value;

    return (
      <div>
        <h2>Symm Encryption Demo</h2>
        <button onClick={() => this.handleComClick()}>Encrypt Symm</button>
        <h4>{ciphertext}</h4>
        <form onSubmit={this.handleSubmit}>
          Symm Encrypt Input
          <input type="text" value={this.state.value} onChange={(i) => this.handleInputChange(i)}/>
        </form>
      </div>
    )
  };
}




class Webapp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      history: [{
        squares: Array(9).fill(null),
      }],
      xIsNext: true,
      cryptResult: '',
    };
  }

  handleClick(i) {
    const history = this.state.history;
    const current = history[history.length - 1];
    const squares = current.squares.slice();

    squares[i] = (this.state.xIsNext)? 'X' : 'O';
    this.setState({
      history: history.concat([{
        squares: squares,
      }]),
      xIsNext: !this.state.xIsNext,
    });
  }

  handleCryptResult(result) {
    this.setState({
      cryptResult: result,
    });
  }

  handleSubmit(event){
    event.preventDefault();
  }

  setCryptData(pubkey, privkey) {
    this.setState({
      pubkey: pubkey,
      privkey: privkey,
    });
    console.log("Set crypt info in index.js done");
  }

  render() {
    const history = this.state.history;

    const keypair = nacl.box.keyPair();
    console.log(keypair);

    const moves = history.map((step, move) => {
      const desc = move ?
        'Go to move #' + move :
        'Go to game start';
      return (
        <li>
          <button onClick={() => this.jumpTo(move)}>{desc}</button>
        </li>
      );
    });

    let status;

    let cryptResult = this.state.cryptResult;

    return (
      <div className="contain-all">
        <div className="game">
          <div className="crypt-obj">
            <CryptObj
              password="abcdef"
              handleCryptResult={(result) => this.handleCryptResult(result)}
            />
          </div>
          <div className="pubkey-obj">
            <PubKeyObj/>
          </div>
          <h4>Outside Crypt Result: {cryptResult}</h4>
          <div className="game-info">
            <div>{status}</div>
            <ol>{moves}</ol>
          </div>
        </div>
        <br />
        <div className="login-contain">
          <div className="instructext">Sign in to view messages</div>
          <LoginPortal
            setCryptData={(pubkey, privkey) => this.setCryptData(pubkey, privkey)}
          />
        </div>
        <br />
        <div className="threejs-text">
            <SceneTxtCtrl/>
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
