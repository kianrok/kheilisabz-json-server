/* فروشگاه خیلی سبز - نسخه متصل به JSON Server */
const API = 'http://localhost:3000';
const state = { products: [], cart: [], slides: [], brands: [], grades: [], banners: [], categories: [], currentIndex: 0, suggestionIndex: 0, search: '' };

async function api(path, options = {}) {
  const response = await fetch(`${API}/${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(`API ${response.status}: ${message || response.statusText}`);
  }
  if (response.status === 204) return null;
  return response.json();
}
function toPersianNumber(value) { return String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]); }
function formatPrice(value) { return `${toPersianNumber(Number(value || 0).toLocaleString('en-US'))} تومان`; }
function escapeHTML(value = '') { return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function notify(message) {
  const old = document.querySelector('.toast-notification'); if (old) old.remove();
  const node = document.createElement('div'); node.className = 'toast-notification'; node.textContent = message; document.body.appendChild(node);
  requestAnimationFrame(() => node.classList.add('show'));
  setTimeout(() => { node.classList.remove('show'); setTimeout(() => node.remove(), 300); }, 2600);
}
function allVisibleProducts() { return state.products.filter(p => !state.search || `${p.title} ${p.category || ''}`.toLocaleLowerCase().includes(state.search.toLocaleLowerCase())); }
function card(product) {
  const price = Number(product.price) || 0, discount = Number(product.discount) || price;
  const percent = discount > price ? Math.round((discount-price)/discount*100) : 0;
  return `<article class="product-card" data-id="${product.id}">
    <div class="product-image"><img src="${escapeHTML(product.image || '')}" alt="${escapeHTML(product.title)}" loading="lazy">${percent ? `<span class="badge-discount">${toPersianNumber(percent)}٪</span>` : ''}</div>
    <div class="product-info"><h3 class="product-title">${escapeHTML(product.title)}</h3><div class="product-price"><div><span class="price">${formatPrice(price)}</span>${discount > price ? ` <span class="discount">${formatPrice(discount)}</span>` : ''}</div></div>
    <button class="add-to-cart" data-add="${product.id}"><i class="fas fa-cart-plus"></i> افزودن به سبد</button></div></article>`;
}
function renderGrid(id, products, indexName) {
  const grid = document.getElementById(id); if (!grid) return;
  if (!products.length) { grid.innerHTML = '<p class="api-empty">محصولی برای نمایش پیدا نشد.</p>'; return; }
  const index = state[indexName] % products.length;
  const ordered = [...products.slice(index), ...products.slice(0, index)];
  grid.innerHTML = ordered.map(card).join('');
}
function renderProducts() { renderGrid('productGrid', allVisibleProducts().filter(p => p.featured), 'currentIndex'); }
function renderSuggestions() { renderGrid('suggestionGrid', allVisibleProducts().filter(p => p.suggested), 'suggestionIndex'); }
function renderSlides() {
  const wrapper = document.querySelector('.hero-slider-wrapper'); if (!wrapper || !state.slides.length) return;
  const dots = `<div class="hero-dots">${state.slides.map((s,i)=>`<span class="hero-dot ${i===0?'active':''}" data-slide="${i}" role="button" tabindex="0" aria-label="اسلاید ${i+1}"></span>`).join('')}</div>`;
  wrapper.innerHTML = state.slides.map((s,i)=>`<div class="hero-slide ${i===0?'active':''}"><img src="${escapeHTML(s.image)}" alt="${escapeHTML(s.alt || '')}" loading="lazy"></div>`).join('') + dots;
  let active = 0;
  const show = i => { const slides = wrapper.querySelectorAll('.hero-slide'), ds = wrapper.querySelectorAll('.hero-dot'); if (!slides.length) return; active = (i + slides.length) % slides.length; slides.forEach((el,n)=>el.classList.toggle('active',n===active)); ds.forEach((el,n)=>el.classList.toggle('active',n===active)); };
  wrapper.addEventListener('click', e => { const dot=e.target.closest('[data-slide]'); if(dot) show(Number(dot.dataset.slide)); });
  if (wrapper.dataset.autoplay) clearInterval(Number(wrapper.dataset.autoplay));
  wrapper.dataset.autoplay = setInterval(() => show(active+1), 5000);
}
function renderBrands() { const el=document.querySelector('.brands-grid'); if(el) el.innerHTML=state.brands.map(b=>`<a href="#" class="brand-item" data-brand="${b.id}"><img src="${escapeHTML(b.image || '')}" alt="${escapeHTML(b.title)}" loading="lazy"></a>`).join(''); }
function renderGrades() { const el=document.querySelector('.grade-filter'); if(el) el.innerHTML=state.grades.map((g,i)=>`<button class="grade-pill ${i===0?'active':''}" data-grade="${g.id}" data-title="${escapeHTML(g.title)}">${escapeHTML(g.title)}</button>`).join(''); }
function renderBanners() { const el=document.querySelector('.banners-grid'); if(el) el.innerHTML=state.banners.map(b=>`<a href="${escapeHTML(b.href || '#')}" class="banner-card"><img src="${escapeHTML(b.image || '')}" alt="${escapeHTML(b.title)}" loading="lazy"></a>`).join(''); }
function renderCategories() { const el=document.querySelector('.category-grid'); if(el) el.innerHTML=state.categories.map(c=>`<div class="category-card" data-category="${escapeHTML(c.title)}" role="button" tabindex="0"><i class="${escapeHTML(c.icon || 'fas fa-book')}"></i><h3>${escapeHTML(c.title)}</h3></div>`).join(''); }
function cartCount() { return state.cart.reduce((sum,item)=>sum + Number(item.quantity || 0),0); }
function productById(id) { return state.products.find(p => String(p.id) === String(id)); }
function renderCart() {
  const badge=document.querySelector('.cart-count'); if(badge) badge.textContent=toPersianNumber(cartCount());
  const body=document.getElementById('cartBody'); if(!body) return;
  if(!state.cart.length) body.innerHTML='<div class="cart-empty"><i class="fas fa-shopping-basket"></i><p>سبد خرید شما خالیه</p><button type="button" data-close-cart>مشاهده کتاب‌ها</button></div>';
  else body.innerHTML=state.cart.map(item=>{ const p=productById(item.productId); if(!p)return ''; return `<div class="cart-item"><div class="cart-item-image"><img src="${escapeHTML(p.image || '')}" alt="${escapeHTML(p.title)}"></div><div class="cart-item-info"><div><h4 class="cart-item-title">${escapeHTML(p.title)}</h4><div class="cart-item-price">${formatPrice(p.price*item.quantity)}</div></div><div class="cart-item-actions"><div class="quantity-control"><button type="button" data-qty="${p.id}" data-change="1" aria-label="افزودن">+</button><span>${toPersianNumber(item.quantity)}</span><button type="button" data-qty="${p.id}" data-change="-1" aria-label="کاهش">−</button></div><button class="remove-btn" type="button" data-remove="${p.id}" aria-label="حذف"><i class="fas fa-trash-alt"></i></button></div></div></div>`; }).join('');
  const total=document.getElementById('cartTotalPrice'); if(total) total.textContent=formatPrice(state.cart.reduce((sum,item)=>sum+(productById(item.productId)?.price || 0)*item.quantity,0));
}
async function refreshCart() { state.cart = await api('cart'); renderCart(); }
async function addToCart(id) {
  const product=productById(id); if(!product) return;
  try { const existing=state.cart.find(item=>String(item.productId)===String(id)); if(existing) await api(`cart/${existing.id}`,{method:'PATCH',body:JSON.stringify({quantity:Number(existing.quantity)+1})}); else await api('cart',{method:'POST',body:JSON.stringify({productId:product.id,quantity:1})});
    await refreshCart(); notify(`«${product.title}» به سبد اضافه شد`); openCart();
  } catch(err) { console.error(err); notify('افزودن به سبد خرید ناموفق بود. اتصال JSON Server را بررسی کنید.'); }
}
async function changeQuantity(id, delta) {
  const item=state.cart.find(i=>String(i.productId)===String(id)); if(!item)return;
  try { const quantity=Number(item.quantity)+delta; if(quantity<=0) await api(`cart/${item.id}`,{method:'DELETE'}); else await api(`cart/${item.id}`,{method:'PATCH',body:JSON.stringify({quantity})}); await refreshCart(); }
  catch(err){console.error(err);notify('تغییر تعداد انجام نشد.');}
}
async function removeFromCart(id) { const item=state.cart.find(i=>String(i.productId)===String(id)); if(!item)return; try {await api(`cart/${item.id}`,{method:'DELETE'});await refreshCart();}catch(err){console.error(err);notify('حذف محصول ناموفق بود.');} }
function openCart(){document.getElementById('cartPanel')?.classList.add('open');document.getElementById('cartOverlay')?.classList.add('open');document.body.style.overflow='hidden';}
function closeCart(){document.getElementById('cartPanel')?.classList.remove('open');document.getElementById('cartOverlay')?.classList.remove('open');document.body.style.overflow='';}
async function checkout(){
  if(!state.cart.length){notify('سبد خرید شما خالی است.');return;}
  const items=state.cart.map(item=>{const p=productById(item.productId);return p?{productId:p.id,title:p.title,price:p.price,quantity:item.quantity}:null;}).filter(Boolean);
  const total=items.reduce((sum,item)=>sum+item.price*item.quantity,0);
  try { await api('orders',{method:'POST',body:JSON.stringify({items,total,status:'ثبت‌شده',createdAt:new Date().toISOString()})}); await Promise.all(state.cart.map(item=>api(`cart/${item.id}`,{method:'DELETE'}))); await refreshCart(); notify('سفارش آزمایشی ثبت شد. درگاه پرداخت واقعی متصل نیست.'); closeCart(); }
  catch(err){console.error(err);notify('ثبت سفارش انجام نشد. اتصال سرور را بررسی کنید.');}
}
async function searchProducts(){const input=document.getElementById('searchInput');state.search=input?.value.trim()||'';state.currentIndex=0;state.suggestionIndex=0;renderProducts();renderSuggestions();const first=document.querySelector('.products-section');if(first)first.scrollIntoView({behavior:'smooth',block:'start'});}
function bindEvents(){
  document.addEventListener('click',e=>{
    const add=e.target.closest('[data-add]'); if(add){addToCart(add.dataset.add);return;}
    const qty=e.target.closest('[data-qty]'); if(qty){changeQuantity(qty.dataset.qty,Number(qty.dataset.change));return;}
    const remove=e.target.closest('[data-remove]'); if(remove){removeFromCart(remove.dataset.remove);return;}
    if(e.target.closest('[data-close-cart]'))closeCart();
    const grade=e.target.closest('[data-grade]'); if(grade){document.querySelectorAll('.grade-pill').forEach(b=>b.classList.toggle('active',b===grade));state.search=grade.dataset.title==='کنکور'||grade.dataset.title==='جامع'?'':grade.dataset.title;const input=document.getElementById('searchInput');if(input)input.value=state.search;renderProducts();renderSuggestions();}
    const category=e.target.closest('[data-category]'); if(category){state.search=category.dataset.category.replace('کنکور ','');const input=document.getElementById('searchInput');if(input)input.value=state.search;renderProducts();renderSuggestions();document.querySelector('.products-section')?.scrollIntoView({behavior:'smooth'});}
  });
  document.getElementById('prevBtn')?.addEventListener('click',()=>{const list=allVisibleProducts().filter(p=>p.featured);if(list.length){state.currentIndex=(state.currentIndex-1+list.length)%list.length;renderProducts();}});
  document.getElementById('nextBtn')?.addEventListener('click',()=>{const list=allVisibleProducts().filter(p=>p.featured);if(list.length){state.currentIndex=(state.currentIndex+1)%list.length;renderProducts();}});
  document.getElementById('sugPrevBtn')?.addEventListener('click',()=>{const list=allVisibleProducts().filter(p=>p.suggested);if(list.length){state.suggestionIndex=(state.suggestionIndex-1+list.length)%list.length;renderSuggestions();}});
  document.getElementById('sugNextBtn')?.addEventListener('click',()=>{const list=allVisibleProducts().filter(p=>p.suggested);if(list.length){state.suggestionIndex=(state.suggestionIndex+1)%list.length;renderSuggestions();}});
  document.getElementById('searchBtn')?.addEventListener('click',searchProducts);
  document.getElementById('searchInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchProducts();}});
  document.querySelector('.cart-btn')?.addEventListener('click',e=>{e.preventDefault();openCart();});
  document.getElementById('cartClose')?.addEventListener('click',closeCart);document.getElementById('cartOverlay')?.addEventListener('click',closeCart);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCart();});
  document.querySelector('.checkout-btn')?.addEventListener('click',checkout);
  document.getElementById('menuToggle')?.addEventListener('click',()=>document.getElementById('mobileMenu')?.classList.toggle('open'));
  window.addEventListener('scroll',()=>{document.getElementById('mainHeader')?.classList.toggle('scrolled',window.scrollY>50);document.getElementById('backToTop')?.classList.toggle('show',window.scrollY>400);},{passive:true});
  document.getElementById('backToTop')?.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
}
async function init(){bindEvents();try{
  const [products,cart,slides,brands,grades,banners,categories]=await Promise.all([api('products'),api('cart'),api('slides'),api('brands'),api('grades'),api('banners'),api('categories')]);
  Object.assign(state,{products,cart,slides,brands,grades,banners,categories});
  renderProducts();renderSuggestions();renderCart();renderSlides();renderBrands();renderGrades();renderBanners();renderCategories();
  console.info('JSON Server connected.');
}catch(err){console.error(err);document.querySelectorAll('#productGrid,#suggestionGrid').forEach(el=>el.innerHTML='<p class="api-error">ارتباط با JSON Server برقرار نشد. ابتدا سرور را اجرا کنید: npm run server</p>');notify('JSON Server در دسترس نیست. راهنمای README را ببینید.');}}
document.addEventListener('DOMContentLoaded',init);
