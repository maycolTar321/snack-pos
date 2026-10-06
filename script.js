const API_URL = "https://script.google.com/macros/s/AKfycbyGXX6nPtKPfSsGEGbieM4eaIPRfdRh_WTXuZI5-c9zEZRy6PmMWeL7J6wsPxncsFdSqQ/exec";
const STORAGE_KEY = "lachura_local_products_v2";

const demoProducts = [
  {id:"d1",nombre:"Empanada de Queso",precio:8,categoria:"Empanadas",imagen:"https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85",descripcion:"Masa doradita y relleno cremoso, recién salida del horno."},
  {id:"d2",nombre:"Empanada de Carne",precio:10,categoria:"Empanadas",imagen:"https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=900&q=85",descripcion:"Relleno sabroso, especiado y preparado al estilo de la casa."},
  {id:"d3",nombre:"Pizza Pepperoni",precio:38,categoria:"Pizza",imagen:"https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=900&q=85",descripcion:"Queso fundido, salsa de tomate y pepperoni generoso."},
  {id:"d4",nombre:"Pizza Chura",precio:45,categoria:"Pizza",imagen:"https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=85",descripcion:"La especialidad de la casa para compartir."},
  {id:"d5",nombre:"Papas Chura",precio:18,categoria:"Snacks",imagen:"https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=85",descripcion:"Papas crocantes para acompañar tu pedido."},
  {id:"d6",nombre:"Salchipapa",precio:22,categoria:"Snacks",imagen:"https://images.unsplash.com/photo-1623238913973-21e45cced554?auto=format&fit=crop&w=900&q=85",descripcion:"Una combinación contundente para quitar el hambre."},
  {id:"d7",nombre:"Coca-Cola",precio:8,categoria:"Bebidas",imagen:"https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=900&q=85",descripcion:"Bebida fría para acompañar tu comida."},
  {id:"d8",nombre:"Limonada",precio:10,categoria:"Bebidas",imagen:"https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?auto=format&fit=crop&w=900&q=85",descripcion:"Refrescante, cítrica y perfecta para el calor."}
];

let products = [];
let cart = [];
let activeCategory = "Todo";
let searchTerm = "";
let selectedProduct = null;
let localProducts = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

const $ = id => document.getElementById(id);
const money = n => `Bs ${Number(n || 0).toFixed(2)}`;

function escapeHTML(value=""){
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function normalize(p,i=0){
  return {
    id:p.id || p.ID || `api-${i}-${Date.now()}`,
    nombre:p.nombre || p.Nombre || p.name || "Producto",
    precio:Number(p.precio ?? p.Precio ?? p.price ?? 0),
    categoria:p.categoria || p.Categoria || p.category || "Snacks",
    imagen:p.imagen || p.Imagen || p.image || fallbackImage(p.categoria || "Snacks"),
    descripcion:p.descripcion || p.Descripcion || p.description || "Preparado especialmente para ti."
  };
}
function fallbackImage(cat){
  const map={
    Pizza:"https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=85",
    Empanadas:"https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85",
    Snacks:"https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=85",
    Bebidas:"https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?auto=format&fit=crop&w=900&q=85"
  };
  return map[cat] || map.Snacks;
}
async function cargarMenu(){
  renderLoading();
  try{
    const response = await fetch(API_URL, {cache:"no-store"});
    if(!response.ok) throw new Error("API");
    const data = await response.json();
    const remote = Array.isArray(data) ? data.map(normalize) : [];
    products = [...localProducts, ...(remote.length ? remote : demoProducts)];
    showToast(remote.length ? "Menú actualizado" : "Mostrando menú de ejemplo");
  }catch(e){
    products = [...localProducts, ...demoProducts];
    showToast("Modo demostración activo");
  }
  renderProducts();
}
function renderLoading(){
  $("menu-productos").innerHTML = `<div class="loading-card"><span class="loader"></span><p>Preparando el menú...</p></div>`;
}
function filteredProducts(){
  const term=searchTerm.trim().toLowerCase();
  return products.filter(p=>{
    const categoryOK=activeCategory==="Todo" || String(p.categoria).toLowerCase()===activeCategory.toLowerCase();
    const text=`${p.nombre} ${p.categoria} ${p.descripcion}`.toLowerCase();
    return categoryOK && (!term || text.includes(term));
  });
}
function renderProducts(){
  const list=filteredProducts();
  $("productCount").textContent=`${list.length} producto${list.length===1?"":"s"}`;
  $("emptyState").hidden=list.length!==0;
  $("menu-productos").innerHTML=list.map(p=>`
    <article class="product-card" data-id="${escapeHTML(p.id)}">
      <div class="product-image-wrap">
        <img loading="lazy" src="${escapeHTML(p.imagen)}" alt="${escapeHTML(p.nombre)}" onerror="this.src='${fallbackImage(p.categoria)}'">
        <span class="product-tag">${escapeHTML(p.categoria)}</span>
        <button class="add-btn" data-add="${escapeHTML(p.id)}" aria-label="Agregar ${escapeHTML(p.nombre)}">+</button>
      </div>
      <div class="product-info">
        <h3>${escapeHTML(p.nombre)}</h3>
        <p>${escapeHTML(p.descripcion)}</p>
        <div class="price">${money(p.precio)}</div>
      </div>
    </article>
  `).join("");
}
function addToCart(product){
  const found=cart.find(i=>i.id===product.id);
  if(found) found.qty++;
  else cart.push({...product,qty:1});
  updateCart();
  showToast(`${product.nombre} agregado al pedido`);
}
function updateCart(){
  const count=cart.reduce((s,i)=>s+i.qty,0);
  const total=cart.reduce((s,i)=>s+i.precio*i.qty,0);
  $("itemCount").textContent=count;
  $("totalPrice").textContent=money(total);
  $("modalTotal").textContent=money(total);
  $("cartBar").hidden=count===0;
  $("cartItems").innerHTML=cart.length ? cart.map(i=>`
    <div class="cart-row">
      <div class="cart-row-info">
        <img src="${escapeHTML(i.imagen)}" alt="">
        <div><strong>${escapeHTML(i.nombre)}</strong><small>${money(i.precio)} c/u</small></div>
      </div>
      <div class="qty">
        <button data-qty="${i.id}" data-delta="-1">−</button><strong>${i.qty}</strong>
        <button data-qty="${i.id}" data-delta="1">+</button>
      </div>
    </div>
  `).join("") : `<div class="empty-state"><div class="empty-icon">🛒</div><h3>Tu pedido está vacío</h3><p>Agrega algo delicioso del menú.</p></div>`;
}
function openModal(id){$(id).classList.add("show");document.body.style.overflow="hidden"}
function closeModal(id){$(id).classList.remove("show");document.body.style.overflow=""}
function showProduct(product){
  selectedProduct=product;
  $("detailImage").src=product.imagen;
  $("detailImage").alt=product.nombre;
  $("detailCategory").textContent=product.categoria;
  $("detailName").textContent=product.nombre;
  $("detailDescription").textContent=product.descripcion;
  $("detailPrice").textContent=money(product.precio);
  openModal("productModal");
}
function showToast(msg){
  const t=$("toast");t.textContent=msg;t.classList.add("show");
  clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>t.classList.remove("show"),2200);
}

document.addEventListener("click",e=>{
  const add=e.target.closest("[data-add]");
  if(add){const p=products.find(x=>String(x.id)===String(add.dataset.add));if(p)addToCart(p);return}
  const card=e.target.closest(".product-card");
  if(card && !e.target.closest(".add-btn")){const p=products.find(x=>String(x.id)===String(card.dataset.id));if(p)showProduct(p);return}
  const qty=e.target.closest("[data-qty]");
  if(qty){
    const item=cart.find(x=>String(x.id)===String(qty.dataset.qty));
    if(item){item.qty+=Number(qty.dataset.delta);if(item.qty<=0)cart=cart.filter(x=>x.id!==item.id);updateCart()}
    return;
  }
  const close=e.target.closest("[data-close]");
  if(close)closeModal(close.dataset.close);
});

$("openCart").onclick=()=>{updateCart();openModal("cartModal")};
$("scrollMenu").onclick=()=>$("menuSection").scrollIntoView({behavior:"smooth"});
$("openAdmin").onclick=()=>openModal("adminModal");
$("resetFilters").onclick=()=>{activeCategory="Todo";searchTerm="";$("searchInput").value="";$("clearSearch").hidden=true;document.querySelectorAll(".category").forEach(b=>b.classList.toggle("active",b.dataset.category==="Todo"));renderProducts()};
$("searchInput").addEventListener("input",e=>{searchTerm=e.target.value;$("clearSearch").hidden=!searchTerm;renderProducts()});
$("clearSearch").onclick=()=>{$("searchInput").value="";searchTerm="";$("clearSearch").hidden=true;renderProducts()};
document.querySelectorAll(".category").forEach(btn=>btn.onclick=()=>{
  activeCategory=btn.dataset.category;
  document.querySelectorAll(".category").forEach(b=>b.classList.toggle("active",b===btn));
  renderProducts();
});

$("detailAdd").onclick=()=>{if(selectedProduct){addToCart(selectedProduct);closeModal("productModal")}};

$("newImage").addEventListener("change",e=>{
  const file=e.target.files[0];if(!file)return;
  if(file.size>2.5*1024*1024){showToast("La imagen debe pesar menos de 2.5 MB");e.target.value="";return}
  const reader=new FileReader();
  reader.onload=()=>{$("imagePreview").src=reader.result;$("imagePreview").hidden=false;$("uploadTitle").textContent=file.name};
  reader.readAsDataURL(file);
});

$("productForm").addEventListener("submit",e=>{
  e.preventDefault();
  const file=$("newImage").files[0];
  const imageUrl=$("newImageUrl").value.trim();
  const save=(image)=>{
    const p={
      id:"local-"+Date.now(),
      nombre:$("newName").value.trim(),
      precio:Number($("newPrice").value),
      categoria:$("newCategory").value,
      imagen:image || fallbackImage($("newCategory").value),
      descripcion:$("newDescription").value.trim() || "Preparado especialmente para ti."
    };
    localProducts.unshift(p);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(localProducts));
    products=[p,...products];
    renderProducts();e.target.reset();$("imagePreview").hidden=true;$("uploadTitle").textContent="Cargar foto del producto";
    showToast("Producto agregado al menú");
  };
  if(file){
    const reader=new FileReader();reader.onload=()=>save(reader.result);reader.readAsDataURL(file);
  }else save(imageUrl);
});

$("restoreDemo").onclick=()=>{
  localProducts=[];
  localStorage.removeItem(STORAGE_KEY);
  products=[...demoProducts];
  renderProducts();
  showToast("Productos de ejemplo restaurados");
};
$("clearLocal").onclick=()=>{
  if(!localProducts.length){showToast("No hay productos locales");return}
  if(confirm("¿Borrar los productos que cargaste manualmente en este dispositivo?")){
    const ids=new Set(localProducts.map(p=>p.id));localProducts=[];localStorage.removeItem(STORAGE_KEY);
    products=products.filter(p=>!ids.has(p.id));renderProducts();showToast("Productos locales eliminados");
  }
};

document.querySelectorAll(".overlay").forEach(o=>o.addEventListener("click",e=>{if(e.target===o)closeModal(o.id)}));

$("btn-enviar").onclick=async()=>{
  if(!cart.length){showToast("Agrega productos primero");return}
  const cliente=$("nombre-cliente").value.trim();
  if(!cliente){$("nombre-cliente").focus();showToast("Escribe tu nombre o mesa");return}
  const btn=$("btn-enviar");btn.disabled=true;btn.innerHTML="Enviando pedido…";
  const orden=cart.flatMap(i=>Array(i.qty).fill(i.nombre)).join(", ");
  const total=cart.reduce((s,i)=>s+i.precio*i.qty,0);
  try{
    await fetch(API_URL,{method:"POST",body:JSON.stringify({cliente,orden,total})});
    showToast("¡Pedido enviado a cocina!");
    cart=[];$("nombre-cliente").value="";updateCart();closeModal("cartModal");
  }catch(err){
    showToast("No se pudo conectar con cocina. Revisa tu conexión.");
  }finally{btn.disabled=false;btn.innerHTML='Enviar pedido a cocina <span>↗</span>'}
};

cargarMenu();
