/**
 * LA CHURA SNACK — BACKEND CENTRALIZADO V5.2
 * Google Apps Script + Google Sheets
 *
 * SINCRONIZA:
 *  - PRODUCTOS
 *  - PEDIDOS
 *  - VENTAS
 *  - CAJA
 *  - MOVIMIENTOS
 *
 * La interfaz consulta el servidor cada 2 segundos para que
 * celular, caja, cocina y administrador vean el mismo estado.
 * Apps Script no ofrece WebSockets nativos; esto es sincronización
 * casi inmediata mediante polling centralizado.
 */

const SPREADSHEET_ID = '';
const STAFF_KEY = 'LA-CHURA-STAFF-2026';
const SHEETS = {
  products: 'PRODUCTOS',
  orders: 'PEDIDOS',
  sales: 'VENTAS',
  cash: 'CAJA',
  movements: 'MOVIMIENTOS'
};

const HEADERS = {
  products: ['id','nombre','precio','categoria','imagen','descripcion','activo'],
  orders: ['id','createdAt','updatedAt','token','cliente','deliveryType','address','itemsJson','total','status','source'],
  sales: ['id','timestamp','orderId','total','efectivo','cambio','source','itemsJson','cliente'],
  cash: ['id','estado','saldoInicial','abiertaAt','cerradaAt','usuario'],
  movements: ['id','timestamp','tipo','monto','detalle','orderId','source']
};

function db(){
  return SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

function sheet(name, headers){
  const ss = db();
  let sh = ss.getSheetByName(name);
  if(!sh) sh = ss.insertSheet(name);
  if(sh.getLastRow() === 0) sh.appendRow(headers);
  return sh;
}

function json(data){
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function rowsToObjects(sh){
  const values = sh.getDataRange().getValues();
  if(values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1)
    .filter(r => r.some(v => String(v).trim() !== ''))
    .map(r => Object.fromEntries(headers.map((h,i)=>[h,r[i]])));
}

function requireStaff(key){
  return String(key || '') === STAFF_KEY;
}

function doGet(e){
  const p = e.parameter || {};

  if(!p.action){
    const sh = sheet(SHEETS.products, HEADERS.products);
    return json(rowsToObjects(sh).filter(x => String(x.activo).toLowerCase() !== 'false'));
  }

  if(p.action === 'ping'){
    return json({ok:true,serverTime:new Date().toISOString()});
  }

  if(p.action === 'products'){
    return json({
      ok:true,
      products:rowsToObjects(sheet(SHEETS.products,HEADERS.products))
    });
  }

  if(p.action === 'order'){
    return json(getOrder(p.id,p.token));
  }

  if(p.action === 'orders'){
    if(!requireStaff(p.staffKey)) return json({ok:false,error:'UNAUTHORIZED'});
    return json({ok:true,orders:getOrders()});
  }

  if(p.action === 'dashboard'){
    if(!requireStaff(p.staffKey)) return json({ok:false,error:'UNAUTHORIZED'});
    return json(getDashboard());
  }

  if(p.action === 'caja'){
    if(!requireStaff(p.staffKey)) return json({ok:false,error:'UNAUTHORIZED'});
    return json({ok:true,caja:getCash(),movimientos:getMovements(),ventas:getSales()});
  }

  if(p.action === 'ventas'){
    if(!requireStaff(p.staffKey)) return json({ok:false,error:'UNAUTHORIZED'});
    return json({ok:true,ventas:getSales()});
  }

  return json({ok:false,error:'UNKNOWN_ACTION'});
}

function doPost(e){
  try{
    const body = JSON.parse(e.postData && e.postData.contents || '{}');
    const action = body.action || 'createOrder';

    if(action === 'createOrder') return json(createOrder(body));
    if(action === 'updateOrderStatus') return json(updateOrderStatus(body));
    if(action === 'upsertProduct') return json(upsertProduct(body));
    if(action === 'deleteProduct') return json(deleteProduct(body));
    if(action === 'openCash') return json(openCash(body));
    if(action === 'closeCash') return json(closeCash(body));
    if(action === 'cashMovement') return json(cashMovement(body));
    if(action === 'registerSale') return json(registerSale(body));

    return json({ok:false,error:'UNKNOWN_ACTION'});
  }catch(err){
    return json({ok:false,error:String(err)});
  }
}

function createOrder(b){
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try{
    const sh = sheet(SHEETS.orders, HEADERS.orders);
    const id = 'P-' + Utilities.getUuid().slice(0,6).toUpperCase();
    const token = Utilities.getUuid();
    const now = new Date().toISOString();
    const order = {
      id,
      createdAt:now,
      updatedAt:now,
      token,
      cliente:String(b.cliente || 'Cliente'),
      deliveryType:b.deliveryType === 'delivery' ? 'delivery' : 'pickup',
      address:String(b.address || ''),
      items:Array.isArray(b.items) ? b.items : [],
      total:Number(b.total || 0),
      status:'pending',
      source:String(b.source || 'web')
    };

    sh.appendRow([
      order.id,
      order.createdAt,
      order.updatedAt,
      order.token,
      order.cliente,
      order.deliveryType,
      order.address,
      JSON.stringify(order.items),
      order.total,
      order.status,
      order.source
    ]);

    return {ok:true,order};
  }finally{
    lock.releaseLock();
  }
}

function getOrder(id,token){
  if(!id || !token) return {ok:false,error:'MISSING_CREDENTIALS'};
  const list = rowsToObjects(sheet(SHEETS.orders,HEADERS.orders));
  const raw = list.find(x => String(x.id)===String(id) && String(x.token)===String(token));
  if(!raw) return {ok:false,error:'NOT_FOUND'};
  return {ok:true,order:orderPublic(raw)};
}

function getOrders(){
  return rowsToObjects(sheet(SHEETS.orders,HEADERS.orders))
    .map(orderPublic)
    .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}

function orderPublic(o){
  let items=[];
  try{
    items = typeof o.itemsJson === 'string'
      ? JSON.parse(o.itemsJson || '[]')
      : (o.itemsJson || []);
  }catch(err){ items=[]; }

  return {
    id:String(o.id),
    createdAt:String(o.createdAt),
    updatedAt:String(o.updatedAt),
    cliente:String(o.cliente),
    deliveryType:String(o.deliveryType || 'pickup'),
    address:String(o.address || ''),
    items,
    total:Number(o.total || 0),
    status:String(o.status || 'pending'),
    source:String(o.source || 'web'),
    token:o.token ? String(o.token) : undefined
  };
}

function updateOrderStatus(b){
  if(!requireStaff(b.staffKey)) return {ok:false,error:'UNAUTHORIZED'};
  const allowed=['pending','confirmed','cooking','ready','out_for_delivery','delivered','cancelled'];
  if(!allowed.includes(b.newStatus)) return {ok:false,error:'INVALID_STATUS'};

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try{
    const sh = sheet(SHEETS.orders,HEADERS.orders);
    const values = sh.getDataRange().getValues();
    const headers = values[0];
    const idCol = headers.indexOf('id') + 1;
    const statusCol = headers.indexOf('status') + 1;
    const updatedCol = headers.indexOf('updatedAt') + 1;

    for(let r=2;r<=values.length;r++){
      if(String(values[r-1][idCol-1]) === String(b.id)){
        const now = new Date().toISOString();
        sh.getRange(r,statusCol).setValue(b.newStatus);
        sh.getRange(r,updatedCol).setValue(now);
        return {ok:true,id:b.id,status:b.newStatus,updatedAt:now};
      }
    }
    return {ok:false,error:'NOT_FOUND'};
  }finally{
    lock.releaseLock();
  }
}

function upsertProduct(b){
  if(!requireStaff(b.staffKey)) return {ok:false,error:'UNAUTHORIZED'};
  const sh = sheet(SHEETS.products,HEADERS.products);
  const values = sh.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('id') + 1;
  const p = b.product || {};
  const id = String(p.id || ('p-' + Date.now()));
  const row = [
    id,
    p.nombre || '',
    Number(p.precio || 0),
    p.categoria || 'Snacks',
    p.imagen || '',
    p.descripcion || '',
    p.activo !== false
  ];

  for(let r=2;r<=values.length;r++){
    if(String(values[r-1][idCol-1]) === id){
      sh.getRange(r,1,1,row.length).setValues([row]);
      return {ok:true,product:{...p,id}};
    }
  }

  sh.appendRow(row);
  return {ok:true,product:{...p,id}};
}

function deleteProduct(b){
  if(!requireStaff(b.staffKey)) return {ok:false,error:'UNAUTHORIZED'};
  const sh = sheet(SHEETS.products,HEADERS.products);
  const values = sh.getDataRange().getValues();
  const idCol = values[0].indexOf('id');
  for(let r=1;r<values.length;r++){
    if(String(values[r][idCol]) === String(b.id)){
      sh.deleteRow(r+1);
      return {ok:true,id:b.id};
    }
  }
  return {ok:false,error:'NOT_FOUND'};
}

function getCash(){
  const sh = sheet(SHEETS.cash,HEADERS.cash);
  const rows = rowsToObjects(sh);
  if(!rows.length){
    sh.appendRow(['main','cerrada',0,'','', '']);
    return {id:'main',estado:'cerrada',saldoInicial:0,abiertaAt:'',cerradaAt:'',usuario:''};
  }
  const r=rows[0];
  return {
    id:String(r.id || 'main'),
    estado:String(r.estado || 'cerrada'),
    saldoInicial:Number(r.saldoInicial || 0),
    abiertaAt:String(r.abiertaAt || ''),
    cerradaAt:String(r.cerradaAt || ''),
    usuario:String(r.usuario || '')
  };
}

function saveCash(cash){
  const sh = sheet(SHEETS.cash,HEADERS.cash);
  if(sh.getLastRow()<2) sh.appendRow(['main',cash.estado,cash.saldoInicial,cash.abiertaAt,cash.cerradaAt,cash.usuario]);
  else sh.getRange(2,1,1,6).setValues([['main',cash.estado,cash.saldoInicial,cash.abiertaAt,cash.cerradaAt,cash.usuario]]);
}

function openCash(b){
  if(!requireStaff(b.staffKey)) return {ok:false,error:'UNAUTHORIZED'};
  const lock=LockService.getScriptLock(); lock.waitLock(10000);
  try{
    const current=getCash();
    if(current.estado==='abierta') return {ok:true,caja:current,alreadyOpen:true};
    const now=new Date().toISOString();
    const cash={id:'main',estado:'abierta',saldoInicial:Number(b.monto||0),abiertaAt:now,cerradaAt:'',usuario:String(b.usuario||'Caja')};
    saveCash(cash);
    return {ok:true,caja:cash};
  }finally{lock.releaseLock();}
}

function closeCash(b){
  if(!requireStaff(b.staffKey)) return {ok:false,error:'UNAUTHORIZED'};
  const lock=LockService.getScriptLock(); lock.waitLock(10000);
  try{
    const current=getCash();
    if(current.estado==='cerrada') return {ok:true,caja:current};
    const now=new Date().toISOString();
    current.estado='cerrada';
    current.cerradaAt=now;
    saveCash(current);
    return {ok:true,caja:current};
  }finally{lock.releaseLock();}
}

function cashMovement(b){
  if(!requireStaff(b.staffKey)) return {ok:false,error:'UNAUTHORIZED'};
  const cash=getCash();
  if(cash.estado!=='abierta') return {ok:false,error:'CASH_CLOSED'};
  const monto=Number(b.monto||0);
  if(monto<=0) return {ok:false,error:'INVALID_AMOUNT'};
  const tipo=b.tipo==='Egreso'?'Egreso':'Ingreso';
  const sh=sheet(SHEETS.movements,HEADERS.movements);
  const movement={
    id:'M-'+Utilities.getUuid().slice(0,6).toUpperCase(),
    timestamp:new Date().toISOString(),
    tipo,
    monto,
    detalle:String(b.detalle||''),
    orderId:String(b.orderId||''),
    source:String(b.source||'manual')
  };
  sh.appendRow([movement.id,movement.timestamp,movement.tipo,movement.monto,movement.detalle,movement.orderId,movement.source]);
  return {ok:true,movement};
}

function registerSale(b){
  if(!requireStaff(b.staffKey)) return {ok:false,error:'UNAUTHORIZED'};
  const sh=sheet(SHEETS.sales,HEADERS.sales);
  const sale={
    id:String(b.id || ('V-'+Utilities.getUuid().slice(0,6).toUpperCase())),
    timestamp:new Date().toISOString(),
    orderId:String(b.orderId||''),
    total:Number(b.total||0),
    efectivo:Number(b.efectivo||0),
    cambio:Number(b.cambio||0),
    source:String(b.source||'pos'),
    items:Array.isArray(b.items)?b.items:[],
    cliente:String(b.cliente||'Caja Local')
  };
  sh.appendRow([sale.id,sale.timestamp,sale.orderId,sale.total,sale.efectivo,sale.cambio,sale.source,JSON.stringify(sale.items),sale.cliente]);
  return {ok:true,sale};
}

function getMovements(){
  return rowsToObjects(sheet(SHEETS.movements,HEADERS.movements))
    .map(x=>({
      id:String(x.id),
      timestamp:String(x.timestamp),
      tipo:String(x.tipo),
      monto:Number(x.monto||0),
      detalle:String(x.detalle||''),
      orderId:String(x.orderId||''),
      source:String(x.source||'manual')
    }))
    .sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
}

function getSales(){
  return rowsToObjects(sheet(SHEETS.sales,HEADERS.sales))
    .map(x=>({
      id:String(x.id),
      timestamp:String(x.timestamp),
      orderId:String(x.orderId||''),
      total:Number(x.total||0),
      efectivo:Number(x.efectivo||0),
      cambio:Number(x.cambio||0),
      source:String(x.source||'pos'),
      cliente:String(x.cliente||''),
      items:(()=>{try{return JSON.parse(x.itemsJson||'[]')}catch(e){return[]}})()
    }))
    .sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
}

function getDashboard(){
  const orders=getOrders();
  const active=orders.filter(o=>!['delivered','cancelled'].includes(o.status));
  const sales=getSales();
  const movements=getMovements();
  const cash=getCash();
  const todayKey=new Date().toDateString();
  const todaySales=sales.filter(s=>new Date(s.timestamp).toDateString()===todayKey);
  const todayTotal=todaySales.reduce((sum,s)=>sum+Number(s.total||0),0);
  const todayManualIn=movements.filter(m=>m.tipo==='Ingreso' && new Date(m.timestamp).toDateString()===todayKey).reduce((s,m)=>s+m.monto,0);
  const todayManualOut=movements.filter(m=>m.tipo==='Egreso' && new Date(m.timestamp).toDateString()===todayKey).reduce((s,m)=>s+m.monto,0);
  const cashSales=sales.filter(s=>s.source==='pos').reduce((s,x)=>s+x.total,0);
  const balance=cash.estado==='abierta'
    ? cash.saldoInicial+cashSales+todayManualIn-todayManualOut
    : cash.saldoInicial;
  return {
    ok:true,
    serverTime:new Date().toISOString(),
    orders:active,
    allOrders:orders.slice(0,80),
    caja:cash,
    movimientos:movements.slice(0,100),
    ventas:sales.slice(0,100),
    metrics:{
      pedidosActivos:active.length,
      pendientes:active.filter(o=>o.status==='pending'||o.status==='confirmed').length,
      preparando:active.filter(o=>o.status==='cooking').length,
      listos:active.filter(o=>o.status==='ready').length,
      ventasHoy:todayTotal,
      saldoCaja:balance
    }
  };
}

function setup(){
  sheet(SHEETS.products,HEADERS.products);
  sheet(SHEETS.orders,HEADERS.orders);
  sheet(SHEETS.sales,HEADERS.sales);
  sheet(SHEETS.cash,HEADERS.cash);
  sheet(SHEETS.movements,HEADERS.movements);
  getCash();
}
