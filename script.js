const API_URL="https://script.google.com/macros/s/AKfycbyGXX6nPtKPfSsGEGbieM4eaIPRfdRh_WTXuZI5-c9zEZRy6PmMWeL7J6wsPxncsFdSqQ/exec";
const STORAGE_KEY="lachura_products_v3";

const demo=[
{id:"d1",nombre:"Empanada de Queso",precio:8,categoria:"Empanadas",imagen:"https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=85",descripcion:"Masa doradita y relleno cremoso, recién preparada."},
{id:"d2",nombre:"Empanada de Carne",precio:10,categoria:"Empanadas",imagen:"https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=85",descripcion:"Relleno sabroso y especiado al estilo de la casa."},
{id:"d3",nombre:"Pizza Pepperoni",precio:38,categoria:"Pizza",imagen:"https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=85",descripcion:"Queso fundido, salsa de tomate y pepperoni."},
{id:"d4",nombre:"Pizza Chura",precio:45,categoria:"Pizza",imagen:"https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=85",descripcion:"La especialidad de la casa para compartir."},
{id:"d5",nombre:"Papas Chura",precio:18,categoria:"Snacks",imagen:"https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=85",descripcion:"Papas crocantes para acompañar tu pedido."},
{id:"d6",nombre:"Salchipapa",precio:22,categoria:"Snacks",imagen:"https://images.unsplash.com/photo-1623238913973-21e45cced554?auto=format&fit=crop&w=800&q=85",descripcion:"Una combinación contundente y deliciosa."},
{id:"d7",nombre:"Coca-Cola",precio:8,categoria:"Bebidas",imagen:"https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=800&q=85",descripcion:"Bien fría para acompañar tu comida."},
{id:"d8",nombre:"Limonada",precio:10,categoria:"Bebidas",imagen:"https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?auto=format&fit=crop&w=800&q=85",descripcion:"Refrescante, cítrica y perfecta para el calor."}
];

let products=[],localProducts=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"),cart=[],category="Todo",term="",selected=null;
const $=id=>document.getElementById(id);
const money=n=>`Bs ${Number(n||0).toFixed(2)}`;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function fallback(cat){
 const m={Pizza:demo[3].imagen,Empanadas:demo[0].imagen,Snacks:demo[4].imagen,Bebidas:demo[7].imagen};
 return m[cat]||demo[4].imagen;
}
function normalize(p,i){
 return{id:p.id||p.ID||`api-${i}`,nombre:p.nombre||p.Nombre||p.name||"Producto",precio:Number(p.precio??p.Precio??p.price??0),categoria:p.categoria||p.Categoria||"Snacks",imagen:p.imagen||p.Imagen||p.image||fallback(p.categoria),descripcion:p.descripcion||p.Descripcion||"Preparado especialmente para ti."};
}
async function load(){
 $("menu-productos").innerHTML=`<div class="loading"><span></span><p>Cargando sabores...</p></div>`;
 try{
  const r=await fetch(API_URL,{cache:"no-store"}); if(!r.ok)throw Error();
  const data=await r.json(); const remote=Array.isArray(data)?data.map(normalize):[];
  products=[...localProducts,...(remote.length?remote:demo)];
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
 const cliente=$("nombre-cliente").value.trim();if(!cliente){$("nombre-cliente").focus();return toast("Escribe tu nombre o mesa")}
 const btn=$("btn-enviar");btn.disabled=true;btn.innerHTML="Enviando…";
 const total=cart.reduce((s,x)=>s+x.precio*x.qty,0),orden=cart.flatMap(x=>Array(x.qty).fill(x.nombre)).join(", ");
 try{await fetch(API_URL,{method:"POST",body:JSON.stringify({cliente,orden,total})});cart=[];update();$("nombre-cliente").value="";close("cartModal");toast("¡Pedido enviado a cocina!")}
 catch(e){toast("No se pudo enviar. Revisa tu conexión.")}
 finally{btn.disabled=false;btn.innerHTML='Enviar a cocina <b>↗</b>'}
};
load();
