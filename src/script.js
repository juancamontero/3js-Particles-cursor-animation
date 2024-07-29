import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import particlesVertexShader from './shaders/particles/vertex.glsl'
import particlesFragmentShader from './shaders/particles/fragment.glsl'

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Loaders
const textureLoader = new THREE.TextureLoader()

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
}

window.addEventListener('resize', () => {
  // Update sizes
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight
  sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)

  // Materials
  particlesMaterial.uniforms.uResolution.value.set(
    sizes.width * sizes.pixelRatio,
    sizes.height * sizes.pixelRatio
  )

  // Update camera
  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()

  // Update renderer
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(sizes.pixelRatio)
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  35,
  sizes.width / sizes.height,
  0.1,
  100
)
camera.position.set(0, 0, 18)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
})
renderer.setClearColor('#181818')
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(sizes.pixelRatio)

//** DISPLACEMENT */
//? Vamos a crear un canvas 2d, para que en este se haga el efecto trail y con la info de color resultante,
//? se haga el efecto de displacement llevando una uniforme al vertex shader

const displacement = {}

// 2D canvas
displacement.canvas = document.createElement('canvas')
displacement.canvas.width = 128
displacement.canvas.height = 128

//todo: ocultar canvas comentando hasta el body.append
displacement.canvas.style.position = 'fixed'
displacement.canvas.style.width = '256px'
displacement.canvas.style.height = '256px'
displacement.canvas.style.top = 0
displacement.canvas.style.left = 0
displacement.canvas.style.zIndex = 10
document.body.append(displacement.canvas) //! no es obligatorio pero para desarrollo ayuda

//*  A este punto el canva esta en el html pero no se ve
//* Context
//? para dibujar en este canvas necesitamos el "context".
//? el context tiene varios métodos

displacement.context = displacement.canvas.getContext('2d') // defino contexto
// displacement.context.fillStyle = 'red'
//? The first two parameters are x and y coordinates of the rectangle
//? the last two parameters are the width and height, which is why the canvas is completely filled.
displacement.context.fillRect(
  0,
  0,
  displacement.canvas.width,
  displacement.canvas.height
) //fillRect llenar rect

// * Draw glow
//? usamos una imagen / una gradiente en escala de grises
// Glow image
displacement.glowImage = new Image()
displacement.glowImage.src = './glow.png'
//? se importa una imagen con JS normal
displacement.glowImage = new Image()
displacement.glowImage.src = './glow.png'

//? se usa el método drawImage para dibujar la imagen en el canvas
//? mismo parámetros que fillRect

//! to check image loaded
// window.setTimeout(() =>
//   {
//       displacement.context.drawImage(displacement.glowImage, 20, 20, 32, 32)
//   }, 1000) //! test

//  * Raycaster & Interactive plane
//? el glow se debe dibujar en cada frame, según el cursor sobre la imagen
//? para eso vamos a usar raycaster
//? pero el raycaster no funciona sobre partículas , por eso se debe crear un plano
//? que se oculta y sobre El se aplica el raycaster
displacement.interactivePlane = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshBasicMaterial({ color: 'red', side: THREE.DoubleSide })
)
displacement.interactivePlane.visible = false //? no es necesario verlo
scene.add(displacement.interactivePlane)

// * Raycaster
displacement.raycaster = new THREE.Raycaster() // aca se guardan los "contactos" al plano
// * coordinates
displacement.screenCursor = new THREE.Vector2(999, 999) //?999,999 para que la posición inicial del curso sa fuera de la pantalla
displacement.canvasCursor = new THREE.Vector2(9999, 9999) //? para guardar en que parte del canvas 2D se dibuja
displacement.canvasCursorPrevious = new THREE.Vector2(9999, 9999) //? para calcular velocidad del cursor

//? cuando se mueva el cursor, se deben actualizar las coordenadas,
//? usamos 'pointermove' para que funcione en celulares
window.addEventListener('pointermove', (event) => {
  //! ajustar estos valores para que vayan de -0.5 a 0.5 iniciando en -.5 y -.5 inferior izquierda
  displacement.screenCursor.x = (event.clientX / sizes.width) * 2 - 1
  displacement.screenCursor.y = -(event.clientY / sizes.height) * 2 + 1

  // console.log(displacement.screenCursor)
})

// * Texture from canvas
//? así es com enviaremos al shader la info del canvas 2D
//https://threejs.org/docs/#api/en/textures/CanvasTexture
displacement.texture = new THREE.CanvasTexture(displacement.canvas)
//todo add uniform to send to shader

/**
 * Particles
 */
const particlesGeometry = new THREE.PlaneGeometry(10, 10, 128, 128) //? usar potencias de 2 y que sea cuadrado
//? we don’t care about triangles since we are drawing particles.
//? To get rid of the indices, use the setIndex() method on the geometry and set it to null:
particlesGeometry.setIndex(null) //! check using blending: THREE.AdditiveBlending on particlesMaterial
particlesGeometry.deleteAttribute('normal') //? no la estamos usando la podemos eliminar

// * RANDOM INTENSITY & ANGLE
//? random para cada punto del plano
const intensitiesArray = new Float32Array(
  particlesGeometry.attributes.position.count
)
const anglesArray = new Float32Array(
  particlesGeometry.attributes.position.count
)

for (let i = 0; i < particlesGeometry.attributes.position.count; i++) {
  intensitiesArray[i] = Math.random()
  anglesArray[i] = Math.random() * Math.PI * 2 //? para que sea en radianes
}
particlesGeometry.setAttribute(
  'aIntensity',
  new THREE.BufferAttribute(intensitiesArray, 1)
)
particlesGeometry.setAttribute(
  'aAngle',
  new THREE.BufferAttribute(anglesArray, 1)
)

const particlesMaterial = new THREE.ShaderMaterial({
  vertexShader: particlesVertexShader,
  fragmentShader: particlesFragmentShader,
  uniforms: {
    uResolution: new THREE.Uniform(
      new THREE.Vector2(
        sizes.width * sizes.pixelRatio,
        sizes.height * sizes.pixelRatio
      )
    ),
    uPictureTexture: new THREE.Uniform(textureLoader.load('./picture-1.png')), //todo: use in vertex.glsl
    uDisplacementTexture: new THREE.Uniform(displacement.texture), //todo: use in vertex.glsl
  },
  // blending: THREE.AdditiveBlending //! al hacer esto vemos que hay muchas partículas renderizando que no se ven, no debería haber cambias al usar este blending pero lo hay, debido al índice de la geometría (3 por vertex)
})
const particles = new THREE.Points(particlesGeometry, particlesMaterial)
scene.add(particles)

/**
 * Animate
 */
const tick = () => {
  // Update controls
  controls.update()

  // * Draw glow
  // Raycaster
  displacement.raycaster.setFromCamera(displacement.screenCursor, camera)

  const intersections = displacement.raycaster.intersectObject(
    displacement.interactivePlane
  )
  //? el array intersections solo tiene elementos si toca el plano
  if (intersections.length) {
    //? va de o a 1 el uv en cada eje
    const uv = intersections[0].uv
    //? si se interfecta actualizamos el cursor del canva 2D
    //? extrapolando a las coordenadas del canva 2D
    displacement.canvasCursor.x = uv.x * displacement.canvas.width
    displacement.canvasCursor.y = (1 - uv.y) * displacement.canvas.height
  }
  // * displacement

  //*  fade out
  //? aca se vuelve negro en  cada tick de nuevo, permitiendo el fade
  //? pero hay que retomar el globalCompositeOperation  al default después de trazarlo para que se haga el fade
  displacement.context.globalCompositeOperation = 'source-over' // vuelvo al default para que haga el fade ne l frame siguiente
  displacement.context.globalAlpha = 0.02 //? to make it fade después de dibujar
  //! 0.02 deja aun algo de rastro del draw, en el shader deberemos limitar cuando o se tiene en cuenta

  displacement.context.fillRect(
    0,
    0,
    displacement.canvas.width,
    displacement.canvas.height
  )

  // * Cursor speed and alpha
  //? calculo de la velocidad en realidad, si es cero el cursor no se está moviendo
  const cursorDistance = displacement.canvasCursorPrevious.distanceTo(
    displacement.canvasCursor
  )
  displacement.canvasCursorPrevious.copy(displacement.canvasCursor)
  const alpha = Math.min(cursorDistance * 0.1 , 1)// to reduce it and never goes above 1

  // * Draw glow
  const glowSize = displacement.canvas.width * 0.25 // para que se ajuste al centro del cursor
  displacement.context.globalCompositeOperation = 'lighten' // para que se acumule el color

  displacement.context.globalAlpha = alpha //? para que no tenga transparencia
  //? acá se inicia el trazo
  displacement.context.drawImage(
    displacement.glowImage,
    displacement.canvasCursor.x - glowSize * 0.5,
    displacement.canvasCursor.y - glowSize * 0.5,
    glowSize, //glow size
    glowSize //glow size
  )

  //* Texture canvas update
  displacement.texture.needsUpdate = true //? para que se actualice la textura

  // Render
  renderer.render(scene, camera)

  // Call tick again on the next frame
  window.requestAnimationFrame(tick)
}

tick()
