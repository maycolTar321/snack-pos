const API_URL = "https://script.google.com/macros/s/AKfycbyGXX6nPtKPfSsGEGbieM4eaIPRfdRh_WTXuZI5-c9zEZRy6PmMWeL7J6wsPxncsFdSqQ/exec";

let total = 0;
let carrito = [];
let cantidadItems = 0;

// Traer productos de Google Sheets y crear las tarjetas
async function cargarMenu() {
    const menuDiv = document.getElementById("menu-productos");
    try {
        const respuesta = await fetch(API_URL);
        const productos = await respuesta.json();
        
        menuDiv.innerHTML = ""; 
        
        productos.forEach(prod => {
            // Si no pones imagen en tu Excel, carga esta por defecto
            let imgUrl = prod.imagen ? prod.imagen : 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=300&q=80';
            
            const tarjeta = document.createElement("div");
            tarjeta.className = "tarjeta";
            tarjeta.innerHTML = `
                <img src="${imgUrl}" alt="${prod.nombre}">
                <button class="btn-agregar" onclick="agregarProducto('${prod.nombre}', ${prod.precio})">+</button>
                <div class="info-tarjeta">
                    <h3>${prod.nombre}</h3>
                    <p>$${prod.precio}</p>
                </div>
            `;
            menuDiv.appendChild(tarjeta);
        });
    } catch (error) {
        menuDiv.innerHTML = "<p style='text-align:center;'>Error al cargar el menú.</p>";
    }
}

// Al presionar el "+" en cualquier tarjeta
function agregarProducto(nombre, precio) {
    carrito.push(nombre);
    total += parseFloat(precio);
    cantidadItems++;
    
    // Actualizar la barra roja flotante
    document.getElementById("total-price").innerText = "$" + total;
    document.getElementById("item-count").innerText = cantidadItems;
}

// Al presionar la barra roja flotante (Checkout)
function abrirModal() {
    if (carrito.length === 0) {
        alert("Primero agrega productos tocando el botón + rojo");
        return;
    }
    
    // Agrupar productos repetidos para el resumen (ej: 2x Pizza)
    let listaHTML = document.getElementById("lista-resumen");
    listaHTML.innerHTML = "";
    let conteo = {};
    carrito.forEach(p => conteo[p] = (conteo[p] || 0) + 1);
    
    for (const [prod, cant] of Object.entries(conteo)) {
        listaHTML.innerHTML += `<li><strong style="color:#ff0040;">${cant}x</strong> ${prod}</li>`;
    }
    
    document.getElementById("modal-checkout").style.display = "flex";
}

function cerrarModal() {
    document.getElementById("modal-checkout").style.display = "none";
}

// Al presionar "Enviar a Cocina"
async function enviarPedido() {
    let cliente = document.getElementById("nombre-cliente").value;
    
    if (cliente === "") {
        alert("Por favor escribe tu nombre o número de mesa.");
        return;
    }

    const btnEnviar = document.getElementById("btn-enviar");
    btnEnviar.innerText = "Enviando orden...";
    btnEnviar.disabled = true;

    const pedido = {
        cliente: cliente,
        orden: carrito.join(", "),
        total: total
    };

    try {
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(pedido)
        });
        
        alert("¡Pedido enviado a cocina!");
        
        // Limpiar todo después de cobrar
        carrito = [];
        total = 0;
        cantidadItems = 0;
        document.getElementById("total-price").innerText = "$0";
        document.getElementById("item-count").innerText = "0";
        document.getElementById("nombre-cliente").value = "";
        cerrarModal();
        
    } catch (error) {
        alert("Hubo un error de conexión.");
    }
    
    btnEnviar.innerText = "Enviar a Cocina";
    btnEnviar.disabled = false;
}

// Arrancar el sistema
cargarMenu();