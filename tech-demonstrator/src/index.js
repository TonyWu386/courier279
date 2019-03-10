import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import nacl from 'tweetnacl';
import util from 'tweetnacl-util';


import SceneController from './SceneController.js';
import LoginPortal from './LoginPortal';



function calculateWinner(squares) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];

    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c])
    {
      return squares[a];
    }
  }
  return null;
}

function Square(props) {
  return (
    <button className="square" onClick={props.onClick}>
      {props.value}
    </button>
  );
}





class Board extends React.Component {
  
  renderSquare(i) {
    return <Square value={this.props.squares[i]}
             onClick={() => this.props.onClick(i)}
             />;
  }

  render() {
    return (
      <div>
        <div className="board-row">
          {this.renderSquare(0)}
          {this.renderSquare(1)}
          {this.renderSquare(2)}
        </div>
        <div className="board-row">
          {this.renderSquare(3)}
          {this.renderSquare(4)}
          {this.renderSquare(5)}
        </div>
        <div className="board-row">
          {this.renderSquare(6)}
          {this.renderSquare(7)}
          {this.renderSquare(8)}
        </div>
      </div>
    );
  }
}






class PubKeyObj extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      public_key: null,
      private_key: null,
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
      output_value: this.state.output_value,
    });
  }

  handleComClick() {
    const key = nacl.hash(util.decodeUTF8(this.props.password)).slice(0, nacl.secretbox.keyLength);
    const message = util.decodeUTF8(this.state.input_value);
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const ciphertext = nacl.secretbox(message, nonce, key);

    this.setState({
      input_value: this.state.input_value,
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

    if (calculateWinner(squares) || squares[i]) {
      return;
    }
    squares[i] = (this.state.xIsNext)? 'X' : 'O';
    this.setState({
      history: history.concat([{
        squares: squares,
      }]),
      xIsNext: !this.state.xIsNext,
      cryptResult: this.state.cryptResult,
    });
  }

  handleCryptResult(result) {
    this.setState({
      history: this.state.history,
      xIsNext: this.state.xIsNext,
      cryptResult: result,
    });
  }

  handleSubmit(event){
    event.preventDefault();
  }

  render() {
    const history = this.state.history;
    const current = history[history.length - 1];
    const winner = calculateWinner(current.squares);

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
    if (winner) {
      status = 'Winner: ' + winner;
    } else {
      status = 'Next player: ' + ((this.state.xIsNext)? 'X' : 'O');
    }

    let cryptResult = this.state.cryptResult;

    return (
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
        <div className="game-board">
          <Board 
            squares={current.squares}
            onClick={(i) => this.handleClick(i)}
          />
        </div>
        <div className="threejs-canvas">
          <SceneController/>
        </div>
        <div className="game-info">
          <div>{status}</div>
          <ol>{moves}</ol>
        </div>
        <LoginPortal/>
      </div>
    );
  }
}

// ========================================

ReactDOM.render(
  <Webapp />,
  document.getElementById('root')
);
