import { Vector3 } from 'three';
import * as THREE from '../node_modules/three/build/three.module.js';
import { OrbitControls } from '../node_modules/three/examples/jsm/controls/OrbitControls.js';
// import { OrbitControls } from '../js/OrbitControls.js'


let camera, controls, scene, renderer, leader;

var mouse = {x: 0, y: 0};
var boids = [];
var visualRange = 75
var matchingFactor = 0.05; // Adjust by this % of average velocity
var minDistance = 20; // The distance to stay away from other boids
var centeringFactor = 0.005; // adjust velocity by this %
let width = 500;
let height = 500;
let depth = 500;

var geometry, material;

document.querySelector("#slider3").value = matchingFactor * 100
document.querySelector("#slider3").onchange = (e) => matchingFactor = e.target.value / 100
document.querySelector("#slider2").value = minDistance
document.querySelector("#slider2").onchange = (e) => minDistance = e.target.value
document.querySelector("#slider1").value = centeringFactor * 1000
document.querySelector("#slider1").onchange = (e) => centeringFactor = e.target.value / 1000
document.querySelector("#slider4").value = visualRange
document.querySelector("#slider4").onchange = (e) => visualRange = e.target.value
document.querySelector("#add").onclick = () => makeBoid(geometry, material)
document.querySelector("#delete").onclick = deleteBoid

init();
render(); // remove when using next line for animation loop (requestAnimationFrame)
animate();



function init() {

  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x006994 );
  // scene.fog = new THREE.FogExp2( 0xcccccc, 0.002 );

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );

  camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 1000 );
  camera.position.set( 400, 200, 0 );

  // controls
  geometry = new THREE.CylinderGeometry( 3, 1, 10, 8, 1 );
  material = new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true } );

  controls = new OrbitControls( camera, renderer.domElement );
  controls.listenToKeyEvents( window ); // optional

  //controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)

  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = 0.05;

  controls.screenSpacePanning = false;

  controls.minDistance = 100;
  controls.maxDistance = 500;

  controls.maxPolarAngle = Math.PI / 2;

  // world



  for ( let i = 0; i < 20; i ++ ) {

    makeBoid(geometry, material)

  }

  // special pointer sphere
  // leader = new THREE.Mesh( new THREE.SphereGeometry( 5, 100, 10, 0, 2*Math.PI, 0, Math.PI ) , material );
  // leader.position.x = 0;
  // leader.position.y = 0;
  // leader.position.z = 0;
  // leader.updateMatrix();
  // leader.matrixAutoUpdate = false;
  // scene.add( leader );

  // let cube = new THREE.Mesh( 
  //    , 
  //   new THREE.MeshPhongMaterial({ color: 0xffff00, flatShading: true, wireframe: true }) );
  const edges = new THREE.EdgesGeometry( new THREE.BoxGeometry( width, height, depth) );
  const cube = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( { color: 0xffffff } ) );
  cube.position.x = 0;
  cube.position.y = 0;
  cube.position.z = 0;
  cube.updateMatrix();
  cube.matrixAutoUpdate = false;
  scene.add( cube );

  // lights

  const dirLight1 = new THREE.DirectionalLight( 0xffffff );
  dirLight1.position.set( 1, 1, 1 );
  scene.add( dirLight1 );

  const dirLight2 = new THREE.DirectionalLight( 0x002288 );
  dirLight2.position.set( - 1, - 1, - 1 );
  scene.add( dirLight2 );

  const ambientLight = new THREE.AmbientLight( 0x222222 );
  scene.add( ambientLight );

  //

  window.addEventListener( 'resize', onWindowResize );
  // document.addEventListener('mousemove', onMouseMove, false);

}

function makeBoid(geometry, material) {
  const mesh = new THREE.Mesh( geometry, material );
  mesh.position.x = Math.random() * width - width/2;
  mesh.position.y = Math.random() * width - width/2;
  mesh.position.z = Math.random() * width - width/2;
  mesh.updateMatrix();
  mesh.matrixAutoUpdate = false;
  mesh.up = new Vector3(0, 1, 0)
  mesh.velocity = new THREE.Vector3(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5)
  boids.push(mesh)
  scene.add( mesh );
}

function deleteBoid() {
  scene.remove(boids.pop())
}

function onMouseMove(event) {
  console.log(event)
	// Update the mouse variable
	event.preventDefault();
	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

 // Make the sphere follow the mouse
  var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
	vector.unproject( camera );
	var dir = vector.sub( camera.position ).normalize();
	var distance = - camera.position.z / dir.z;
	var pos = camera.position.clone().add( dir.multiplyScalar( distance ) );
	leader.position.copy(pos);
  leader.updateMatrix();
  
	// Make the sphere follow the mouse
//	mouseMesh.position.set(event.clientX, event.clientY, 0);
};

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

}


function animate() {
  var zero = new Vector3();
  requestAnimationFrame( animate );
  for (let boid of boids) {
    flyTowardsCenter(boid);
    avoidOthers(boid);
    matchVelocity(boid);
    limitSpeed(boid);
    keepWithinBounds(boid);
    boid.position.add(boid.velocity)
    boid.lookAt(boid.position.clone().add(boid.velocity).multiplyScalar(5) )
    boid.updateMatrix()
  }

  controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

  render();

}

function flyTowardsCenter(boid) {
  

  let center = new THREE.Vector3()
  let numNeighbors = 0;

  for (let otherBoid of boids) {
    if (boid.position.distanceTo(otherBoid.position) < visualRange) {
      center.add(otherBoid.position)
      numNeighbors += 1;
    }
  }

  if (numNeighbors) {

    center.divideScalar(numNeighbors)

    boid.velocity.add(center.clone().sub(boid.position).multiplyScalar(centeringFactor))
  }
}

function avoidOthers(boid) {

  const avoidFactor = 0.05; // Adjust velocity by this %

  let move = new THREE.Vector3()
  for (let otherBoid of boids) {
    if (otherBoid !== boid) {
      if (boid.position.distanceTo(otherBoid.position) < minDistance) {

        move.add(boid.position).sub(otherBoid.position)
      }
    }
  }


  boid.velocity.add(move.multiplyScalar(avoidFactor))
}

function matchVelocity(boid) {
  let avg = new THREE.Vector3()
  let numNeighbors = 0;

  for (let otherBoid of boids) {
    if (boid.position.distanceTo(otherBoid.position) < visualRange) {
      avg.add(otherBoid.velocity)
      numNeighbors += 1;
    }
  }

  if (numNeighbors) {
    avg.divideScalar(numNeighbors)
    boid.velocity.add(avg.sub(boid.velocity).multiplyScalar(matchingFactor))
  }
}

function limitSpeed(boid) {
  const speedLimit = 5;

  const speed = boid.velocity.length()
  if (speed > speedLimit) {
    boid.velocity.divideScalar(speed).multiplyScalar(speedLimit)
  }
}

function keepWithinBounds(boid) {
  const margin = 100;
  const turnFactor = 1;

  if (boid.position.x < -width/2 + margin) {
    boid.velocity.x += turnFactor;
  }
  if (boid.position.x > width/2 - margin) {
    boid.velocity.x -= turnFactor
  }
  if (boid.position.y < -height/2 + margin) {
    boid.velocity.y += turnFactor;
  }
  if (boid.position.y > height/2 - margin) {
    boid.velocity.y -= turnFactor;
  }
  if (boid.position.z < -depth/2 + margin) {
    boid.velocity.z += turnFactor;
  }
  if (boid.position.z > depth/2 - margin) {
    boid.velocity.z -= turnFactor;
  }
}


function render() {

  renderer.render( scene, camera );

}