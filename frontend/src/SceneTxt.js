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
    this.updateSceneRender = this.updateSceneRender.bind(this)
    this.updateDirectMsgScene = this.updateDirectMsgScene.bind(this);
    this.updateGroupMsgScene = this.updateGroupMsgScene.bind(this);
    this.getCurrentFacingAngle = this.getCurrentFacingAngle.bind(this);
    // TODO apparently it is bad style to copy props into state
    this.state = {
      txt: this.props.txt,
      movementsIn: this.props.movementsIn,
      createdSceneObj: [],
      createdSceneGroupObj: [],
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
    const renderer = new THREE.WebGLRenderer({ antialias: true });

    // == Handlers for dynamic writing ==

    const geometry = new THREE.BoxGeometry(4, 2, 1);
    const chatexture = document.createElement('canvas');
    chatexture.height = 256;
    this.linespacing = 32;
    chatexture.width = 256;
    const chatdraw = chatexture.getContext('2d');

    // initial text conditions
    chatdraw.font = "18px Helvetica";
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

    const writerCube = new THREE.Mesh(geometry, material);

    // == Handlers for dynamic UI ==

    const uiBox = new THREE.BoxGeometry(1, 0.5, 0.5);
    const uiCanvas = document.createElement('canvas');
    uiCanvas.height = 256;
    uiCanvas.width = 256;
    const uiContext = uiCanvas.getContext('2d');

    // initial text conditions
    uiContext.font = "14px Helvetica";
    uiContext.linewidth = 6;
    uiContext.fillStyle = "rgba(50,50,50,1)";
    uiContext.fillRect(0, 0, uiCanvas.width, uiCanvas.height);
    uiContext.fillStyle = "rgba(225,225,225,1)";
    uiContext.fillText("", 4, uiCanvas.height/2);

    const uiTex = new THREE.Texture(uiCanvas);
    // flag this as needing a rerender
    uiTex.needsUpdate = true;

    const uiMat = new THREE.MeshBasicMaterial({ map: uiTex })
    
    this.uiCanvas = uiCanvas;
    this.uiContext = uiContext;
    this.uiTex = uiTex;

    const uiScroll = new THREE.Mesh(uiBox, uiMat);

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
    new THREE.TextureLoader().load("texture/floorbasic.jpeg", function(texturef) {
      texturef.wrapS = THREE.RepeatWrapping;
      texturef.wrapT = THREE.RepeatWrapping;
      texturef.repeat.set(4,4);

      let floormaterial = new THREE.MeshBasicMaterial({map: texturef});

      texturef.needsUpdate = true;
      // takes radians
      floor.rotateX(- Math.PI / 2);
      floor.translate(0,-3,0);
      let floormesh = new THREE.Mesh(floor, floormaterial);
      scene.add(floormesh);
      console.log("loaded floor");
    });

    // add basic elements now

    camera.position.z = 8;
    camera.position.y = 2;
    scene.add(writerCube);
    scene.add(uiScroll);
    renderer.setClearColor('#000000');
    renderer.setSize(width, height);

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.material = material;
    this.writerCube = writerCube;
    this.uiScroll = uiScroll;
    this.uiMat = uiMat;

    this.mount.appendChild(this.renderer.domElement);
    this.start();
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
    if (this.state.movementsIn().left) this.camera.rotateY(0.05);
    if (this.state.movementsIn().right) this.camera.rotateY(-0.05);

    if (this.state.movementsIn().forward) this.camera.translateZ(-0.1);
    if (this.state.movementsIn().backward) this.camera.translateZ(0.1);

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

    // TODO perhaps find a way to not do this each frame
    // flag this as needing a rerender
    this.texture.needsUpdate = true;
    this.material.map = this.texture;

    // The below handles the in-canvas UI elements

    // do some text updates
    this.uiContext.clearRect(0, 0, this.uiCanvas.width, this.uiCanvas.height);
    this.uiContext.fillStyle = "rgba(50,50,50,1)";
    this.uiContext.fillRect(0, 0, this.uiCanvas.width, this.uiCanvas.height);
    this.uiContext.fillStyle = "rgba(225,225,225,1)";

    // grab the active, if there is one
    let activeI = this.props.getActiveContactIndex();
    let activeContactStr = (activeI >= 0 ? 
    this.props.fetchContact()[activeI].TargetUsername + " is the active contact"
    : 'There is no Active Contact');
    let nextContactStr = (activeI + 1 < this.props.fetchContact().length ? 
      "Next: " + this.props.fetchContact()[activeI + 1].TargetUsername
      : 'There is no Next Contact');
    let prevContactStr = (activeI - 1 >= 0 ? 
      "Prev: " + this.props.fetchContact()[activeI - 1].TargetUsername
      : 'There is no Previous Contact');

    let uiInfo = [prevContactStr, activeContactStr, nextContactStr];

    let uiSpace = 0;
    uiInfo.forEach(function(line) {
      uiSpace += (this.linespacing * 0.5);
      this.uiContext.fillText(line, 4, uiSpace);
    }.bind(this));

    this.uiTex.needsUpdate = true;
    this.uiMat.map = this.uiTex;

    // the writer cube should act as a pseudo UI, stick it up close to the camera.
    let newOffsetAngle = this.getCurrentFacingAngle();

    let zOffset = Math.cos(newOffsetAngle) * 3;
    let xOffset = Math.sin(newOffsetAngle) * 3;

    this.writerCube.position.x = this.camera.position.x + xOffset;
    this.writerCube.position.y = this.camera.position.y - 1.8;
    this.writerCube.position.z = this.camera.position.z + zOffset;

    this.writerCube.lookAt(this.camera.position.x, this.camera.position.y, this.camera.position.z);

    // Now do the same for other ui elements
    this.uiScroll.position.x = this.camera.position.x + xOffset * 0.5;
    this.uiScroll.position.y = this.camera.position.y + 0.8;
    this.uiScroll.position.z = this.camera.position.z + zOffset * 0.5;

    this.uiScroll.lookAt(this.camera.position.x, this.camera.position.y - 1, this.camera.position.z);

    // this'll go through and update any stale elements in the scene
    this.updateSceneRender();

    this.state.createdSceneObj.forEach(function(cubemsg) {
      // slow rotation of sent messages.
      cubemsg.rotation.y += 0.001;
    }.bind(this));

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

  randomLightColor() {
    // Thanks, stackoverflow #1484514
    let possible = '6789abcdef';
    let finalC = '#';
    for (let index = 0; index < 6; index++) { 
      finalC += possible[Math.floor(Math.random() * 10)];
    }
    return finalC;
  }

  getCurrentFacingAngle() {
    let facevector = new THREE.Vector3();
    this.camera.getWorldDirection(facevector);
    return Math.atan2(facevector.x, facevector.z);
  }

  updateDirectMsgScene() {
    // TODO break this off into dedicated functions, it smells bad to repeat it
    // distance to place messages away from camera
    const radius = 16;

    // draw in a circle, start from camera facing location.
    let newOffsetAngle = this.getCurrentFacingAngle();
    
    this.props.newMsg().forEach(function(toRender) {
      let geom = new THREE.BoxGeometry(4, 4, 4);
      let mat = new THREE.MeshBasicMaterial({ color : this.randomLightColor() });
      let newcube = new THREE.Mesh(geom, mat);

      this.tempctx.clearRect(0, 0, this.tempcanvas.width, this.tempcanvas.height);
      this.tempctx.fillStyle = "rgba(25,25,25,1)";
      this.tempctx.fillRect(0, 0, this.tempcanvas.width, this.tempcanvas.height);
      this.tempctx.fillStyle = "rgba(250,250,250,1)";
      // TODO wrap this text
      let wrapped = [toRender.sender + " says: ",toRender.text];
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
        
          newcube.material.map = texture;
          // draw em in as good a circle as possible
          
          let zOffset = Math.cos(newOffsetAngle) * radius;
          let xOffset = Math.sin(newOffsetAngle) * radius;
          newcube.position.z = this.camera.position.z + zOffset;
          newcube.position.x = this.camera.position.x + xOffset;
          newcube.position.y = this.camera.position.y;
          console.log("Z" + zOffset + "X" + xOffset);
          newOffsetAngle += (Math.PI / 8);
          this.scene.add(newcube);
          this.setState((old) => ({
            createdSceneObj : [...old.createdSceneObj, newcube],
          }));
          console.log("Updated cubes dynamically - there are " + this.state.createdSceneObj.length);
        }.bind(this), undefined, function (err) {
          console.error("Something bad happened while loading texture!");
        });
      }.bind(this));

    }.bind(this));
  }

  updateGroupMsgScene() {
    let newOffset = 0;
    this.props.newGroupMsg().forEach(function(toRender) {
      let geom = new THREE.BoxGeometry(5, 5, 5);
      let mat = new THREE.MeshBasicMaterial({ color : this.randomLightColor() });
      let newcube = new THREE.Mesh(geom, mat);

      this.tempctx.clearRect(0, 0, this.tempcanvas.width, this.tempcanvas.height);
      this.tempctx.fillStyle = "rgba(25,25,25,1)";
      this.tempctx.fillRect(0, 0, this.tempcanvas.width, this.tempcanvas.height);
      this.tempctx.fillStyle = "rgba(250,250,250,1)";
      // TODO wrap this text
      let wrapped = ["From Group: " + toRender.GroupID, toRender.sender + " says: ",toRender.text];
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
        
          newcube.material.map = texture;
          newcube.position.z = this.camera.position.z - 12;
          newcube.position.x = this.camera.position.x + newOffset;
          newcube.position.y = this.camera.position.y + 2;

          newOffset += 5;
          this.scene.add(newcube);
          this.setState((old) => ({
            createdSceneGroupObj : [...old.createdSceneGroupObj, newcube],
          }));
          console.log("Updated Group cubes dynamically - there are " + this.state.createdSceneGroupObj.length);
        }.bind(this), undefined, function (err) {
          console.error("Something bad happened while loading texture!");
        });
      }.bind(this));

    }.bind(this));
  }

  updateSceneRender() {
    // decide which aspects needs re-rendering.

    if (this.props.getRenderStaleness()) {
      // Remove old messages, we need them not.
      let tempDirect = this.state.createdSceneObj;
      this.setState({
        createdSceneObj : [],
      }, () => {
        tempDirect.forEach(function(cubemsg) {
          // Properly dispose of all the old  elements to avoid memory leaks
          this.scene.remove(cubemsg);
          cubemsg.geometry.dispose();
          cubemsg.material.map.dispose();
          cubemsg.material.dispose();
        }.bind(this));
      });

      // handle fine details of adding new objects to the scene
      this.updateDirectMsgScene();
      // clear render state
      this.props.updateRenderStaleness(false);
      console.log("Redrew stale directmsgs");
    }

    if (this.props.getGroupRenderStaleness()) {
      let tempGroup = this.state.createdSceneGroupObj;

      this.setState({
        createdSceneGroupObj : [],
      }, () => {
        tempGroup.forEach(function(cubemsg) {
          this.scene.remove(cubemsg);
          cubemsg.geometry.dispose();
          cubemsg.material.map.dispose();
          cubemsg.material.dispose();
        }.bind(this));
      });

      this.updateGroupMsgScene();
      this.props.updateGroupRenderStaleness(false);
      console.log("Redrew stale groups");
    }

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
