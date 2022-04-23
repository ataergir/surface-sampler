import './style.css'
import * as THREE from 'three';
// import * as dat from 'dat.gui'


// import Stats from 'stats.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { gsap } from "gsap"


// const gui = new dat.GUI()
const canvas = document.querySelector('canvas.webgl')


//////////////////////////////// Stats ////////////////////////////////
// var stats = new Stats();
// stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
// document.body.appendChild( stats.dom )

//////////////////////////////// Scene ////////////////////////////////
const scene = new THREE.Scene()


//////////////////////////////// Sizes ////////////////////////////////
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

//////////////////////////////// Camera ////////////////////////////////
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.01, 100)
camera.position.x = 0
camera.position.y = 10
camera.position.z = 1
scene.add(camera)

//////////////////////////////// Controls ////////////////////////////////
const controls = new OrbitControls(camera, canvas)
controls.autoRotate = true
controls.autoRotateSpeed = 5

controls.enableDamping= false
controls.enableZoom = false
controls.enableRotate = false
controls.enablePan = false

//////////////////////////////// Renderer ////////////////////////////////
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    // antialias: true,
    // alpha: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
// renderer.toneMapping = THREE.ACESFilmicToneMapping


//////////////////////////////// Model ////////////////////////////////

// const pointsMaterial = new THREE.ShaderMaterial({
//     uniforms: {
//         time: {value:0},
//         frequency: { value:3 },
//         amplitude : { value: 1},
//         maxDistance : { value: 3.0 },
//         opacity: { value : 0 },
//         mousePos: {value: new THREE.Vector3()}
//     },
//     vertexShader,
//     fragmentShader,
//     transparent: false,
//     // blending: THREE.AdditiveBlending,
//     depthWrite: false,
//     precision: sizes.width < 790 ? 'highp' : 'lowp'
// })


//
const bg = document.querySelector('.bg')
// const bg2 = document.querySelector('.bg2')

var vec = new THREE.Vector3()
var pos = new THREE.Vector3()

let cursor = {
    x:0,
    y:0
}
document.addEventListener('mousemove',(event)=> {
    const x = ( event.clientX / window.innerWidth ) * 2 - 1
    const y = - ( event.clientY / window.innerHeight ) * 2 + 1

    gsap.to(cursor,{x:x, y:y, duration:2})

    bg.style.width = `${(1 + x )* 50}vw`
})

let uniforms = {
    mousePos: {value: new THREE.Vector3()},
    range : {value : 3}
}

let pointsMaterial = new THREE.PointsMaterial({
    size: 0.02,
    color: 0xffffff,
    onBeforeCompile: shader => {
      shader.uniforms.mousePos = uniforms.mousePos
      shader.uniforms.range = uniforms.range
      shader.vertexShader = `
        uniform vec3 mousePos;
        uniform float range;
        ${shader.vertexShader}
      `.replace(
        `#include <begin_vertex>`,
        `#include <begin_vertex>
          
          vec3 seg = position - mousePos;
          vec3 dir = normalize(seg);
          float dist = length(seg);
          if (dist < range){
            float force = clamp(range / 3. / (dist * dist), 0., range / 3.);
            transformed += dir * force;
          }
        
        `
      )
    }
})

let samplers = []
let objectsToTest = []
let points = null
const loader = new OBJLoader()
loader.load(
    "models/skull.obj",
    (obj) => {
        const material = new THREE.MeshBasicMaterial({
            wireframe: false,
            color: 0x0000ff,
            opacity: 0,
            transparent: true
        })
        obj.children.forEach(child => {
            child.material = material
            child.position.y = -3
            scene.add(child)
            samplers.push(new MeshSurfaceSampler(child).build())
            objectsToTest.push(child)
        })

        samplers.forEach(sampler => {
        const vertices = []
        const tempPosition = new THREE.Vector3()
        for (let i = 0; i < 55000; i ++) {
        sampler.sample(tempPosition)
        vertices.push(tempPosition.x, tempPosition.y , tempPosition.z)
        }


        const pointsGeometry = new THREE.BufferGeometry();
        pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))


        points = new THREE.Points(pointsGeometry, pointsMaterial)
        points.position.y = 0
        points.scale.x = 10
        points.scale.y = 10
        points.scale.z = 10
        points.position.y = -3
        points.rotation.y = -Math.PI * 2
        scene.add(points)

        gsap.to(points.scale,{x:1,y:1,z:1, duration:2})
        gsap.to(points.rotation,{y: 0, duration:2.5, ease:"power2.out"})
        gsap.to(camera.position,{z:9, y:0, duration:2})


        window.addEventListener('click', ()=> {
            gsap.to(uniforms.range, {value: 10, duration:1, ease:'Power4.easeOut'})
            gsap.to(uniforms.range, {value: 3, duration:1, delay: 1 ,ease:'Power4.easeIn'})
        })

        })
    }
)


//////////////////////////////// Raycaster ////////////////////////////////
const raycaster = new THREE.Raycaster()

let target = {
    z:1
}

//////////////////////////////// Animation ////////////////////////////////
const clock = new THREE.Clock()

const tick = () =>
{
    // stats.begin()

    // const elapsedTime = clock.getElapsedTime()


    raycaster.setFromCamera(cursor, camera)
    if(raycaster.intersectObjects(objectsToTest)[0]) {
        const Z = raycaster.intersectObjects(objectsToTest)[0].point.z
        gsap.to(target,{z:Z, duration: 0.3})
    }

    vec.set(cursor.x, cursor.y, 0)
    vec.unproject( camera );

    vec.sub( camera.position ).normalize();

    var distance = ( target.z - camera.position.z ) / vec.z;

    pos.copy( camera.position ).add( vec.multiplyScalar( distance ) )
    pos.y += 3
    uniforms.mousePos.value.copy(pos)

    controls.update()

    renderer.render(scene, camera)
    // stats.end()
    window.requestAnimationFrame(tick)
}

tick()