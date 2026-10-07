const API_URL="https://script.google.com/macros/s/AKfycbyGXX6nPtKPfSsGEGbieM4eaIPRfdRh_WTXuZI5-c9zEZRy6PmMWeL7J6wsPxncsFdSqQ/exec";
const STORAGE_KEY="lachura_products_v3";

let demo=[
{id:"d1",nombre:"Empanadas Fritas",precio:5,categoria:"Empanadas",imagen:"https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=85",descripcion:"Deliciosas empanadas fritas crujientes."},
{id:"d2",nombre:"Empanadas Mixtas",precio:7,categoria:"Empanadas",imagen:"https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=85",descripcion:"Relleno mixto especial de la casa."},
{id:"d3",nombre:"Pizza de Todo",precio:45,categoria:"Pizza",imagen:"https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=85",descripcion:"Nuestra pizza especial con todos los ingredientes."},
{id:"d4",nombre:"Pizza Pepperoni",precio:38,categoria:"Pizza",imagen:"https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=85",descripcion:"Clásica pizza de pepperoni y extra queso."},
{id:"d5",nombre:"Sodas",precio:8,categoria:"Bebidas",imagen:"https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=800&q=85",descripcion:"Sodas refrescantes surtidas."},
{id:"d6",nombre:"Soda Mini",precio:4,categoria:"Bebidas",imagen:"https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?auto=format&fit=crop&w=800&q=85",descripcion:"Ideal para acompañar tus empanadas."}
];

let products=[],localProducts=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"),cart=[],category="Todo",term="",selected=null;
const $=id=>document.getElementById(id);
const money=n=>`Bs ${Number(n||0).toFixed(2)}`;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function fallback(cat){
 const m={Pizza:demo[2]?.imagen,Empanadas:demo[0]?.imagen,Snacks:demo[0]?.imagen,Bebidas:demo[4]?.imagen};
 return m[cat]||demo[0]?.imagen||"";
}
function normalize(p,i){
 let cat = p.categoria||p.Categoria;
 const name = String(p.nombre||p.Nombre||p.name||"").toLowerCase();
 if(!cat) {
  if(name.includes("pizza")) cat = "Pizza";
  else if(name.includes("empanada")) cat = "Empanadas";
  else if(name.includes("soda") || name.includes("bebida") || name.includes("jugo") || name.includes("coca")) cat = "Bebidas";
  else cat = "Snacks";
 }
 return{id:p.id||p.ID||`api-${i}`,nombre:p.nombre||p.Nombre||p.name||"Producto",precio:Number(p.precio??p.Precio??p.price??0),categoria:cat,imagen:p.imagen||p.Imagen||p.image||fallback(cat),descripcion:p.descripcion||p.Descripcion||"Preparado especialmente para ti."};
}
async function load(){
 $("menu-productos").innerHTML=`<div class="loading"><span></span><p>Cargando sabores...</p></div>`;
 try{
  const r=await fetch(API_URL,{cache:"no-store"}); if(!r.ok)throw Error();
  const data=await r.json(); const remote=Array.isArray(data)?data.map(normalize):[];
  let all = [...localProducts, ...remote, ...demo];
  // Deduplicate by ID so local edits override demo/remote
  const map = new Map();
  all.forEach(p => { if(!map.has(p.id)) map.set(p.id, p); });
  products = Array.from(map.values());
 }catch(e){
  let all = [...localProducts, ...demo];
  const map = new Map();
  all.forEach(p => { if(!map.has(p.id)) map.set(p.id, p); });
  products = Array.from(map.values());
 }
 render();
 renderAdminProducts();
}
function filtered(){return products.filter(p=>(category==="Todo"||String(p.categoria).toLowerCase()===category.toLowerCase())&&(!term||`${p.nombre} ${p.categoria} ${p.descripcion}`.toLowerCase().includes(term.toLowerCase())))}
function render(){
 const list=filtered();
 $("productCount").textContent=list.length;
 $("emptyState").hidden=!!list.length;
 $("menu-productos").innerHTML=list.map((p,i)=>`
 <article class="product-card" data-id="${esc(p.id)}" style="animation-delay:${Math.min(i*30,180)}ms">
  <div class="product-image">
   <img loading="lazy" src="${esc(p.imagen)}" alt="${esc(p.nombre)}" onerror="this.src='${fallback(p.categoria)}'">
   <span class="product-tag">${esc(p.categoria)}</span>
   <button class="product-add" data-add="${esc(p.id)}" aria-label="Agregar">+</button>
  </div>
  <div class="product-body"><h3>${esc(p.nombre)}</h3><p>${esc(p.descripcion)}</p><div class="product-bottom"><div class="product-price">${money(p.precio)}</div><button class="product-order-btn" data-add="${esc(p.id)}"><i class="ph ph-plus-circle"></i> Pedir</button></div><div class="order-hint"><i class="ph ph-hand-tap"></i> Toca para ver detalles o pedir</div></div>
 </article>`).join("");
 
 // Render categories dynamically
 const cats = Array.from(new Set(products.map(p => p.categoria)));
 const iconMap = { "Pizza": "🍕", "Empanadas": "🥟", "Snacks": "🍟", "Bebidas": "🥤" };
 $("categories").innerHTML = `
  <button class="category ${category==='Todo'?'active':''}" data-category="Todo"><span><i class='ph ph-squares-four'></i></span> Todo</button>
  ${cats.map(c => `<button class="category ${category===c?'active':''}" data-category="${c}"><span>${iconMap[c]||'✨'}</span> ${c}</button>`).join('')}
 `;
 document.querySelectorAll(".category").forEach(b=>b.onclick=()=>{
  category=b.dataset.category;
  render();
 });
}
function add(p){
 const x=cart.find(i=>String(i.id)===String(p.id)); x?x.qty++:cart.push({...p,qty:1});update();toast("Agregado a tu pedido");
}
function update(){
 const count=cart.reduce((s,x)=>s+x.qty,0),total=cart.reduce((s,x)=>s+x.precio*x.qty,0);
 $("itemCount").textContent=count;$("navCount").textContent=count;$("totalPrice").textContent=money(total);$("modalTotal").textContent=money(total);
 $("cartBar").hidden=count===0;
 $("cartItems").innerHTML=cart.length?cart.map(x=>`
 <div class="cart-row"><img src="${esc(x.imagen)}" alt=""><div class="cart-info"><strong>${esc(x.nombre)}</strong><small>${money(x.precio)} c/u</small></div>
 <div class="qty"><button data-qty="${esc(x.id)}" data-delta="-1">−</button><strong>${x.qty}</strong><button data-qty="${esc(x.id)}" data-delta="1">+</button></div></div>`).join(""):`<div class="empty-state"><div>🛒</div><h3>Tu pedido está vacío</h3><p>Agrega algo delicioso del menú.</p></div>`;
}
function open(id){$(id).classList.add("show");document.body.style.overflow="hidden"}
function close(id){$(id).classList.remove("show");document.body.style.overflow=""}
function toast(msg){
 const t=$("toast"); const s=t.querySelector("span");
 if(s) s.textContent=msg; else t.textContent=msg;
 t.classList.add("show"); clearTimeout(window.tt);
 window.tt=setTimeout(()=>t.classList.remove("show"),1900);
}
function showProduct(p){
 selected=p;$("detailImage").src=p.imagen;$("detailImage").alt=p.nombre;$("detailCategory").textContent=p.categoria;$("detailName").textContent=p.nombre;$("detailDescription").textContent=p.descripcion;$("detailPrice").textContent=money(p.precio);open("productModal");
}
document.addEventListener("click",e=>{
 const addBtn=e.target.closest("[data-add]");if(addBtn){const p=products.find(x=>String(x.id)===String(addBtn.dataset.add));if(p)add(p);return}
 const q=e.target.closest("[data-qty]");if(q){const x=cart.find(i=>String(i.id)===String(q.dataset.qty));if(x){x.qty+=Number(q.dataset.delta);if(x.qty<=0)cart=cart.filter(i=>i.id!==x.id);update()}return}
 const card=e.target.closest(".product-card");if(card&&!e.target.closest(".product-add")){const p=products.find(x=>String(x.id)===String(card.dataset.id));if(p)showProduct(p);return}
 const c=e.target.closest("[data-close]");if(c)close(c.dataset.close);
});
$("goMenu").onclick=()=>$("menu").scrollIntoView({behavior:"smooth"});
$("openCart").onclick=()=>open("cartModal");$("navCart").onclick=()=>open("cartModal");$("navInfo").onclick=()=>open("infoModal");

// Limpiar localStorage viejo si existe
localStorage.removeItem("admin_unlocked");

$("openAdmin").onclick = () => {
  $("adminPinInput").value = "";
  open("pinModal");
  setTimeout(() => $("adminPinInput").focus(), 100);
};

$("btn-verify-pin").onclick = () => {
  const currentPin = localStorage.getItem("admin_pin") || "1234";
  if ($("adminPinInput").value === currentPin) {
    close("pinModal");
    open("adminModal");
  } else {
    toast("PIN Incorrecto");
  }
};

// Logica para cambiar PIN desde el Admin
$("btn-change-pin").onclick = () => {
  const newPin = prompt("Ingresa el nuevo PIN de seguridad (solo números):");
  if (newPin && newPin.length > 0) {
    localStorage.setItem("admin_pin", newPin);
    toast("PIN actualizado correctamente");
  }
};


document.querySelectorAll(".nav-item[data-scroll]").forEach(b=>b.onclick=()=>{$("home"===b.dataset.scroll?"home":"menu").scrollIntoView({behavior:"smooth"});document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("active"));b.classList.add("active")});

$("searchInput").oninput=e=>{term=e.target.value;$("clearSearch").hidden=!term;render()};
$("clearSearch").onclick=()=>{$("searchInput").value="";term="";$("clearSearch").hidden=true;render()};
$("resetFilters").onclick=()=>{category="Todo";term="";$("searchInput").value="";$("clearSearch").hidden=true;document.querySelectorAll(".category").forEach(x=>x.classList.toggle("active",x.dataset.category==="Todo"));render()};
$("detailAdd").onclick=()=>{if(selected){add(selected);close("productModal")}};
document.querySelectorAll(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)close(m.id)}));

$("newImage").onchange=e=>{
 const f=e.target.files[0];if(!f)return;
 if(f.size>2500000){toast("La foto debe pesar menos de 2.5 MB");e.target.value="";return}
 const r=new FileReader();r.onload=()=>{$("imagePreview").src=r.result;$("imagePreview").hidden=false;$("uploadTitle").textContent=f.name};r.readAsDataURL(f);
};

function renderAdminProducts() {
  $("adminProductList").innerHTML = products.map((p, idx) => `
    <div style="display:flex; justify-content:space-between; align-items:center; background:#f9f9f9; padding:8px 12px; border-radius:12px; border:1px solid var(--line);">
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="${p.imagen}" style="width:30px; height:30px; border-radius:6px; object-fit:cover;" onerror="this.src='${fallback(p.categoria)}'">
        <div>
          <b style="font-size:12px;">${esc(p.nombre)}</b>
          <span style="display:block; font-size:10px; color:var(--muted)">${money(p.precio)} - ${p.categoria}</span>
        </div>
      </div>
      <div style="display:flex; gap:5px;">
        <button type="button" onclick="editProduct('${p.id}')" style="border:0; background:#fff; color:var(--wine); width:28px; height:28px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.05);"><i class='ph ph-pencil-simple'></i></button>
        <button type="button" onclick="deleteProduct('${p.id}')" style="border:0; background:#fff; color:#ff004d; width:28px; height:28px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.05);"><i class='ph ph-trash'></i></button>
      </div>
    </div>
  `).join("") || `<p style="font-size:12px; color:var(--muted);">No hay productos.</p>`;
}

window.editProduct = (id) => {
  const p = products.find(x => x.id === id);
  if(!p) return;
  $("editingId").value = p.id;
  $("newName").value = p.nombre;
  $("newPrice").value = p.precio;
  $("newCategory").value = p.categoria;
  $("newDescription").value = p.descripcion;
  $("newImageUrl").value = p.imagen;
  if(p.imagen && p.imagen.length > 50) {
    $("imagePreview").src = p.imagen;
    $("imagePreview").hidden = false;
    $("uploadTitle").textContent = "Cambiar foto";
  } else {
    $("imagePreview").hidden = true;
    $("uploadTitle").textContent = "Subir foto";
  }
  $("btn-cancel-edit").hidden = false;
  $("btn-save-product").innerHTML = "Actualizar Producto <i class='ph ph-check'></i>";
};

window.deleteProduct = (id) => {
  if(confirm("¿Eliminar este producto?")) {
    localProducts = localProducts.filter(x => x.id !== id);
    demo = demo.filter(x => x.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localProducts));
    try{renderCaja();}catch(e){}
load();
    toast("Producto eliminado");
  }
};

$("btn-cancel-edit").onclick = () => {
  $("productForm").reset();
  $("editingId").value = "";
  $("imagePreview").hidden = true;
  $("uploadTitle").textContent = "Subir foto";
  $("btn-cancel-edit").hidden = true;
  $("btn-save-product").innerHTML = "Guardar Producto <i class='ph ph-check'></i>";
};

$("productForm").onsubmit=e=>{
 e.preventDefault();
 const id = $("editingId").value;
 const file=$("newImage").files[0],url=$("newImageUrl").value.trim();
 const save=img=>{
  const p={id:id || "local-"+Date.now(),nombre:$("newName").value.trim(),precio:Number($("newPrice").value),categoria:$("newCategory").value,imagen:img||fallback($("newCategory").value),descripcion:$("newDescription").value.trim()||"Preparado especialmente para ti."};
  if(id) {
    const idx = localProducts.findIndex(x => x.id === id);
    if(idx >= 0) localProducts[idx] = p;
    else localProducts.push(p);
  } else {
    localProducts.unshift(p);
  }
  localStorage.setItem(STORAGE_KEY,JSON.stringify(localProducts));
  $("btn-cancel-edit").click();
  try{renderCaja();}catch(e){}
load();
  toast(id ? "Producto actualizado" : "Producto agregado");
 };
 if(file){const r=new FileReader();r.onload=()=>save(r.result);r.readAsDataURL(file)}else save(url);
};
$("restoreDemo").onclick=()=>{localProducts=[];localStorage.removeItem(STORAGE_KEY);products=[...demo];render();toast("Ejemplos restaurados")};
$("clearLocal").onclick=()=>{if(!localProducts.length)return toast("No tienes productos locales");if(confirm("¿Borrar los productos que cargaste manualmente?")){const ids=new Set(localProducts.map(x=>x.id));localProducts=[];localStorage.removeItem(STORAGE_KEY);products=products.filter(x=>!ids.has(x.id));render();toast("Productos eliminados")}};

$("btn-enviar").onclick=async()=>{
 if(!cart.length)return toast("Agrega productos primero");
 
 if(isCajaMode) {
  $("checkoutTotal").textContent = money(cart.reduce((s,x)=>s+x.precio*x.qty,0));
  $("cashReceived").value = "";
  $("checkoutChange").textContent = "Bs 0.00";
  close("cartModal");
  open("checkoutModal");
  setTimeout(()=>$("cashReceived").focus(), 100);
  return;
 }

 const cliente=$("nombre-cliente").value.trim();if(!cliente){$("nombre-cliente").focus();return toast("Escribe tu nombre o mesa")}
 const btn=$("btn-enviar");btn.disabled=true;btn.innerHTML="Enviando…";
 const total=cart.reduce((s,x)=>s+x.precio*x.qty,0),orden=cart.flatMap(x=>Array(x.qty).fill(x.nombre)).join(", ");
 
 // Guardar pedido visualmente para la pantalla de cocina
 saveOrderToKitchen({ clientName: cliente, items: cart }, true);

 try{await fetch(API_URL,{method:"POST",body:JSON.stringify({cliente,orden,total})});cart=[];update();$("nombre-cliente").value="";close("cartModal");toast("¡Pedido enviado a cocina!")}
 catch(e){toast("No se pudo enviar. Revisa tu conexión.")}
 finally{btn.disabled=false;btn.innerHTML='Enviar a cocina <b>↗</b>'}
};

/* --- MODO CAJA Y VENTAS --- */
let isCajaMode = localStorage.getItem("cajaMode")==="true";
let sales = JSON.parse(localStorage.getItem("lachura_sales")||"[]");

$("cajaModeToggle").checked = isCajaMode;
$("cajaModeToggle").onchange = (e) => {
 isCajaMode = e.target.checked;
 localStorage.setItem("cajaMode", isCajaMode);
 toast(isCajaMode ? "Modo Caja activado" : "Modo Cliente activado");
 updateCajaUI();
};

function updateCajaUI() {
 if(isCajaMode) {
  $("btn-enviar").innerHTML = "Cobrar Venta <b>$</b>";
  $("nombre-cliente").parentElement.hidden = true; // hide "A nombre de quien"
 } else {
  $("btn-enviar").innerHTML = "Enviar a cocina <b>↗</b>";
  $("nombre-cliente").parentElement.hidden = false;
 }
}
updateCajaUI();

$("cashReceived").oninput = (e) => {
 const total = cart.reduce((s,x)=>s+x.precio*x.qty,0);
 const cash = Number(e.target.value);
 const change = cash - total;
 $("checkoutChange").textContent = money(Math.max(0, change));
 $("checkoutChange").style.color = change < 0 ? "#a22b1b" : "var(--wine)";
};

$("btn-confirm-sale").onclick = () => {
 const total = cart.reduce((s,x)=>s+x.precio*x.qty,0);
 const cash = Number($("cashReceived").value);
 if(cash < total && cash > 0) return toast("El efectivo es menor al total");
 
 const sale = {
  id: "V-" + Date.now().toString().slice(-6),
  date: new Date().toLocaleString(),
  items: [...cart],
  total: total,
  cash: cash,
  change: Math.max(0, cash - total),
  clientName: "Caja Local"
 };
 sales.unshift(sale);
 localStorage.setItem("lachura_sales", JSON.stringify(sales));
 
 // Registrar en Caja si está abierta
 if (caja.estado === "abierta") {
   const detalleItems = cart.map(i => `${i.qty}x ${i.nombre}`).join(", ");
   caja.movimientos.push({
     tipo: "Venta",
     monto: total,
     detalle: `Ticket ${sale.id} | ${detalleItems}`,
     hora: new Date().toLocaleTimeString()
   });
   localStorage.setItem("lachura_caja", JSON.stringify(caja));
 }
 
 // Enviar a la pantalla de cocina local
 saveOrderToKitchen(sale, false);
 
 printTicket(sale);
 cart = [];
 update();
 close("checkoutModal");
 toast("Venta completada");
};

/* --- CAJA CHICA Y MOVIMIENTOS --- */
let caja = JSON.parse(localStorage.getItem("lachura_caja") || '{"estado":"cerrada","saldoInicial":0,"movimientos":[]}');

function renderCaja() {
  if (caja.estado === "cerrada") {
    $("cajaCerrada").hidden = false;
    $("cajaAbierta").hidden = true;
  } else {
    $("cajaCerrada").hidden = true;
    $("cajaAbierta").hidden = false;
    
    const ventas = caja.movimientos.filter(m => m.tipo === "Venta").reduce((s,x)=>s+x.monto,0);
    const ingresos = caja.movimientos.filter(m => m.tipo === "Ingreso").reduce((s,x)=>s+x.monto,0);
    const egresos = caja.movimientos.filter(m => m.tipo === "Egreso").reduce((s,x)=>s+x.monto,0);
    const actual = caja.saldoInicial + ventas + ingresos - egresos;
    
    $("cajaVentasTotal").textContent = money(ventas);
    $("cajaSaldoActual").textContent = money(actual);
    
    $("cajaMovimientosList").innerHTML = caja.movimientos.map(m => `
      <div style="background:#fff; border:1px solid var(--line); border-radius:12px; padding:10px; font-size:11px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong style="color:${m.tipo==='Egreso' ? '#ff004d' : 'var(--ink)'}">${m.tipo}</strong>
          <span style="color:var(--muted); margin-left:5px;">${m.hora}</span>
          <div style="color:var(--muted); margin-top:3px;">${m.detalle}</div>
        </div>
        <strong style="font-size:14px; color:${m.tipo==='Egreso' ? '#ff004d' : 'var(--ink)'}">${m.tipo==='Egreso'?'-':'+'}${money(m.monto)}</strong>
      </div>
    `).reverse().join("") || `<p style="font-size:12px; color:var(--muted); text-align:center;">No hay movimientos en este turno.</p>`;
  }
}

$("btn-abrir-caja").onclick = () => {
  const monto = Number($("cajaAperturaMonto").value);
  caja = { estado: "abierta", saldoInicial: monto, movimientos: [] };
  localStorage.setItem("lachura_caja", JSON.stringify(caja));
  renderCaja();
};

$("btn-cerrar-caja").onclick = () => {
  if(confirm("¿Seguro que quieres cerrar la caja (Corte Z)? Se reiniciarán los movimientos.")) {
    caja = { estado: "cerrada", saldoInicial: 0, movimientos: [] };
    localStorage.setItem("lachura_caja", JSON.stringify(caja));
    renderCaja();
    toast("Caja cerrada exitosamente");
  }
};

$("btn-nuevo-ingreso").onclick = () => {
  const monto = Number(prompt("Monto del ingreso (Bs):"));
  if(!monto) return;
  const detalle = prompt("Motivo del ingreso:") || "Ingreso manual";
  caja.movimientos.push({ tipo: "Ingreso", monto, detalle, hora: new Date().toLocaleTimeString() });
  localStorage.setItem("lachura_caja", JSON.stringify(caja));
  renderCaja();
};

$("btn-nuevo-egreso").onclick = () => {
  const monto = Number(prompt("Monto del egreso (Bs):"));
  if(!monto) return;
  const detalle = prompt("Motivo del egreso:") || "Retiro / Pago a proveedor";
  caja.movimientos.push({ tipo: "Egreso", monto, detalle, hora: new Date().toLocaleTimeString() });
  localStorage.setItem("lachura_caja", JSON.stringify(caja));
  renderCaja();
};

$("openCaja").onclick = () => {
  renderCaja();
  open("cajaModal");
};

/* --- MODO COCINA (KDS) MULTI-ESTADO --- */
let activeOrders = JSON.parse(localStorage.getItem("lachura_orders")||"[]");

function saveOrderToKitchen(sale, isClient) {
 const order = {
  id: sale.id || "P-" + Date.now().toString().slice(-6),
  date: new Date().toLocaleTimeString(),
  items: sale.items || [...cart],
  type: isClient ? "Pedido Online" : "En Caja",
  clientName: sale.clientName || "Cliente",
  status: "pending" // pending, cooking, ready
 };
 activeOrders.push(order);
 localStorage.setItem("lachura_orders", JSON.stringify(activeOrders));
 renderKitchen();
}

function renderOrderCard(o, idx) {
  let btnText = "", btnColor = "", nextStatus = "";
  if(o.status === "pending") { btnText = "<i class='ph ph-chef-hat'></i> Preparar"; btnColor = "#d97736"; nextStatus = "cooking"; }
  else if(o.status === "cooking") { btnText = "<i class='ph ph-check-circle'></i> Terminar"; btnColor = "#00b862"; nextStatus = "ready"; }
  else { btnText = "<i class='ph ph-package'></i> Entregar"; btnColor = "var(--wine)"; nextStatus = "done"; }
  
  return `
  <div style="background:#fff; border:1px solid var(--line); border-left:4px solid ${btnColor}; border-radius:12px; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.03);">
   <div style="padding:12px; font-weight:bold; display:flex; justify-content:space-between; border-bottom:1px solid var(--line);">
    <span>#${o.id}</span>
    <span style="color:var(--muted); font-size:11px;">${o.date}</span>
   </div>
   <div style="padding:10px; background:#f9f9f9; font-size:12px; color:var(--ink); font-weight:bold;">
    ${o.type} - ${o.clientName}
   </div>
   <div style="padding:15px; flex:1; overflow-y:auto; font-size:13px; line-height:1.6;">
    ${o.items.map(i => `<div style="border-bottom:1px dashed var(--line); padding-bottom:5px; margin-bottom:5px;"><b>${i.qty}x</b> ${i.nombre}</div>`).join('')}
   </div>
   <button class="primary-button" style="border-radius:0; padding:12px; font-size:14px; background:${btnColor};" onclick="changeOrderStatus('${o.id}', '${nextStatus}')">${btnText}</button>
  </div>`;
}

function renderKitchen() {
  const pending = activeOrders.filter(o => o.status === "pending");
  const cooking = activeOrders.filter(o => o.status === "cooking");
  const ready = activeOrders.filter(o => o.status === "ready");

  $("kitchenOrdersPending").innerHTML = pending.map(renderOrderCard).join("") || `<p style="text-align:center; color:var(--muted); font-size:12px; margin-top:20px;">Sin pedidos</p>`;
  $("kitchenOrdersCooking").innerHTML = cooking.map(renderOrderCard).join("") || `<p style="text-align:center; color:var(--muted); font-size:12px; margin-top:20px;">Sin pedidos</p>`;
  $("kitchenOrdersReady").innerHTML = ready.map(renderOrderCard).join("") || `<p style="text-align:center; color:var(--muted); font-size:12px; margin-top:20px;">Sin pedidos</p>`;
}

window.changeOrderStatus = (id, newStatus) => {
  const idx = activeOrders.findIndex(o => o.id === id);
  if(idx === -1) return;
  
  const last=JSON.parse(localStorage.getItem("lachura_last_order")||"null");
  if(last && last.id===id) {
    last.status=newStatus;
    localStorage.setItem("lachura_last_order",JSON.stringify(last));
  }
  if (newStatus === "done") {
    activeOrders.splice(idx, 1);
  } else {
    activeOrders[idx].status = newStatus;
  }
  localStorage.setItem("lachura_orders", JSON.stringify(activeOrders));
  renderKitchen();
};

$("openKitchen").onclick = () => {
 renderKitchen();
 open("kitchenModal");
};

window.addEventListener('storage', (e) => {
 if(e.key === "lachura_orders") {
  activeOrders = JSON.parse(e.newValue || "[]");
  renderKitchen();
 }
 if(e.key === "lachura_caja") {
  caja = JSON.parse(e.newValue || '{"estado":"cerrada","saldoInicial":0,"movimientos":[]}');
  renderCaja();
 }
});

function printTicket(sale) {
 const ticketHTML = `
  <div style="font-family:monospace; width:300px; margin:0 auto; padding:20px; color:#000;">
   <div style="text-align:center; margin-bottom:15px;">
    <h2 style="margin:0; font-size:18px;">TICKET DE VENTA</h2>
    <p style="margin:5px 0 0; font-size:12px;">Ticket: ${sale.id}</p>
    <p style="margin:0; font-size:12px;">Fecha: ${sale.date}</p>
   </div>
   <div style="border-top:1px dashed #000; border-bottom:1px dashed #000; padding:10px 0; margin-bottom:10px;">
    ${sale.items.map(i => `
     <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
      <span>${i.qty}x ${i.nombre}</span>
      <span>${Number(i.precio * i.qty).toFixed(2)}</span>
     </div>
    `).join('')}
   </div>
   <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:14px; margin-bottom:5px;">
    <span>TOTAL:</span>
    <span>Bs ${Number(sale.total).toFixed(2)}</span>
   </div>
   <div style="display:flex; justify-content:space-between; font-size:12px;">
    <span>Efectivo:</span>
    <span>Bs ${Number(sale.cash||sale.total).toFixed(2)}</span>
   </div>
   <div style="display:flex; justify-content:space-between; font-size:12px;">
    <span>Cambio:</span>
    <span>Bs ${Number(sale.change).toFixed(2)}</span>
   </div>
   <div style="text-align:center; margin-top:20px; font-size:12px;">
    ¡Gracias por tu compra!
   </div>
  </div>
 `;
 $("printTicket").innerHTML = ticketHTML;
 window.print();
}

try{renderCaja();}catch(e){}
load();
