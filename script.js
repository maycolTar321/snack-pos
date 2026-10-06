const API_URL="https://script.google.com/macros/s/AKfycbyGXX6nPtKPfSsGEGbieM4eaIPRfdRh_WTXuZI5-c9zEZRy6PmMWeL7J6wsPxncsFdSqQ/exec";
const STORAGE_KEY="lachura_products_v3";

const demo=[
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
 return{id:p.id||p.ID||`api-${i}`,nombre:p.nombre||p.Nombre||p.name||"Producto",precio:Number(p.precio??p.Precio??p.price??0),categoria:p.categoria||p.Categoria||"Snacks",imagen:p.imagen||p.Imagen||p.image||fallback(p.categoria),descripcion:p.descripcion||p.Descripcion||"Preparado especialmente para ti."};
}
async function load(){
 $("menu-productos").innerHTML=`<div class="loading"><span></span><p>Cargando sabores...</p></div>`;
 try{
  const r=await fetch(API_URL,{cache:"no-store"}); if(!r.ok)throw Error();
  const data=await r.json(); const remote=Array.isArray(data)?data.map(normalize):[];
  // Combina los productos de la API con los locales y el demo
  products=[...localProducts,...remote,...demo];
 }catch(e){products=[...localProducts,...demo]}
 render();
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
  <div class="product-body"><h3>${esc(p.nombre)}</h3><p>${esc(p.descripcion)}</p><div class="product-price">${money(p.precio)}</div></div>
 </article>`).join("");
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
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(window.tt);window.tt=setTimeout(()=>t.classList.remove("show"),1900)}
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
$("openCart").onclick=()=>open("cartModal");$("navCart").onclick=()=>open("cartModal");$("openAdmin").onclick=()=>open("adminModal");$("navInfo").onclick=()=>open("infoModal");
document.querySelectorAll(".nav-item[data-scroll]").forEach(b=>b.onclick=()=>{$("home"===b.dataset.scroll?"home":"menu").scrollIntoView({behavior:"smooth"});document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("active"));b.classList.add("active")});
document.querySelectorAll(".category").forEach(b=>b.onclick=()=>{category=b.dataset.category;document.querySelectorAll(".category").forEach(x=>x.classList.toggle("active",x===b));render()});
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
$("productForm").onsubmit=e=>{
 e.preventDefault();const file=$("newImage").files[0],url=$("newImageUrl").value.trim();
 const save=img=>{const p={id:"local-"+Date.now(),nombre:$("newName").value.trim(),precio:Number($("newPrice").value),categoria:$("newCategory").value,imagen:img||fallback($("newCategory").value),descripcion:$("newDescription").value.trim()||"Preparado especialmente para ti."};localProducts.unshift(p);localStorage.setItem(STORAGE_KEY,JSON.stringify(localProducts));products=[p,...products];render();e.target.reset();$("imagePreview").hidden=true;$("uploadTitle").textContent="Subir foto del producto";toast("Producto agregado");};
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
  change: Math.max(0, cash - total)
 };
 sales.unshift(sale);
 localStorage.setItem("lachura_sales", JSON.stringify(sales));
 
 printTicket(sale);
 cart = [];
 update();
 close("checkoutModal");
 toast("Venta completada");
};

$("viewSales").onclick = () => {
 const totalVendido = sales.reduce((s,x)=>s+x.total, 0);
 $("salesTotalAmount").textContent = money(totalVendido);
 $("salesList").innerHTML = sales.map(s => `
  <div style="background:#fff; border:1px solid var(--line); border-radius:12px; padding:10px; font-size:11px;">
   <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
    <strong>${s.id}</strong> <span style="color:var(--muted)">${s.date}</span>
   </div>
   <div style="color:var(--muted); margin-bottom:5px;">${s.items.map(i => `${i.qty}x ${i.nombre}`).join(', ')}</div>
   <div style="display:flex; justify-content:space-between; font-weight:bold;">
    <span>Total:</span> <span>${money(s.total)}</span>
   </div>
  </div>
 `).join("") || `<div class="empty-state"><p>No hay ventas registradas.</p></div>`;
 open("salesModal");
};

$("clearSales").onclick = () => {
 if(confirm("¿Seguro que quieres borrar todo el historial de ventas?")) {
  sales = [];
  localStorage.removeItem("lachura_sales");
  $("viewSales").click(); // refresh modal
  toast("Ventas eliminadas");
 }
};

function printTicket(sale) {
 const ticketHTML = `
  <div style="font-family:monospace; width:300px; margin:0 auto; padding:20px; color:#000;">
   <div style="text-align:center; margin-bottom:15px;">
    <h2 style="margin:0; font-size:18px;">LA CHURA SNACK</h2>
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

load();
