/// <reference path="_reference.ts"/>

/* 
MAIN GAME FILE
Source file	name:       game.ts
Author’s name:	        George Savcheko and Jason Gunter
Last modified by:       George Savchenko
Date last modified:     2016-03-23
Program	description:    Create your own simple First Person Perspective game. The game must include hazards for the player to avoid. A scoring
                        system must also be included. You must build your own graphic and sound assets. You must use ThreeJS and a JavaScript 
                        Physics Engine to build your game. 
Revision history:       fixed rotation, added walls, made room
THREEJS Aliases
*/
import Scene = Physijs.Scene;
import Renderer = THREE.WebGLRenderer;
import PerspectiveCamera = THREE.PerspectiveCamera;
import BoxGeometry = THREE.BoxGeometry;
import CubeGeometry = THREE.CubeGeometry;
import PlaneGeometry = THREE.PlaneGeometry;
import SphereGeometry = THREE.SphereGeometry;
import Geometry = THREE.Geometry;
import AxisHelper = THREE.AxisHelper;
import LambertMaterial = THREE.MeshLambertMaterial;
import MeshBasicMaterial = THREE.MeshBasicMaterial;
import Material = THREE.Material;
import Mesh = THREE.Mesh;
import Object3D = THREE.Object3D;
import SpotLight = THREE.SpotLight;
import PointLight = THREE.PointLight;
import AmbientLight = THREE.AmbientLight;
import Control = objects.Control;
import GUI = dat.GUI;
import Color = THREE.Color;
import Vector3 = THREE.Vector3;
import Face3 = THREE.Face3;
import Point = objects.Point;
import CScreen = config.Screen;
import Clock = THREE.Clock;
//import TextGeometry = THREE.TextGeometry;

//Custom Game Objects
import gameObject = objects.gameObject;

// Setup a Web Worker for Physijs
Physijs.scripts.worker = "/Scripts/lib/Physijs/physijs_worker.js";
Physijs.scripts.ammo = "/Scripts/lib/Physijs/examples/js/ammo.js";


// setup an IIFE structure (Immediately Invoked Function Expression)
var game = (() => {
    
    // declare game objects
    var havePointerLock: boolean;
    var element: any;
    var scene: Scene = new Scene(); // Instantiate Scene Object
    var renderer: Renderer;
    var camera: PerspectiveCamera;
    var control: Control;
    var gui: GUI;
    var stats: Stats;
    var blocker: HTMLElement;
    var instructions: HTMLElement;
    var spotLight: SpotLight;
    var groundGeometry: CubeGeometry;
    var groundMaterial: Physijs.Material;
    var ground: Physijs.Mesh;
    var clock: Clock;
    var playerGeometry: CubeGeometry;
    var playerMaterial: Physijs.Material;
    var player: Physijs.Mesh;
    var sphereGeometry: SphereGeometry;
    var sphereMaterial: Physijs.Material;
    var sphere: Physijs.Mesh;
    var coin: Physijs.Mesh;
    var coinGeo: SphereGeometry;
    var coinMaterial: Physijs.Material;
    var keyboardControls: objects.KeyboardControls;
    var mouseControls: objects.MouseControls;
    var isGrounded: boolean;
    var velocity: Vector3 = new Vector3(0, 0, 0);
    var prevTime: number = 0;
    var lives = 1;
    var score = 0;
    var livesText;
    var collidableMeshList = [];
    var boulders: Physijs.Mesh[] = [];

    function init() {
        coin = undefined; //trust me :) - jgunter
        // Create to HTMLElements
        blocker = document.getElementById("blocker");
        instructions = document.getElementById("instructions");
        
        updateLives();
        //check to see if pointerlock is supported
        havePointerLock = 'pointerLockElement' in document ||
            'mozPointerLockElement' in document ||
            'webkitPointerLockElement' in document;

        keyboardControls = new objects.KeyboardControls();
        mouseControls = new objects.MouseControls();

        if (havePointerLock) {
            element = document.body;

            instructions.addEventListener('click', () => {

                // Ask the user for pointer lock
                console.log("Requesting PointerLock");

                element.requestPointerLock = element.requestPointerLock ||
                    element.mozRequestPointerLock ||
                    element.webkitRequestPointerLock;

                element.requestPointerLock();
            });

            document.addEventListener('pointerlockchange', pointerLockChange);
            document.addEventListener('mozpointerlockchange', pointerLockChange);
            document.addEventListener('webkitpointerlockchange', pointerLockChange);
            document.addEventListener('pointerlockerror', pointerLockError);
            document.addEventListener('mozpointerlockerror', pointerLockError);
            document.addEventListener('webkitpointerlockerror', pointerLockError);
        }

        // Scene changes for Physijs
        scene.name = "Main";
        scene.fog = new THREE.Fog(0xffffff, 0, 750);
        scene.setGravity(new THREE.Vector3(0, -10, 0));

        scene.addEventListener('update', () => {
            scene.simulate(undefined, 2);
        });

        // setup a THREE.JS Clock object
        clock = new Clock();

        setupRenderer(); // setup the default renderer

        setupCamera(); // setup the camera


        // Spot Light
        spotLight = new SpotLight(0xffffff);
        spotLight.position.set(0, 150, 0);
        spotLight.castShadow = true;
        spotLight.intensity = 1;
        spotLight.lookAt(new Vector3(0, 10, 0));
        spotLight.shadowCameraNear = 2;
        spotLight.shadowCameraFar = 200;
        spotLight.shadowCameraLeft = -5;
        spotLight.shadowCameraRight = 5;
        spotLight.shadowCameraTop = 5;
        spotLight.shadowCameraBottom = -5;
        spotLight.shadowMapWidth = 2048;
        spotLight.shadowMapHeight = 2048;
        spotLight.shadowDarkness = 0.5;
        spotLight.name = "Spot Light";
        scene.add(spotLight);
        console.log("Added spotLight to scene");

        // Burnt Ground
        groundGeometry = new BoxGeometry(50, 1, 50);
        var wallGeo = new BoxGeometry(50, 1, 15);
        groundMaterial = Physijs.createMaterial(new LambertMaterial({ color: 0x3498db }), 0, 0);            
        ground = new Physijs.ConvexMesh(groundGeometry, groundMaterial, 0);
        ground.receiveShadow = true;
        ground.name = "Ground";
        scene.add(ground);
        console.log("Added Burnt Ground to scene");
        
        var wall = new Physijs.ConvexMesh(wallGeo, groundMaterial, 0);
        wall.receiveShadow = true;
        wall.name = "Wall1";
        wall.rotation.x = Math.PI / 2;;
        wall.position.set(0,7,-25);
        scene.add(wall);
        
        var wall2 = new Physijs.ConvexMesh(wallGeo, groundMaterial, 0);
        wall2.receiveShadow = true;
        wall2.name = "Wall2";
        wall2.rotation.x = -Math.PI / 2;;
        wall2.position.set(0,7,25); 
        scene.add(wall2);
        
        var wall3 = new Physijs.ConvexMesh(wallGeo, groundMaterial, 0);
        wall3.receiveShadow = true;
        wall3.name = "Wall3";
        wall3.rotation.x = -Math.PI / 2;;
        wall3.rotation.z = -Math.PI / 2;;
        wall3.position.set(25,7,0);
        scene.add(wall3);
        
        var wall4 = new Physijs.ConvexMesh(wallGeo, groundMaterial, 0);
        wall4.receiveShadow = true;
        wall4.name = "Wall4";
        wall4.rotation.x = -Math.PI / 2;;
        wall4.rotation.z = -Math.PI / 2;;
        wall4.position.set(-25,7,0); 
        scene.add(wall4);
        console.log("Walls Added");
        
        //spawn objects
        spawnCoin();
        spawnBoulders();
        // Player Object
        playerGeometry = new BoxGeometry(2, 2, 2);
        playerMaterial = Physijs.createMaterial(new LambertMaterial({ color: 0x00ff00 }), 0.4, 0);

        player = new Physijs.BoxMesh(playerGeometry, playerMaterial, 1);
        player.position.set(20, 5, 5);
        player.receiveShadow = true;
        player.castShadow = true;
        player.name = "Player";
        player.rotation.y = 1.5;
        scene.add(player);
        console.log("Added Pladyer to Scene");

        player.addEventListener('collision', (event) => {
            if (event.name === "Ground") {
                console.log("player hit the ground");
                isGrounded = true;
            }
            if (event.name === "Boulder") {
                lives = lives -= 1;
                updateLives();
                console.log("player hit the sphere");
            }
            if (event.name == "Coin") {
                score = score += 1;
                scene.remove(coin);
                coin = undefined;
                updateLives();
                console.log("player hit the coin");
            }
        });
        
        //Add camera to player
        player.add(camera);
        camera.position.set(0, 1, 0);

        // add controls
        gui = new GUI();
        control = new Control();
        addControl(control);

        // Add framerate stats
        addStatsObject();
        console.log("Added Stats to scene...");

        document.body.appendChild(renderer.domElement);
        gameLoop(); // render the scene	
        scene.simulate();

        window.addEventListener('resize', onWindowResize, false);
    }

    //PointerLockChange Event Handler
    function pointerLockChange(event): void {
        if (document.pointerLockElement === element) {
            // enable our mouse and keyboard controls
            keyboardControls.enabled = true;
            mouseControls.enabled = true;
            blocker.style.display = 'none';
        } else {
            // disable our mouse and keyboard controls
            keyboardControls.enabled = false;
            mouseControls.enabled = false;
            blocker.style.display = '-webkit-box';
            blocker.style.display = '-moz-box';
            blocker.style.display = 'box';
            instructions.style.display = '';
            console.log("PointerLock disabled");
        }
    }

    //PointerLockError Event Handler
    function pointerLockError(event): void {
        instructions.style.display = '';
        console.log("PointerLock Error Detected!!");
    }

    // Window Resize Event Handler
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function addControl(controlObject: Control): void {
        /* ENTER CODE for the GUI CONTROL HERE */
    }

    // Add Frame Rate Stats to the Scene
    function addStatsObject() {
        stats = new Stats();
        stats.setMode(0);
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.left = '0px';
        stats.domElement.style.top = '0px';
        document.body.appendChild(stats.domElement);
    }        
    
    function spawnBoulders(): void{
        for (var i = 0; i < 4; i++) {
            if (boulders[i] == undefined) { // if no boulder then add a boulder :) - jgunter
                sphereGeometry = new SphereGeometry(1, 32, 32);
                sphereMaterial = Physijs.createMaterial(new LambertMaterial({ color: 0x8B4726 }), 0.4, 0);
                sphere = new Physijs.SphereMesh(sphereGeometry, sphereMaterial, 1);
                var xRand = getRandomSphereCoordinate();
                var zRand = getRandomSphereCoordinate();
                sphere.position.set(xRand, 5, zRand);
                sphere.receiveShadow = true;
                sphere.castShadow = true;
                sphere.name = "Boulder";
                boulders.push(sphere);
                scene.add(boulders[i]);
            }
        }
    };
    
    function spawnCoin() {
        // Coin Object
        if (coin == undefined) {
            coinGeo = new SphereGeometry(0.5, 32, 32);
            coinMaterial = Physijs.createMaterial(new LambertMaterial({ color: 0xffff00 }), 0.4, 0);
            coin = new Physijs.CylinderMesh(coinGeo, coinMaterial, 1);
            var xRand = getRandomSphereCoordinate();
            var zRand = getRandomSphereCoordinate();
            coin.position.set(xRand, 2, zRand);
            coin.receiveShadow = true;
            coin.castShadow = true;
            coin.name = "Coin";
            scene.add(coin);
        }
    }
    
    function checkSpawns() {
            spawnBoulders();
            spawnCoin();
    }
    
    function getRandomSphereCoordinate() {
        var ret = 0; //middle
        var intRand = getRandomInt(1,100);
        if (intRand > 50) {
            ret = 20;
        } else {
            ret = -20;
        }
        return ret;
    }
    
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    
    function updateLives(): void{
        var text2 = document.getElementById("lives");
        text2.style.color = "white"
        text2.style.fontSize = "20";
        text2.style.top = 50 + 'px';
        text2.style.left = 50 + 'px';
        text2.innerHTML = "Lives: " + lives;
    };

    // Setup main game loop
    function gameLoop(): void {
        stats.update();
        
        checkControls();
        
        checkSpawns();

        // render using requestAnimationFrame
        requestAnimationFrame(gameLoop);

        // render the scene
        renderer.render(scene, camera);
    }
    
    // Check Controls Function
    function checkControls(): void {
        if (keyboardControls.enabled) {
            velocity = new Vector3();

            var time: number = performance.now();
            var delta: number = (time - prevTime) / 1000;

            if (isGrounded) {
                var direction = new Vector3(0, 0, 0);
                if (keyboardControls.moveForward) {
                      velocity.z -= 400.0 * delta;
                }
                if (keyboardControls.moveBackward) {
                      velocity.z += 400.0 * delta;
                }
                if (keyboardControls.moveLeft) {
                    velocity.x -= 400.0 * delta;
                }
                if (keyboardControls.moveBackward) {
                    velocity.z += 400.0 * delta;
                }
                if (keyboardControls.moveRight) {
                    velocity.x += 400.0 * delta;
                }
                if (keyboardControls.jump) {
                    velocity.y += 4000.0 * delta;
                    if (player.position.y > 4) {
                        isGrounded = false;
                    }
                    
                }

                player.setDamping(0.7, 0.1);
                // Changing player's rotation
                player.setAngularVelocity(new Vector3(0, mouseControls.yaw, 0));
                direction.addVectors(direction, velocity);
                direction.applyQuaternion(player.quaternion);
                if (Math.abs(player.getLinearVelocity().x) < 20 && Math.abs(player.getLinearVelocity().y) < 10) {
                    player.applyCentralForce(direction);
                }
                
                // other objects movement
                var velocity2 = new Vector3();
                var direction2 = new Vector3();
                velocity2.z += 400 * delta;
                direction2.addVectors(direction2, velocity2);
                if (coin != undefined) {
                    direction2.applyQuaternion(coin.quaternion);
                    coin.applyCentralForce(direction2);
                }
                
                for (var i = 0; i < 4; i++) {
                    var velocity3 = new Vector3();
                    var direction3 = new Vector3();
                    velocity3.z += 500 * delta;
                    direction3.addVectors(direction3, velocity3);
                    if (boulders[i] != undefined) {
                        direction3.applyQuaternion(boulders[i].quaternion);
                        boulders[i].applyCentralForce(direction3);
                    }
                }               
                

                cameraLook();

            } // isGrounded ends

            //reset Pitch and Yaw
            mouseControls.pitch = 0;
            mouseControls.yaw = 0;

            prevTime = time;
        } // Controls Enabled ends
        else {
            player.setAngularVelocity(new Vector3(0, 0, 0));
        }
    }
    
    function cameraLook(): void {
        var zenith: number = THREE.Math.degToRad(10);
        var nadir: number = THREE.Math.degToRad(-10);

        var cameraPitch: number = camera.rotation.x + mouseControls.pitch;

        // Constrain the Camera Pitch
        camera.rotation.x = THREE.Math.clamp(cameraPitch, nadir, zenith);
    }

    // Setup default renderer
    function setupRenderer(): void {
        renderer = new Renderer({ antialias: true });
        renderer.setClearColor(0x404040, 1.0);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(CScreen.WIDTH, CScreen.HEIGHT);
        renderer.shadowMap.enabled = true;
        console.log("Finished setting up Renderer...");
    }

    // Setup main camera for the scene
    function setupCamera(): void {
        camera = new PerspectiveCamera(35, config.Screen.RATIO, 0.1, 100);
        // if camera is attached to player - comment next 2 lines
        //camera.position.set(-50, 10, 30);
        //camera.lookAt(new Vector3(0, 0, 0));
        console.log("Finished setting up Camera...");
    }

    window.onload = init;

    return {
        scene: scene
    }

})();
