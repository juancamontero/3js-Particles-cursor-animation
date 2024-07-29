varying vec3 vColor;

void main() {
    // *  Discs
    //? necesitamos que cada partícula sea un disco, cómo son puntos se usa gl_PointCoord
    vec2 uv = gl_PointCoord;
    // gl_FragColor = vec4(uv, 1.0, 1.0); //! test
    float distanceToCenter = distance(uv, vec2(0.5));
    // float distanceToCenter = length(uv - vec2(0.5)); //?another way

    //? Para no ajustar el alpha a medida que se aleja del centro y eveitar bugs
    //? vamos a usar DISCARD un metodo que evita que se dibuje un fragment
    if(distanceToCenter > 0.5)
        discard;

    // gl_FragColor = vec4(vec3(distanceToCenter), 1.0); //!test
    // gl_FragColor = vec4(vec3(1.0), 1.0); 

    // * COLOR
    //?usando la intensidad del color enviada desde el vertex
    // gl_FragColor = vec4(vColor, 1.0);

    //! pero se precisa negro mas nego y blanco mas blanco, 
    //todo: hacerlo en el vertex con POW
    
    gl_FragColor = vec4(vColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}