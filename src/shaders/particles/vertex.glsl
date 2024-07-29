uniform vec2 uResolution;
uniform sampler2D uPictureTexture;
uniform sampler2D uDisplacementTexture;

attribute float aIntensity;
attribute float aAngle;

varying vec3 vColor;

void main() {
    // * displacement
    //? debemos guardarla en otro variable porque los atributos no se pueden modificar
    vec3 newPosition = position;  //todo: change position with newPosition form here

    //? queremos que se muevan zn Z las particulas
    //? necesitamos definir un valor de desplazamiento en z basado en la textura del canvas 2D
    //? 👇 tome de la coord uv el color en el red channel
    float displacementIntensity = texture(uDisplacementTexture, uv).r;

    //? necesitamos corregir el efectoq que aplha del canvas 2D omitiendo los valores pequños
    // displacementIntensity = smoothstep(0.1, 0., displacementIntensity);
    
    //? Using the smoothstep, we can also ignore the values above, let’s say 0.3.
    //? This means that when the displacementIntensity is above 0.3, it’ll actually stay at 1.0 until it goes down to 0.3 and below:
    displacementIntensity = smoothstep(0.1, 0.3, displacementIntensity);

    // * definir una dirección para el displacemment
    vec3 displacement = vec3(cos(aAngle) * 0.2, sin(aAngle) * 0.2, 1.0);
    displacement = normalize(displacement);
    displacement *= displacementIntensity; //? vector x escalar en la direccion definida
    displacement *= 3.0;
    displacement *= aIntensity;
    newPosition += displacement;

    // Final position
    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    // float pictureIntensity = texture(uDisplacementTexture, uv).r; //! test displacement texture

    // * TEXTURE / PICTURE
    //? voy a tomar el color de la imágen (solo red channel) en la coordenada UV , y usarlo como la intensidad
    //? Tenemos acceso al atributo uv de la geometría aunque estemos usando esa geometría (plano) para puntos.
    //? Además, el uv corresponde al UV predeterminado de un plano 
    //? (0, 0 en la esquina inferior izquierda y 1, 1 en la esquina superior derecha).
    float pictureIntensity = texture(uPictureTexture, uv).r; 

    // Point size
    gl_PointSize = 0.15 * pictureIntensity * uResolution.y; //? asi se ajusta el tamaño, falta ajustar el color
    gl_PointSize *= (1.0 / -viewPosition.z);

    // * COLOR
    //? es importante para performance cargar de trabajo el vertex por encima del fragment
    // Varyings
    // vColor = vec3(pictureIntensity);
    //! pero se precisa negro mas negro y blanco mas blanco, se usa POW
    vColor = vec3(pow(pictureIntensity, 2.0));
}