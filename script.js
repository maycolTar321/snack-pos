let total = 0;
let carrito = [];

// Esta función se activa cuando aprietas un botón de comida
function agregarProducto(nombre, precio) {
    // Anotamos el producto en nuestra memoria
    carrito.push(nombre);
    // Sumamos el dinero
    total = total + precio;
    
    // Actualizamos lo que se ve en la pantalla
    dibujarPantalla();
}

// Esta función dibuja la lista y el total en la pantalla
function dibujarPantalla() {
    let listaHTML = document.getElementById("lista-productos");
    listaHTML.innerHTML = ""; // Borramos la lista vieja para dibujarla de nuevo
    
    // Escribimos cada producto del carrito
    for (let i = 0; i < carrito.length; i++) {
        let nuevoElemento = document.createElement("li");
        nuevoElemento.innerText = carrito[i];
        listaHTML.appendChild(nuevoElemento);
    }
    
    // Mostramos el nuevo total
    document.getElementById("precio-total").innerText = total;
}

// Esta función se activa cuando aprietas "Cobrar"
function cobrar() {
    if (total === 0) {
        alert("¡No has agregado nada al carrito!");
    } else {
        alert("¡Venta exitosa! Cobraste " + total + " Bs.");
        // Vaciamos la memoria para el siguiente cliente
        total = 0;
        carrito = [];
        dibujarPantalla();
    }
}