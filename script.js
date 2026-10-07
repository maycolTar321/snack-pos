const API_URL="https://script.google.com/macros/s/AKfycbyMv8_V05_gkviZz0_5ELLUBJYhwsvRGUnJ3Bkj28-Ar0VWMmc2-GW7VvP-u6AB0ULhQg/exec";
const STAFF_KEY="LA-CHURA-STAFF-2026";
const REALTIME_INTERVAL=2000;
let realtimeTimer=null,lastRemoteOrderIds=new Set(),customerTrackingTimer=null;
let sharedState={caja:null,movimientos:[],ventas:[],metrics:{}};
async function apiGet(params={}){const q=new URLSearchParams({...params,_:Date.now()});const r=await fetch(`${API_URL}?${q.toString()}`,{cache:"no-store"});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json();}
async function apiPost(payload){const r=await fetch(API_URL,{method:"POST",body:JSON.stringify(payload),cache:"no-store"});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json();}
function setConnection(ok,label){const el=$("connectionStatus");if(!el)return;el.classList.toggle("offline",!ok);const icon=el.querySelector("i"),txt=el.querySelector("span");if(icon)icon.className=ok?"ph ph-cloud-check":"ph ph-cloud-slash";if(txt)txt.textContent=label||(ok?"Online":"Sin conexión");}
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

window.deleteProduct = async (id) => {
  if(!confirm("¿Eliminar este producto para todos los dispositivos?")) return;
  try{
    const remote=await apiPost({action:"deleteProduct",staffKey:STAFF_KEY,id});
    if(!remote.ok)throw new Error(remote.error||"No autorizado");
    localProducts=localProducts.filter(x=>x.id!==id);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(localProducts));
    await load();
    toast("Producto eliminado del catálogo online");
  }catch(err){
    toast("No se pudo eliminar en el servidor");
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
 const save=async img=>{
  const p={id:id || "p-"+Date.now(),nombre:$("newName").value.trim(),precio:Number($("newPrice").value),categoria:$("newCategory").value,imagen:img||fallback($("newCategory").value),descripcion:$("newDescription").value.trim()||"Preparado especialmente para ti.",activo:true};
  try{
    const remote=await apiPost({action:"upsertProduct",staffKey:STAFF_KEY,product:p});
    if(!remote.ok)throw new Error(remote.error||"No autorizado");
    localProducts=localProducts.filter(x=>x.id!==p.id);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(localProducts));
    $("btn-cancel-edit").click();
    await load();
    toast(id ? "Producto actualizado para todos los equipos" : "Producto publicado en el catálogo");
  }catch(err){
    localProducts=localProducts.filter(x=>x.id!==p.id);
    localProducts.unshift(p);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(localProducts));
    $("btn-cancel-edit").click();
    await load();
    toast("Sin servidor: guardado solo en este equipo");
  }
 };
 if(file){const r=new FileReader();r.onload=()=>save(r.result);r.readAsDataURL(file)}else save(url);
};
$("restoreDemo").onclick=()=>{localProducts=[];localStorage.removeItem(STORAGE_KEY);products=[...demo];render();toast("Ejemplos restaurados")};
$("clearLocal").onclick=()=>{if(!localProducts.length)return toast("No tienes productos locales");if(confirm("¿Borrar los productos que cargaste manualmente?")){const ids=new Set(localProducts.map(x=>x.id));localProducts=[];localStorage.removeItem(STORAGE_KEY);products=products.filter(x=>!ids.has(x.id));render();toast("Productos eliminados")}};

$("btn-enviar").onclick=async()=>{
 if(!cart.length)return toast("Agrega productos primero");
 if(isCajaMode){$("checkoutTotal").textContent=money(cart.reduce((s,x)=>s+x.precio*x.qty,0));$("cashReceived").value="";$("checkoutChange").textContent="Bs 0.00";close("cartModal");open("checkoutModal");setTimeout(()=>$("cashReceived").focus(),100);return;}
 const cliente=$("nombre-cliente").value.trim();if(!cliente){$("nombre-cliente").focus();return toast("Escribe tu nombre o mesa")}
 const btn=$("btn-enviar");btn.disabled=true;btn.innerHTML='<i class="ph ph-spinner-gap ph-spin"></i> Enviando a cocina…';
 const total=cart.reduce((s,x)=>s+x.precio*x.qty,0);
 const items=cart.map(x=>({id:x.id,nombre:x.nombre,precio:Number(x.precio),qty:Number(x.qty),categoria:x.categoria,imagen:x.imagen}));
 try{
  setConnection(true,"Enviando");
  const result=await apiPost({action:"createOrder",cliente,deliveryType:"pickup",address:"",items,total,source:"web"});
  if(!result.ok||!result.order)throw new Error(result.error||"No se pudo crear el pedido");
  const order=result.order;localStorage.setItem("lachura_last_order",JSON.stringify({id:order.id,token:order.token,status:order.status}));
  cart=[];update();$("nombre-cliente").value="";close("cartModal");showOrderTracking(order);toast(`Pedido #${order.id} enviado a cocina`);setConnection(true,"Online");
 }catch(e){setConnection(false,"Sin conexión");toast("No se pudo enviar. Verifica que Apps Script esté publicado.");console.error("LA CHURA createOrder",e)}
 finally{btn.disabled=false;btn.innerHTML='<i class="ph ph-paper-plane-tilt"></i> Enviar a cocina'}
};

/* --- OPERACIÓN CENTRALIZADA: CAJA + VENTAS + PEDIDOS --- */
let isCajaMode = localStorage.getItem("cajaMode")==="true";
let sales = JSON.parse(localStorage.getItem("lachura_sales")||"[]");
let caja = {estado:"cerrada",saldoInicial:0,movimientos:[]};

function renderSharedMetrics(){
  const m=sharedState.metrics||{};
  const set=(id,value)=>{const el=$(id);if(el)el.textContent=value;};
  set("onlineOrdersCount",m.pedidosActivos||0);
  set("onlinePendingCount",m.pendientes||0);
  set("onlineCookingCount",m.preparando||0);
  set("onlineReadyCount",m.listos||0);
  set("onlineSalesTotal",money(m.ventasHoy||0));
  set("onlineCashBalance",money(m.saldoCaja||0));
  set("adminLiveOrders",m.pedidosActivos||0);
  set("adminLiveSales",money(m.ventasHoy||0));
  set("adminCashBalance",money(m.saldoCaja||0));
}

async function refreshSharedState(silent=true){
  try{
    const data=await apiGet({action:"dashboard",staffKey:STAFF_KEY});
    if(!data.ok)throw new Error(data.error||"No autorizado");
    const clean=(arr)=>arr?arr.filter(x=>x&&x.id&&x.id!=="undefined"&&String(x.id).trim()!==""):[];
    data.orders=clean(data.orders);
    data.ventas=clean(data.ventas);
    data.movimientos=clean(data.movimientos);
    if(data.metrics){
      data.metrics.pedidosActivos=data.orders.length;
      data.metrics.pendientes=data.orders.filter(o=>o.status==="pending"||o.status==="confirmed").length;
      data.metrics.preparando=data.orders.filter(o=>o.status==="cooking").length;
      data.metrics.listos=data.orders.filter(o=>o.status==="ready").length;
    }
    sharedState=data;
    caja=data.caja||caja;
    sales=data.ventas||[];
    activeOrders=(data.orders||[]).map(normalizeRemoteOrder);
    const ids=new Set(activeOrders.map(o=>o.id));
    const hasNew=activeOrders.some(o=>!lastRemoteOrderIds.has(o.id));
    lastRemoteOrderIds=ids;
    renderKitchen();
    renderCaja();
    renderSharedMetrics();
    renderOnlineOrderFeed();
    setConnection(true,"Sincronizado");
    if(hasNew&&!silent)toast("Nueva comanda recibida en el sistema");
    return data;
  }catch(err){
    setConnection(false,"Sin conexión");
    if(!silent)toast("No se pudo sincronizar con el servidor");
    console.warn("LA CHURA SYNC",err);
    return null;
  }
}

function renderOnlineOrderFeed(){
  const boxes=[$("onlineOrdersList"),$("onlineOrdersListCaja")].filter(Boolean);
  const orders=(sharedState.orders||[]).slice(0,12);
  const html=orders.length?orders.map(o=>`<article class="online-order-row status-${esc(o.status)}"><div class="online-order-main"><strong>#${esc(o.id)}</strong><span>${esc(o.cliente||"Cliente")} · ${o.source==="pos"?"Caja":"Online"}</span></div><div class="online-order-status"><b>${esc(statusLabel(o.status))}</b><small>${money(o.total)}</small></div></article>`).join(""):`<div class="online-empty"><i class="ph ph-broadcast"></i><span>Esperando pedidos...</span></div>`;
  boxes.forEach(box=>box.innerHTML=html);
}

$("cajaModeToggle").checked = isCajaMode;
$("cajaModeToggle").onchange = (e) => {
 isCajaMode = e.target.checked;
 localStorage.setItem("cajaMode", isCajaMode);
 toast(isCajaMode ? "Modo Caja activado" : "Modo Cliente activado");
 updateCajaUI();
};

function updateCajaUI() {
 if(isCajaMode) {
  $("btn-enviar").innerHTML = '<i class="ph ph-currency-circle-dollar"></i> Cobrar venta';
  $("nombre-cliente").parentElement.hidden = true;
 } else {
  $("btn-enviar").innerHTML = '<i class="ph ph-paper-plane-tilt"></i> Enviar a cocina';
  $("nombre-cliente").parentElement.hidden = false;
 }
}
updateCajaUI();

$("cashReceived").oninput = (e) => {
 const total = cart.reduce((s,x)=>s+x.precio*x.qty,0);
 const cash = Number(e.target.value);
 const change = cash-total;
 $("checkoutChange").textContent=money(Math.max(0,change));
 $("checkoutChange").style.color=change<0?"#a22b1b":"var(--wine)";
};

$("btn-confirm-sale").onclick = async () => {
 const total=cart.reduce((s,x)=>s+x.precio*x.qty,0);
 const cash=Number($("cashReceived").value);
 if(cash<total)return toast("El efectivo es menor al total");
 if(!cart.length)return toast("No hay productos en la venta");
 const sale={
  id:"V-"+Date.now().toString().slice(-6),
  date:new Date().toLocaleString("es-BO"),
  items:[...cart],total,cash,change:Math.max(0,cash-total),clientName:"Caja Local"
 };
 try{
  setConnection(true,"Registrando venta");
  const order=await apiPost({action:"createOrder",cliente:"Caja Local",deliveryType:"pickup",address:"",items:sale.items.map(i=>({id:i.id,nombre:i.nombre,precio:Number(i.precio),qty:Number(i.qty),categoria:i.categoria,imagen:i.imagen})),total:sale.total,source:"pos"});
  if(!order.ok)throw new Error(order.error||"No se creó la comanda");
  // La venta se registra en una sola operación centralizada para evitar que
  // el pedido quede creado pero la venta no.
  const remoteSale=await apiPost({action:"createSale",staffKey:STAFF_KEY,id:sale.id,total:sale.total,efectivo:sale.cash,cambio:sale.change,source:"pos",cliente:"Caja Local",items:sale.items,deliveryType:"pickup"});
  if(!remoteSale.ok)throw new Error(remoteSale.error||"No se pudo sincronizar la venta");
  sales.unshift({...sale,remoteId:remoteSale.sale?.orderId||remoteSale.order?.id||""});
  localStorage.setItem("lachura_sales",JSON.stringify(sales.slice(0,50)));
  printTicket(sale);
  cart=[];update();close("checkoutModal");
  await refreshSharedState(false);
  toast("Venta sincronizada con Caja y Cocina");
 }catch(err){
  const msg=String(err?.message||err||"Error desconocido");
  toast(`Venta no sincronizada: ${msg}`);
  console.error("LA CHURA SALE",err);
 }
};

function renderCaja(){
 const remote=sharedState.caja;
 if(remote)caja=remote;
 const movimientos=sharedState.movimientos||[];
 const localFallback=caja.movimientos||[];
 if(caja.estado==="cerrada"){
  $("cajaCerrada").hidden=false;
  $("cajaAbierta").hidden=true;
 }else{
  $("cajaCerrada").hidden=true;
  $("cajaAbierta").hidden=false;
  const ventas=(sharedState.ventas||[]).filter(v=>v.source==="pos").reduce((s,x)=>s+Number(x.total||0),0);
  const ingresos=movimientos.filter(m=>m.tipo==="Ingreso").reduce((s,x)=>s+Number(x.monto||0),0);
  const egresos=movimientos.filter(m=>m.tipo==="Egreso").reduce((s,x)=>s+Number(x.monto||0),0);
  const actual=Number(caja.saldoInicial||0)+ventas+ingresos-egresos;
  $("cajaVentasTotal").textContent=money(ventas);
  $("cajaSaldoActual").textContent=money(actual);
  const list=movimientos.length?movimientos:localFallback;
  $("cajaMovimientosList").innerHTML=list.map(m=>`\
   <div class="movement-row">\
    <div class="movement-symbol ${m.tipo==="Egreso"?"out":"in"}"><i class="ph ${m.tipo==="Egreso"?"ph-arrow-up-right":"ph-arrow-down-left"}"></i></div>\
    <div class="movement-copy"><strong>${esc(m.tipo)}</strong><small>${esc(m.detalle||"")} · ${new Date(m.timestamp||Date.now()).toLocaleTimeString("es-BO",{hour:"2-digit",minute:"2-digit"})}</small></div>\
    <b class="movement-amount ${m.tipo==="Egreso"?"negative":"positive"}">${m.tipo==="Egreso"?"-":"+"}${money(m.monto)}</b>\
   </div>`).join("")||`<div class="online-empty"><i class="ph ph-receipt"></i><span>No hay movimientos en este turno.</span></div>`;
 }
 renderSharedMetrics();
}

$("btn-abrir-caja").onclick=async()=>{
 const monto=Number($("cajaAperturaMonto").value||0);
 try{
  const r=await apiPost({action:"openCash",staffKey:STAFF_KEY,monto,usuario:"Caja"});
  if(!r.ok)throw new Error(r.error);
  caja=r.caja;await refreshSharedState(false);$("cajaAperturaMonto").value="";toast("Caja abierta para todos los dispositivos");
 }catch(e){toast("No se pudo abrir la caja online");}
};

$("btn-cerrar-caja").onclick=async()=>{
 if(!confirm("¿Cerrar el turno para todos los equipos?"))return;
 try{
  const r=await apiPost({action:"closeCash",staffKey:STAFF_KEY});
  if(!r.ok)throw new Error(r.error);
  await refreshSharedState(false);toast("Caja cerrada y sincronizada");
 }catch(e){toast("No se pudo cerrar la caja online");}
};

const printCajaBtn = document.getElementById("btn-print-report");
if(printCajaBtn) {
  printCajaBtn.onclick = () => {
    const movimientos = sharedState.movimientos||[];
    const ventas=(sharedState.ventas||[]).filter(v=>v.source==="pos").reduce((s,x)=>s+Number(x.total||0),0);
    const ingresos=movimientos.filter(m=>m.tipo==="Ingreso").reduce((s,x)=>s+Number(x.monto||0),0);
    const egresos=movimientos.filter(m=>m.tipo==="Egreso").reduce((s,x)=>s+Number(x.monto||0),0);
    const inicial = Number(caja.saldoInicial||0);
    const actual = inicial + ventas + ingresos - egresos;
    
    const reportHTML = `
    <div style="font-family: 'Courier New', monospace; width:300px; margin:0 auto; padding:20px; color:#000;">
      <div style="text-align:center; margin-bottom:15px; border-bottom: 2px dashed #000; padding-bottom: 10px;">
        <h2 style="margin:0; font-size:22px; font-weight:900;">REPORTE DE CAJA</h2>
        <p style="margin:5px 0 0; font-size:12px; font-weight: bold;">LA CHURA SNACK</p>
        <p style="margin:2px 0 0; font-size:12px;">Generado: ${new Date().toLocaleString("es-BO")}</p>
      </div>
      <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px dashed #000;">
        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
          <span>Fondo Inicial:</span><span>${money(inicial)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
          <span>Ventas en Efectivo:</span><span>${money(ventas)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
          <span>Ingresos Manuales:</span><span>${money(ingresos)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
          <span>Egresos / Gastos:</span><span>-${money(egresos)}</span>
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; font-weight:900; font-size:16px; margin-bottom:5px;">
        <span>TOTAL EN CAJA:</span>
        <span>${money(actual)}</span>
      </div>
      <div style="text-align:center; margin-top:30px; font-size:10px; color:#555;">
        === FIN DEL REPORTE ===
      </div>
    </div>
    `;
    const printContainer = document.getElementById("printTicket");
    if(printContainer) {
      printContainer.innerHTML = reportHTML;
      window.print();
    }
  };
}

async function registerCashMovement(tipo){
 const monto=Number(prompt(`Monto del ${tipo.toLowerCase()} (Bs):`)||0);
 if(monto<=0)return;
 const detalle=prompt("Detalle / motivo:")||"Movimiento manual";
 try{
  const r=await apiPost({action:"cashMovement",staffKey:STAFF_KEY,tipo,monto,detalle,source:"manual"});
  if(!r.ok)throw new Error(r.error);
  await refreshSharedState(false);toast(`${tipo} sincronizado en Caja`);
 }catch(e){toast("No se pudo registrar el movimiento online");}
}
$("btn-nuevo-ingreso").onclick=()=>registerCashMovement("Ingreso");
$("btn-nuevo-egreso").onclick=()=>registerCashMovement("Egreso");
$("openCaja").onclick=async()=>{open("cajaModal");await refreshSharedState(false)};

/* --- COCINA KDS ONLINE / MULTI-DISPOSITIVO --- */
let activeOrders=[];
function normalizeRemoteOrder(o){return{id:String(o.id),date:new Date(o.createdAt||Date.now()).toLocaleTimeString("es-BO",{hour:"2-digit",minute:"2-digit"}),createdAt:o.createdAt,updatedAt:o.updatedAt,items:Array.isArray(o.items)?o.items:[],type:o.source==="pos"?"En Caja":"Pedido Online",clientName:o.cliente||"Cliente",status:o.status||"pending",token:o.token,total:Number(o.total||0)};}
async function refreshKitchenOnline(silent=true){return refreshSharedState(silent);}
function startRealtime(){if(realtimeTimer)return;refreshSharedState(true);realtimeTimer=setInterval(()=>refreshSharedState(true),REALTIME_INTERVAL);}
function renderOrderCard(o){
  let btnText="",btnColor="",nextStatus="";
  const isOnlyDrinks = o.items.length > 0 && o.items.every(i => String(i.categoria).toLowerCase() === 'bebidas');
  
  if(isOnlyDrinks && o.status !== "delivered"){
    btnText="<i class='ph ph-check-square-offset'></i> Marcar Despachado (Bebidas)";
    btnColor="#0d8cfd";
    nextStatus="delivered";
  }else if(o.status==="pending"||o.status==="confirmed"){
    btnText="<i class='ph ph-fire'></i> Empezar a Preparar";btnColor="#f26e22";nextStatus="cooking";
  }else if(o.status==="cooking"){
    btnText="<i class='ph ph-check-circle'></i> ¡Orden Lista!";btnColor="#00c853";nextStatus="ready";
  }else{
    btnText="<i class='ph ph-package'></i> Entregar al Cliente";btnColor="var(--wine)";nextStatus="delivered";
  }
  
  const itemsHtml = o.items.map(i => {
    const isDrink = String(i.categoria).toLowerCase() === 'bebidas';
    return `<div style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid #f0e6dd;${isDrink?'opacity:0.6;':''}">
      <div style="background:${isDrink?'#e2e8f0':'#ffebd2'};color:${isDrink?'#475569':'var(--wine)'};font-weight:800;border-radius:6px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;margin-right:10px;font-size:13px;">${Number(i.qty)||1}</div>
      <span style="font-size:13px;font-weight:${isDrink?'500':'700'};color:var(--ink);">${esc(i.nombre)}</span>
      ${isDrink ? '<i class="ph ph-brandy" style="margin-left:auto;font-size:16px;color:#94a3b8;"></i>' : ''}
    </div>`;
  }).join("");

  return `<div class="kds-order-card" style="box-shadow:0 8px 24px rgba(0,0,0,0.06);border-radius:16px;background:#fff;border:${isOnlyDrinks?'2px dashed #94a3b8':'1px solid #eadfd6'};">
    <div class="kds-order-head" style="padding:14px 16px;background:${isOnlyDrinks?'#f8fafc':'#fff9f2'};border-bottom:1px solid #f0e6dd;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:15px;font-weight:800;color:var(--wine);letter-spacing:-0.3px;">#${esc(o.id)}</span>
      <time style="font-size:11px;font-weight:600;color:var(--muted);background:#fff;padding:4px 8px;border-radius:20px;border:1px solid #eadfd6;">${esc(o.date||"")}</time>
    </div>
    <div class="kds-order-client" style="padding:12px 16px;background:#fff;">
      <b style="font-size:14px;color:var(--ink);margin-bottom:2px;display:block;">${esc(o.clientName)}</b>
      <span style="font-size:11px;color:#64748b;font-weight:500;">${esc(o.type)} · ${isOnlyDrinks?'🥤 Solo Bebidas':'🍽️ Comida'}</span>
    </div>
    <div class="kds-items" style="padding:4px 16px 12px;background:#fff;">${itemsHtml}</div>
    <button class="kds-action" style="background:${btnColor};color:#fff;border:0;padding:16px;font-weight:800;font-size:13px;width:100%;cursor:pointer;transition:transform 0.1s, filter 0.2s;" onclick="changeOrderStatus('${esc(o.id)}','${nextStatus}')" onmousedown="this.style.transform='scale(0.98)'" onmouseup="this.style.transform='scale(1)'">${btnText}</button>
  </div>`;
}
function renderKitchen(){
  const kdsOrders = activeOrders.filter(o => o && o.id && o.id !== "undefined" && String(o.id).trim() !== "");
  const pending=kdsOrders.filter(o=>o.status==="pending"||o.status==="confirmed");
  const cooking=kdsOrders.filter(o=>o.status==="cooking");
  const ready=kdsOrders.filter(o=>o.status==="ready");
  $("pendingCount").textContent=pending.length;$("cookingCount").textContent=cooking.length;$("readyCount").textContent=ready.length;
  $("kitchenOrdersPending").innerHTML=pending.map(renderOrderCard).join("")||emptyKitchen();
  $("kitchenOrdersCooking").innerHTML=cooking.map(renderOrderCard).join("")||emptyKitchen();
  $("kitchenOrdersReady").innerHTML=ready.map(renderOrderCard).join("")||emptyKitchen();
}
function emptyKitchen(){return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:200px;opacity:0.6;"><i class="ph ph-coffee" style="font-size:40px;color:#cbd5e1;margin-bottom:12px;"></i><span style="font-size:13px;font-weight:600;color:#94a3b8;">Sin comandas aquí</span></div>'}
window.changeOrderStatus=async(id,newStatus)=>{try{const result=await apiPost({action:"updateOrderStatus",id,newStatus,staffKey:STAFF_KEY});if(!result.ok)throw new Error(result.error||"No autorizado");const last=JSON.parse(localStorage.getItem("lachura_last_order")||"null");if(last&&last.id===id){last.status=newStatus;localStorage.setItem("lachura_last_order",JSON.stringify(last))}await refreshSharedState(false);toast(newStatus==="cooking"?"Comanda en preparación":newStatus==="ready"?"Pedido listo":"Pedido entregado")}catch(e){setConnection(false,"Sin conexión");toast("No se pudo actualizar la comanda");console.error(e)}};
$("openKitchen").onclick=async()=>{open("kitchenModal");await refreshSharedState(false)};

function statusLabel(status){return({pending:"Pedido recibido",confirmed:"Pedido confirmado",cooking:"En preparación",ready:"¡Pedido listo!",delivered:"Pedido entregado",cancelled:"Pedido cancelado"})[status]||status;}
function showOrderTracking(order){const modal=$("trackingModal");if(!modal)return;$("trackingNumber").textContent="#"+order.id;$("trackingStatus").textContent=statusLabel(order.status||"pending");updateTrackingVisual(order.status||"pending");open("trackingModal");startCustomerTracking();}
function updateTrackingVisual(status){const map={pending:1,confirmed:1,cooking:2,ready:3,delivered:4,cancelled:0};const step=map[status]||1;document.querySelectorAll("#trackingSteps .tracking-step").forEach((el,i)=>el.classList.toggle("active",i<step));const s=$("trackingStatus");if(s)s.textContent=statusLabel(status);}
async function refreshCustomerTracking(){const saved=JSON.parse(localStorage.getItem("lachura_last_order")||"null");if(!saved?.id||!saved?.token)return;try{const data=await apiGet({action:"order",id:saved.id,token:saved.token});if(data.ok&&data.order){saved.status=data.order.status;localStorage.setItem("lachura_last_order",JSON.stringify(saved));updateTrackingVisual(saved.status);setConnection(true,"Sincronizado")}}catch(e){setConnection(false,"Sin conexión")}}
function startCustomerTracking(){if(customerTrackingTimer)return;refreshCustomerTracking();customerTrackingTimer=setInterval(refreshCustomerTracking,REALTIME_INTERVAL);}
startRealtime();

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
