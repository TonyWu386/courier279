import React from 'react';
import './index.css';

import * as THREE from 'three';

// TODO react also generally prefers composition over inheritance
export default class SceneTxt extends React.Component {
  constructor(props) {
    super(props)

    this.start = this.start.bind(this)
    this.stop = this.stop.bind(this)
    this.animate = this.animate.bind(this)
    this.textwrap = this.textwrap.bind(this)
    // TODO apparently it is bad style to copy props into state
    this.state = {
      txt: this.props.txt,
      msgs: this.props.msgs,
      movementsIn: this.props.movementsIn,
      createdSceneObj: [],
    }
  }

  componentDidMount() {
    const width = this.mount.clientWidth
    const height = this.mount.clientHeight

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      75,
      width / height,
      0.1,
      1000
    )
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    const geometry = new THREE.BoxGeometry(3, 3, 3)

    // == Handlers for dynamic writing ==

    const chatexture = document.createElement('canvas');
    chatexture.height = 256;
    this.linespacing = 32;
    chatexture.width = 256;
    const chatdraw = chatexture.getContext('2d');

    // initial text conditions
    chatdraw.font = "30px Helvetica";
    chatdraw.linewidth = 5;
    chatdraw.fillStyle = "rgba(250,250,250,1)";
    chatdraw.fillRect(0, 0, chatexture.width, chatexture.height);
    chatdraw.fillStyle = "rgba(25,25,25,1)";
    chatdraw.fillText(this.state.txt(), 4, chatexture.height/2);

    const threetext = new THREE.Texture(chatexture);
    // flag this as needing a rerender
    threetext.needsUpdate = true;

    const material = new THREE.MeshBasicMaterial({ map: threetext })
    
    this.canvastxt = chatexture;
    this.canvascontext = chatdraw;
    this.texture = threetext;

    const cube = new THREE.Mesh(geometry, material)

    // To avoid having a bunch of static canvases, have one public temp canvas
    const tempcanvas = document.createElement('canvas');
    tempcanvas.height = chatexture.height;
    tempcanvas.width = chatexture.width;
    const tempctx = tempcanvas.getContext('2d');
    // TODO set alpha to false
    // text conditions for stuff generated on the fly
    tempctx.font = "24px Helvetica";
    tempctx.linewidth = 5;
    tempctx.fillStyle = "rgba(25,25,25,1)";
    tempctx.fillRect(0, 0, tempcanvas.width, tempcanvas.height);
    tempctx.fillStyle = "rgba(250,250,250,1)";
    tempctx.fillText(this.state.txt(), 4, tempcanvas.height/2);

    this.tempcanvas = tempcanvas;
    this.tempctx = tempctx;

    // == Handlers for the floor ==

    let floor = new THREE.PlaneGeometry(200, 200, 10, 10);
    let floormaterial = new THREE.MeshBasicMaterial({color: 0xfffaaa});
    // takes radians
    floor.rotateX(- Math.PI / 2);
    floor.translate(0,-8,0);
    let floormesh = new THREE.Mesh(floor, floormaterial);
    scene.add(floormesh);

    // Ultra basic camera movements

    
    // add basic elements now

    camera.position.z = 8
    camera.position.y = 2
    scene.add(cube)
    renderer.setClearColor('#000000')
    renderer.setSize(width, height)

    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    this.material = material
    this.cube = cube

    this.mount.appendChild(this.renderer.domElement)
    this.start()
  }

  componentWillUnmount() {
    this.stop()
    this.mount.removeChild(this.renderer.domElement)
  }

  start() {
    if (!this.frameId) {
      this.frameId = requestAnimationFrame(this.animate)
    }
  }

  stop() {
    cancelAnimationFrame(this.frameId)
  }

  animate() {
    // movement updates
    if (this.state.movementsIn().forward) this.camera.translateZ(-0.1);
    if (this.state.movementsIn().left) this.camera.translateX(-0.1);
    if (this.state.movementsIn().backward) this.camera.translateZ(0.1);
    if (this.state.movementsIn().right) this.camera.translateX(0.1);

    // txt updates
    
    this.canvascontext.clearRect(0, 0, this.canvastxt.width, this.canvastxt.height);
    this.canvascontext.fillStyle = "rgba(250,250,250,1)";
    this.canvascontext.fillRect(0, 0, this.canvastxt.width, this.canvastxt.height);
    this.canvascontext.fillStyle = "rgba(25,25,25,1)";
    // text wrap processing, should be elsewhere??
    let wrapped = this.textwrap();
    let space = 0;

    wrapped.forEach(function(line) {
      // there is no decent built in height field...
      space += this.linespacing;
      this.canvascontext.fillText(line, 4, space);
    }.bind(this));

    // TODO React probably has a way for us to not do this every frame
    // We don't need to, after all
    // flag this as needing a rerender
    this.texture.needsUpdate = true;
    this.material.map = this.texture;

    this.cube.rotation.y += 0.02;


    // update # objects
    let msgslength = this.state.msgs().length;
    let newcube = this.cube.clone();
    
    // TODO thisisterrible.jpg, we want something like a stale state
    if (this.state.createdSceneObj.length < msgslength) {
      // VERY IMPORTANT, STATE SETTING IS ASYNC
      this.setState((old) => ({
        createdSceneObj : [...old.createdSceneObj, newcube],
      }), () => {
        // TODO extremely rough. testing only.
        // we'd actually want a smart detection of placements and text

        this.tempctx.clearRect(0, 0, this.tempcanvas.width, this.tempcanvas.height);
        this.tempctx.fillStyle = "rgba(25,25,25,1)";
        this.tempctx.fillRect(0, 0, this.tempcanvas.width, this.tempcanvas.height);
        this.tempctx.fillStyle = "rgba(250,250,250,1)";
        // TODO temporary, rework textwraap to not be crappy hardcoded
        let wrapped = this.state.msgs().slice(-1);
        let space = 0;

        wrapped.forEach(function(line) {
          // there is no decent built in height field...
          space += this.linespacing;
          this.tempctx.fillText(line, 4, space);
        }.bind(this));

        // Dealing with async loading
        this.tempcanvas.toBlob(function(blob) {
          let imageUrl = URL.createObjectURL(blob);
          new THREE.TextureLoader().load(imageUrl, function (texture) {
            // only load material if texture is ready
            texture.needsUpdate = true;
            const materiattemp = new THREE.MeshBasicMaterial({ map: texture });
          
            newcube.material = materiattemp;
            newcube.position.z = msgslength * 5;
            this.scene.add(newcube);
            console.log("Updated cubes dynamically - there are " + this.state.createdSceneObj.length);
          }.bind(this), undefined, function (err) {
            console.error("Something bad happened while loading texture!");
          });
        }.bind(this));
        
      });
    }

    // TODO removal case

    this.renderScene();
    this.frameId = window.requestAnimationFrame(this.animate);
  }

  renderScene() {
    this.renderer.render(this.scene, this.camera)
  }

  render() {
    return (
      <div
        style={{ width: '900px', height: '900px' }}
        ref={(mount) => { this.mount = mount }}
      />
    )
  }

  textwrap() {
    // some credits to stackoverflow
    // split by words so we don't cutoff
    // TODO does NOT react well to multiple spaces
    let tokens = this.state.txt().split(" ");
    let wrappedbyline = [];
    let curline = tokens[0];

    // JS witchcraft
    let widefunc =  function(token) {
      // do not want to exceed canvas width
      // TODO quite crude and does not account for space length
      let wordslen = this.canvascontext.measureText(curline + " " + token).width;
      // Set a buffer zone so text does not go right to the edge
      // TODO smarter edge detection
      if (wordslen > this.canvastxt.width - 32) {
        // too long, new line
        wrappedbyline.push(curline);
        curline = token;
      } else {
        // add to line
        curline += " " + token;
      }
    }.bind(this);

    tokens.slice(1).forEach(widefunc);
    // push final line
    wrappedbyline.push(curline);
    return wrappedbyline;
  }
}
