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
    // TODO apparently it is bad style to copy props into state
    this.state = {
      txt: this.props.txt,
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
    const geometry = new THREE.BoxGeometry(2, 2, 2)

    const chatexture = document.createElement('canvas');
    chatexture.height = 256;
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

    camera.position.z = 4
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
    //txt updates
    
    this.canvascontext.clearRect(0, 0, this.canvastxt.width, this.canvastxt.height);
    this.canvascontext.fillStyle = "rgba(250,250,250,1)";
    this.canvascontext.fillRect(0, 0, this.canvastxt.width, this.canvastxt.height);
    this.canvascontext.fillStyle = "rgba(25,25,25,1)";
    this.canvascontext.fillText(this.state.txt(), 4, this.canvastxt.height/2);

    // TODO React probably has a way for us to not do this every frame
    // We don't need to, after all
    // flag this as needing a rerender
    this.texture.needsUpdate = true;
    this.material.map = this.texture;

    this.cube.rotation.y += 0.02

    this.renderScene()
    this.frameId = window.requestAnimationFrame(this.animate)
  }

  renderScene() {
    this.renderer.render(this.scene, this.camera)
  }

  render() {
    return (
      <div
        style={{ width: '400px', height: '400px' }}
        ref={(mount) => { this.mount = mount }}
      />
    )
  }
}
