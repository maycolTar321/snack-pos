const API_URL="https://script.google.com/macros/s/AKfycbyGXX6nPtKPfSsGEGbieM4eaIPRfdRh_WTXuZI5-c9zEZRy6PmMWeL7J6wsPxncsFdSqQ/exec";
const POLL=3000,$=id=>document.getElementById(id),money=n=>"Bs "+Number(n||0).toFixed(2).replace(".",",");
let products=[],orders=[],customerCart=[],posCart=[],category="Todos",currentView="customerView";

const demo=[
{id:"1",nombre:"Empanada Mixta",categoria:"Empanadas",precio:8,descripcion:"Carne, queso y especias.",icon:"ph-cookie"},
{id:"2",nombre:"Empanada de Queso",categoria:"Empanadas",precio:7,descripcion:"Queso cremoso y masa crocante.",icon:"ph-cookie"},
{id:"3",nombre:"Pizza Familiar",categoria:"Pizza",precio:55,descripcion:"Pizza para compartir.",icon:"ph-pizza"},
{id:"4",nombre:"Pizza Mixta",categoria:"Pizza",precio:48,descripcion:"Jamón, queso y vegetales.",icon:"ph-pizza"},
{id:"5",nombre:"Hamburguesa Chura",categoria:"Snacks",precio:28,descripcion:"Carne, queso y salsa especial.",icon:"ph-hamburger"},
{id:"6",nombre:"Papas Fritas",categoria:"Snacks",precio:15,descripcion:"Crocantes y recién hechas.",icon:"ph-french-fries"},
{id:"7",nombre:"Coca Cola",categoria:"Bebidas",precio:10,descripcion:"Bebida fría.",icon:"ph-coffee"},
{id:"8",nombre:"Soda Personal",categoria:"Bebidas",precio:6,descripcion:"Bebida refrescante.",icon:"ph-drop"}];

const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function toast(t){$("toast").textContent=t;$("toast").classList.add("show");clearTimeout(window.tt);window.tt=setTimeout(()=>$("toast").classList.remove("show"),2200)}
function modal(id,on=true){$(id).classList.toggle("open",on)}
function normalize(p){return{id:String(p.id||crypto.randomUUID?.()||Date.now()),nombre:p.nombre||p.name||"Producto",categoria:p.categoria||p.category||"Otros",precio:Number(p.precio||p.price||0),descripcion:p.descripcion||p.description||"",icon:p.icon||"ph-package",activo:p.activo!==false&&String(p.activo)!=="FALSE"}}
async function get(action,extra={}){const u=new URL(API_URL);u.searchParams.set("action",action);Object.entries(extra).forEach(([k,v])=>u.searchParams.set(k,v));const r=await fetch(u,{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);return r.json()}
async function post(body){const r=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(body)});if(!r.ok)throw Error("HTTP "+r.status);return r.json()}

async function sync(){
 try{
  const d=await get("dashboard");
  if(d.ok){products=(d.products||products).map(normalize);orders=d.orders||[];$("connectionText").textContent="ONLINE";renderAll()}
 }catch(e){$("connectionText").textContent="LOCAL";if(!products.length)products=demo;renderAll()}
}
function renderAll(){renderCategories();renderProducts();renderCustomerCart();renderPosMini();renderPosCart();renderOrders();renderKitchen();renderAdminProducts()}
function renderCategories(){const c=["Todos",...new Set(products.map(p=>p.categoria))];$("categories").innerHTML=c.map(x=>`<button class="${x===category?"active":""}" onclick="setCat('${esc(x)}')">${esc(x)}</button>`).join("")}
function setCat(x){category=x;renderCategories();renderProducts()}
function renderProducts(){
 const q=$("search").value.toLowerCase(),list=products.filter(p=>p.activo&&(category==="Todos"||p.categoria===category)&&(p.nombre+" "+p.descripcion).toLowerCase().includes(q));
 $("productCount").textContent=list.length;
 $("products").innerHTML=list.map(p=>`<article class="product"><div class="product-image"><span class="badge">${esc(p.categoria)}</span><i class="ph ${p.icon}"></i></div><div class="product-body"><h3>${esc(p.nombre)}</h3><p>${esc(p.descripcion)}</p><div class="product-foot"><b class="price">${money(p.precio)}</b><button class="add" onclick="addCustomer('${p.id}')"><i class="ph ph-plus"></i></button></div></div></article>`).join("")}
function addCustomer(id){addTo(customerCart,id);renderCustomerCart();$("floatingCart").style.display="flex";toast("Producto agregado")}
function addTo(arr,id){const p=products.find(x=>x.id===String(id));if(!p)return;const i=arr.find(x=>String(x.id)===String(id));i?i.qty++:arr.push({...p,qty:1})}
function changeArr(arr,id,d){const i=arr.find(x=>String(x.id)===String(id));if(!i)return;i.qty+=d;if(i.qty<=0)arr.splice(arr.indexOf(i),1)}
function renderCustomerCart(){
 const total=customerCart.reduce((s,x)=>s+x.precio*x.qty,0),count=customerCart.reduce((s,x)=>s+x.qty,0);
 $("customerTotal").textContent=money(total);$("floatTotal").textContent=money(total);$("floatCount").textContent=count+" producto"+(count===1?"":"s");
 $("customerCartItems").innerHTML=customerCart.length?customerCart.map(x=>line(x,"customer")) .join(""):`<div class="empty"><p>Tu pedido está vacío.</p></div>`;
}
function line(x,type){const fn=type==="customer"?`changeCustomer('${x.id}',`:`changePos('${x.id}',`;return `<div class="cart-line"><div><b>${esc(x.nombre)}</b><small>${money(x.precio)} c/u</small><div class="q"><button onclick="${fn}-1)">−</button><span>${x.qty}</span><button onclick="${fn}1)">+</button></div></div><b>${money(x.precio*x.qty)}</b></div>`}
function changeCustomer(id,d){changeArr(customerCart,String(id),d);renderCustomerCart()}
function renderPosMini(){$("posMiniMenu").innerHTML=products.slice(0,8).map(p=>`<button class="mini-product" onclick="addPos('${p.id}')"><b>${esc(p.nombre)}</b><span>${money(p.precio)} · +</span></button>`).join("")}
function addPos(id){addTo(posCart,id);renderPosCart();openPosCart();toast("Agregado a comanda")}
function changePos(id,d){changeArr(posCart,String(id),d);renderPosCart()}
function renderPosCart(){const total=posCart.reduce((s,x)=>s+x.precio*x.qty,0);$("posTotal").textContent=money(total);$("posCartItems").innerHTML=posCart.map(x=>line(x,"pos")).join("")||`<div class="empty"><p>Agrega productos para crear la comanda.</p></div>`}
function openPosCart(){$("posCart").classList.add("open")}
function renderOrders(){
 const active=orders.filter(o=>!["delivered","cancelled"].includes(o.status));
 const sales=orders.filter(o=>o.status!=="cancelled").reduce((s,o)=>s+Number(o.total||0),0);
 $("statOrders").textContent=active.length;$("statKitchen").textContent=active.filter(o=>["pending","confirmed","cooking"].includes(o.status)).length;$("statSales").textContent=money(sales);
 $("ordersTable").innerHTML=orders.slice(0,20).map(o=>`<div class="order-row"><div><b class="order-number">#${esc(o.id)}</b><small>${o.table==="takeaway"?"Para llevar":"Mesa "+esc(o.table||"-")}</small></div><div><b>${esc(o.client||"Cliente")}</b><small>${(o.items||[]).length} líneas · ${money(o.total)}</small></div><div><span class="order-status">${labelStatus(o.status)}</span></div><button class="order-action" onclick="changeOrder('${esc(o.id)}','${next(o.status)}')">${actionStatus(o.status)}</button></div>`).join("")||`<div class="empty"><p>No hay pedidos registrados.</p></div>`}
function labelStatus(s){return({pending:"Recibido",confirmed:"Confirmado",cooking:"Preparando",ready:"Listo",delivered:"Entregado",cancelled:"Cancelado"}[s]||s||"—")}
function next(s){return s==="pending"||s==="confirmed"?"cooking":s==="cooking"?"ready":"delivered"}
function actionStatus(s){return s==="ready"?"Entregar":s==="cooking"?"Marcar listo":"Preparar"}
async function changeOrder(id,status){try{await post({action:"updateOrder",id,status});toast("Estado actualizado");sync()}catch(e){toast("No se pudo actualizar")}}
function renderKitchen(){
 const map={pending:$("kPendingList"),cooking:$("kCookingList"),ready:$("kReadyList")};
 ["pending","cooking","ready"].forEach(k=>map[k].innerHTML="");
 const p=orders.filter(o=>["pending","confirmed"].includes(o.status)),c=orders.filter(o=>o.status==="cooking"),r=orders.filter(o=>o.status==="ready");
 $("kPending").textContent=p.length;$("kCooking").textContent=c.length;$("kReady").textContent=r.length;
 p.forEach(o=>map.pending.innerHTML+=kcard(o));c.forEach(o=>map.cooking.innerHTML+=kcard(o));r.forEach(o=>map.ready.innerHTML+=kcard(o));
}
function kcard(o){const n=next(o.status),a=actionStatus(o.status);return `<article class="k-card"><div class="top"><strong>#${esc(o.id)}</strong><small>${o.table==="takeaway"?"Para llevar":"Mesa "+esc(o.table||"-")}</small></div><p>${(o.items||[]).map(i=>`${i.qty}× ${esc(i.nombre)}`).join("<br>")}</p><button onclick="changeOrder('${esc(o.id)}','${n}')">${a}</button></article>`}
async function sendCustomer(){
 if(!customerCart.length)return toast("Agrega productos primero");
 const payload=orderPayload(customerCart,"customer",$("customerTable").value,$("customerName").value,$("customerNote").value);
 await createOrder(payload,true);
}
async function sendPos(){
 if(!posCart.length)return toast("Agrega productos a la comanda");
 const payload=orderPayload(posCart,"cashier",$("posTable").value,$("posClient").value,$("posNote").value);
 await createOrder(payload,false);
}
function orderPayload(arr,source,table,client,note){return{action:"createOrder",source,table,client:(client||"Cliente").trim(),note:(note||"").trim(),items:arr.map(x=>({id:x.id,nombre:x.nombre,precio:x.precio,qty:x.qty})),total:arr.reduce((s,x)=>s+x.precio*x.qty,0)}}
async function createOrder(payload,customer){
 try{
  const d=await post(payload);if(!d.ok)throw Error(d.error||"Error");
  const id=d.id||d.orderId||"P-"+Date.now().toString().slice(-6);
  if(customer){customerCart=[];renderCustomerCart();modal("customerCart",false);$("successId").textContent="Pedido #"+id;modal("successModal",true)}
  else{posCart=[];renderPosCart();$("posCart").classList.remove("open");toast("Pedido enviado a cocina #"+id)}
  sync();
 }catch(e){toast("No se pudo enviar. Revisa la conexión.")}
}
async function track(){
 const id=$("trackId").value.trim();if(!id)return toast("Escribe un número de pedido");
 try{const d=await get("order",{id});if(!d.ok||!d.order)throw Error("Pedido no encontrado");const o=d.order;const steps=["pending","cooking","ready","delivered"],idx=Math.max(0,steps.indexOf(o.status));$("trackResult").innerHTML=`<div class="track-result"><b>Pedido #${esc(o.id)}</b><p style="font-size:9px;color:#747973">${esc(o.client||"Cliente")} · ${o.table==="takeaway"?"Para llevar":"Mesa "+esc(o.table||"")}</p><strong style="color:var(--brand)">${labelStatus(o.status)}</strong><div class="stepper">${steps.map((s,i)=>`<div class="step ${i<=idx?"done":""}"><i class="ph ${i===0?"ph-receipt":i===1?"ph-chef-hat":i===2?"ph-check-circle":"ph-hand-heart"}"></i>${labelStatus(s)}</div>`).join("")}</div></div>`}catch(e){toast(e.message)}}
function renderAdminProducts(){$("productList").innerHTML=products.map(p=>`<div class="admin-product"><div><b>${esc(p.nombre)}</b><small>${esc(p.categoria)} · ${money(p.precio)}</small></div><button onclick="editProduct('${p.id}')"><i class="ph ph-pencil"></i></button></div>`).join("")}
function editProduct(id){const p=products.find(x=>x.id===String(id));if(!p)return;$("editId").value=p.id;$("prodName").value=p.nombre;$("prodPrice").value=p.precio;$("prodCat").value=p.categoria}
async function saveProduct(e){e.preventDefault();try{const d=await post({action:"saveProduct",id:$("editId").value,nombre:$("prodName").value,precio:Number($("prodPrice").value),categoria:$("prodCat").value});if(!d.ok)throw Error();e.target.reset();toast("Producto guardado");sync()}catch(e){toast("No se pudo guardar")}}

function switchView(id){
 currentView=id;document.querySelectorAll(".customer-view,.pos-view,.kitchen-view,.admin-view").forEach(x=>x.classList.add("hidden"));$(id).classList.remove("hidden");
 document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===id));
 if(id==="posView")renderOrders();if(id==="kitchenView")renderKitchen();if(id==="adminView")renderAdminProducts();
}
document.querySelectorAll(".bottom-nav button").forEach(b=>b.onclick=()=>switchView(b.dataset.view));
$("heroMenu").onclick=()=>$("menu").scrollIntoView({behavior:"smooth"});
$("search").oninput=renderProducts;
$("openCustomerCart").onclick=()=>modal("customerCart",true);
$("customerSend").onclick=sendCustomer;
$("posSend").onclick=sendPos;
$("posNew").onclick=()=>{posCart=[];renderPosCart();openPosCart()};
$("posCloseCart").onclick=()=>$("posCart").classList.remove("open");
$("trackOpen").onclick=()=>modal("trackModal",true);
$("trackBtn").onclick=track;
$("adminOpen").onclick=()=>switchView("adminView");
$("syncBtn").onclick=sync;
$("productForm").onsubmit=saveProduct;
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>modal(b.dataset.close,false));
document.querySelectorAll(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)modal(m.id,false)}));
(async()=>{products=demo;renderAll();await sync();setInterval(sync,POLL)})();
