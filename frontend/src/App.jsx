
import React,{createContext,useContext,useEffect,useState}from'react';
import {
  Routes,
  Route,
  Link,
  Navigate,
  useNavigate,
  useParams,
  useLocation,
useSearchParams
} from 'react-router-dom';
import api,{imageUrl}from'./api';
const C=createContext(null);const useAuth=()=>useContext(C);
function AuthProvider({children}){const[user,setUser]=useState(null);useEffect(()=>{if(localStorage.getItem('sn_token'))api.get('/auth/me').then(x=>setUser(x.data.user)).catch(()=>{localStorage.removeItem('sn_token')})},[]);const login=async(path,data)=>{const x=await api.post(`/auth/${path}`,data);localStorage.setItem('sn_token',x.data.token);setUser(x.data.user);return x.data};const logout=()=>{localStorage.removeItem('sn_token');setUser(null)};return <C.Provider value={{user,setUser,login,logout}}>{children}</C.Provider>}
function Notice({message}){return message?<p className="notice">{message}</p>:null}
function Layout({children}){const{user,logout}=useAuth();return <><header><Link className="brand" to="/">ShopNexus</Link><nav><Link to="/">Shop</Link>{user&&<><Link to="/cart">Cart</Link><Link to="/orders">Orders</Link><Link to="/wishlist">Wishlist</Link><Link to="/profile">Profile</Link></>}{user?.role==='admin'&&<Link to="/admin">Admin</Link>}{user?<button className="linkbtn" onClick={logout}>Logout</button>:<><Link to="/login">Login</Link><Link to="/register">Register</Link></>}</nav></header><main>{children}</main><footer>© {new Date().getFullYear()} ShopNexus · Secure shopping</footer></>}
function ProductCard({ p }) {
  const location = useLocation();

  return <article className="product">
    <Link
      to={`/product/${p._id}`}
      state={{ from: location.pathname + location.search }}
    ><img src={imageUrl(p.images?.[0])||'https://placehold.co/600x400?text=Product'} /><h3>{p.name}</h3></Link><p>₹{Number(p.price).toFixed(2)}</p><small>{p.stock>0?`${p.stock} in stock`:'Out of stock'}</small></article>}

function Home() {
  const [items, setItems] = useState([]);
const [cats, setCats] = useState([]);

const [searchParams, setSearchParams] = useSearchParams();

const [q, setQ] = useState(searchParams.get('q') || '');
const [cat, setCat] = useState(searchParams.get('category') || '');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async (searchText = q, categoryId = cat) => {
    try {
      setLoading(true);
      setErr('');

      const response = await api.get('/products', {
  params: {
    q: searchText.trim(),
    category: categoryId,
    limit: 50
  }
});

      setItems(
  (response.data.products || []).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, {
      sensitivity: 'base'
    })
  )
);
    } catch (error) {
      setItems([]);
      setErr(
        error.response?.data?.message ||
        'Could not load products. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/categories')
      .then(response => setCats(response.data))
      .catch(() => setErr('Could not load categories'));

    load(q, cat);
  }, []);

  const handleCategoryChange = (event) => {
  const selectedCategory = event.target.value;

  setCat(selectedCategory);

  setSearchParams({
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(selectedCategory ? { category: selectedCategory } : {})
  });

  load(q, selectedCategory);
};
  const handleSearch = () => {
  setSearchParams({
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(cat ? { category: cat } : {})
  });

  load(q, cat);
};

  return (
    <>
      <section className="hero">
        <span className="eyebrow">EVERYDAY FINDS, BETTER PRICES</span>
        <h1>Find something<br />you’ll love.</h1>
        <p>Explore our curated collection of essentials and favourites.</p>
      </section>

      <div className="toolbar">
        <input
          placeholder="Search products..."
          value={q}
          onChange={event => setQ(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') handleSearch();
          }}
        />

        <select value={cat} onChange={handleCategoryChange}>
          <option value="">All categories</option>
          {cats.map(category => (
            <option key={category._id} value={category._id}>
              {category.name}
            </option>
          ))}
        </select>

        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
            {(cat || q) && (
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setCat('');
            setQ('');
            setSearchParams({});
            load('', '');
          }}
          style={{ marginTop: '15px', marginBottom: '15px' }}
        >
          ← Back to all products
        </button>
      )}

      <Notice message={err} />

      <Notice message={err} />

      <div className="grid">
        {items.map(product => (
          <ProductCard key={product._id} p={product} />
        ))}
      </div>

      {!loading && !err && items.length === 0 && (
        <p className="muted">No products found. Try another search.</p>
      )}
    </>
  );
}

function ProductDetail() {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = () => {
    navigate(location.state?.from || '/', { replace: true });
  };const{id}=useParams(),{user}=useAuth(),[p,setP]=useState(null),[related,setRelated]=useState([]),[msg,setMsg]=useState('');
  useEffect(() => {
  api.get(`/products/${id}`)
    .then(x => {
      console.log('Product images:', x.data.product.images);
      console.log('Number of images:', x.data.product.images?.length);

      setP(x.data.product);
      setRelated(x.data.related);
    })
    .catch(e => setMsg(e.response?.data?.message || 'Unable to load product'));
}, [id]);const add=async()=>{if(!user)return setMsg('Please log in to add items to your cart');try{await api.post('/user/cart',{productId:id,quantity:1});setMsg('Added to cart')}catch(e){setMsg(e.response?.data?.message)}};const wish=async()=>{if(!user)return setMsg('Please log in first');try{await api.post(`/user/wishlist/${id}`);setMsg('Added to wishlist')}catch(e){setMsg(e.response?.data?.message)}};if(!p)return <Notice message={msg||'Loading...'}/>;return <>
  <button
    type="button"
    className="secondary"
    onClick={goBack}
    style={{ marginBottom: '20px' }}
  >
    ← Back
  </button>

  <div className="detail"><div className="detailimg">{p.images?.map((im,i)=><img key={i} src={imageUrl(im)}/>)}</div><div><span className="eyebrow">{p.category?.name}</span><h1>{p.name}</h1><h2>₹{p.price}</h2><p>{p.description}</p><p>{p.stock?`${p.stock} available`:'Out of stock'}</p><button disabled={!p.stock} onClick={add}>Add to cart</button> <button className="secondary" onClick={wish}>♡ Wishlist</button><Notice message={msg}/></div></div><h2>Related products</h2><div className="grid">{related.map(x=><ProductCard key={x._id} p={x}/>)}</div></>}
function AuthPage({register=false}){const{login}=useAuth(),nav=useNavigate(),[form,set]=useState({name:'',email:'',password:''}),[msg,setMsg]=useState('');const submit=async e=>{e.preventDefault();try{const result=await login(register?'register':'login',form);nav(result.user.role==='admin'?'/admin':'/')}catch(x){setMsg(x.response?.data?.message||'Request failed')}};return <section className="formbox"><h1>{register?'Create account':'Welcome back'}</h1><form onSubmit={submit}>{register&&<input required placeholder="Full name" value={form.name} onChange={e=>set({...form,name:e.target.value})}/>}<input required type="email" placeholder="Email" value={form.email} onChange={e=>set({...form,email:e.target.value})}/><input required minLength="8" type="password" placeholder="Password (8+ characters)" value={form.password} onChange={e=>set({...form,password:e.target.value})}/><button>{register?'Register':'Login'}</button></form><Notice message={msg}/>{!register&&<Link to="/forgot">Forgot password?</Link>}</section>}
function Forgot(){const[email,setEmail]=useState(''),[otp,setOtp]=useState(''),[password,setPassword]=useState(''),[sent,setSent]=useState(false),[msg,setMsg]=useState('');return <section className="formbox"><h1>Reset password</h1>{!sent?<form onSubmit={async e=>{e.preventDefault();try{const x=await api.post('/auth/forgot-password',{email});setMsg(x.data.message);setSent(true)}catch(x){setMsg(x.response?.data?.message)}}}><input type="email" required placeholder="Account email" value={email} onChange={e=>setEmail(e.target.value)}/><button>Send OTP</button></form>:<form onSubmit={async e=>{e.preventDefault();try{const x=await api.post('/auth/reset-password',{email,otp,password});setMsg(x.data.message)}catch(x){setMsg(x.response?.data?.message)}}}><input required placeholder="6-digit OTP" value={otp} onChange={e=>setOtp(e.target.value)}/><input required minLength="8" type="password" placeholder="New password" value={password} onChange={e=>setPassword(e.target.value)}/><button>Reset password</button></form>}<Notice message={msg}/></section>}
function CartPage(){const[c,setC]=useState({items:[]}),[msg,setMsg]=useState('');const load=()=>api.get('/user/cart').then(x=>setC(x.data));useEffect(()=>{load()},[]);const update=async(id,quantity)=>{try{await api.patch(`/user/cart/${id}`,{quantity});load()}catch(e){setMsg(e.response?.data?.message)}};const remove=async id=>{await api.delete(`/user/cart/${id}`);load()};const total=c.items.reduce((s,i)=>s+(i.product?.price||0)*i.quantity,0);return <><h1>Your cart</h1><Notice message={msg}/>{c.items.map(i=><div className="cartrow" key={i.product?._id}><img src={imageUrl(i.product?.images?.[0])}/><div className="grow"><b>{i.product?.name}</b><p>₹{i.product?.price}</p><button className="secondary" onClick={()=>update(i.product._id,i.quantity-1)} disabled={i.quantity<=1}>−</button> {i.quantity} <button className="secondary" onClick={()=>update(i.product._id,i.quantity+1)}>+</button> <button className="linkbtn" onClick={()=>remove(i.product._id)}>Remove</button></div><b>₹{(i.product?.price*i.quantity).toFixed(2)}</b></div>)}<div className="checkoutline"><h2>Subtotal: ₹{total.toFixed(2)}</h2><Link className="button" to="/checkout">Checkout</Link></div></>}



function Checkout() {
  const nav = useNavigate();
  const [couponDiscount, setCouponDiscount] = useState(0);
const [couponMsg, setCouponMsg] = useState('');
  const [cart, setCart] = useState({ items: [] });

useEffect(() => {
  api.get('/user/cart')
    .then(x => setCart(x.data))
    .catch(e => setMsg(
      e.response?.data?.message || 'Could not load cart'
    ));
}, []);

const subtotal = (cart.items || []).reduce(
  (sum, item) =>
    sum + (item.product?.price || 0) * item.quantity,
  0
);

  const [addresses, setA] = useState([]);
  const [address, setAddress] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India'
  });
  const [method, setMethod] = useState('COD');
  const [coupon, setCoupon] = useState('');
  const [msg, setMsg] = useState('');

  const normalize = value =>
    String(value || '').trim().toLowerCase();

  // Compare the main visible address fields.
  const sameAddress = (a, b) =>
    normalize(a.fullName) === normalize(b.fullName) &&
    normalize(a.line1) === normalize(b.line1) &&
    normalize(a.city) === normalize(b.city);

  useEffect(() => {
    api.get('/user/addresses')
      .then(x => {
        const data = Array.isArray(x.data)
          ? x.data
          : Array.isArray(x.data?.addresses)
            ? x.data.addresses
            : [];

        // Remove duplicate-looking addresses from the list.
        const unique = data.filter((item, index, list) =>
          list.findIndex(other => sameAddress(other, item)) === index
        );

        setA(unique);
        setAddress(unique.length > 0 ? unique[0]._id : 'new');
      })
      .catch(e => {
        setMsg(e.response?.data?.message || 'Could not load addresses');
        setAddress('new');
      });
  }, []);
  const applyCoupon = async () => {
  try {
    const response = await api.post('/orders/coupon/validate', {
      couponCode: coupon,
      subtotal
    });

    setCouponDiscount(response.data.discount);
    setCouponMsg('Coupon applied successfully');
  } catch (e) {
    setCouponDiscount(0);
    setCouponMsg(
      e.response?.data?.message || 'Invalid coupon'
    );
  }
};

const removeCoupon = () => {
  setCouponDiscount(0);
  setCoupon('');
  setCouponMsg('Coupon removed successfully');
};

  const pay = async e => {
    e.preventDefault();
    setMsg('');

    try {
      let addr;

      if (address && address !== 'new') {
        addr = addresses.find(a => a._id === address);
      }

      if (!addr) {
        const existing = addresses.find(a => sameAddress(a, form));

        if (existing) {
          addr = existing;
        } else {
          const saved = await api.post('/user/addresses', form);

if (Array.isArray(saved.data)) {
  addr =
    saved.data.find(a => sameAddress(a, form)) ||
    saved.data[saved.data.length - 1];
} else {
  addr =
    saved.data?.address ||
    saved.data?.data ||
    saved.data;
}

if (!addr || Array.isArray(addr) || typeof addr !== 'object') {
  addr = form;
}
          setA(previous => {
            const duplicate = previous.some(a => sameAddress(a, addr));
            return duplicate ? previous : [...previous, addr];
          });
        }
      }

      const x = await api.post('/orders', {
        address: addr,
        paymentMethod: method,
        couponCode: coupon || undefined
      });

      if (method === 'RAZORPAY') {
        const rp = x.data.razorpayOrder;
        const script = document.createElement('script');

        script.src = 'https://checkout.razorpay.com/v1/checkout.js';

        script.onload = () => {
          const checkout = new window.Razorpay({
            key: x.data.keyId,
            amount: rp.amount,
            currency: rp.currency,
            name: 'ShopNexus',
            order_id: rp.id,
            handler: async response => {
              await api.post('/orders/verify-payment', {
                orderId: x.data.order._id,
                ...response
              });
              nav('/orders');
            },
            modal: {
              ondismiss: () => setMsg(
                'Payment window closed. If you were charged, contact support with your order ID.'
              )
            }
          });

          checkout.on('payment.failed', async () => {
            await api.post('/orders/payment-failed', {
              orderId: x.data.order._id
            });
            setMsg('Payment failed. You can try placing the order again.');
          });

          checkout.open();
        };

        script.onerror = () =>
          setMsg('Could not load Razorpay. Please try again.');

        document.body.appendChild(script);
      } else {
        nav('/orders');
      }
    } catch (e) {
      setMsg(e.response?.data?.message || 'Checkout failed');
    }
  };

  const useNewAddress = address === 'new';

  return (
    <section className="formbox wide">
      <h1>Checkout</h1>
      <div className="order-summary">
  <h3>Order summary</h3>

  {(cart.items || []).map(item => (
    <div className="checkoutline" key={item.product?._id}>
      <span>
        {item.product?.name} × {item.quantity}
      </span>
      <b>
        ₹{(
          (item.product?.price || 0) * item.quantity
        ).toFixed(2)}
      </b>
    </div>
  ))}

  <div className="checkoutline">
    <strong>Subtotal</strong>
    <strong>₹{subtotal.toFixed(2)}</strong>
  </div>
  <div className="checkoutline">
  <strong>Discount</strong>
  <strong>-₹{couponDiscount.toFixed(2)}</strong>
</div>

<div className="checkoutline">
  <strong>Grand total</strong>
  <strong>
    ₹{Math.max(0, subtotal - couponDiscount).toFixed(2)}
  </strong>
</div>
</div>

      <form onSubmit={pay}>
        <h3>Delivery address</h3>

        {addresses.map(a => (
          <label className="radio" key={a._id}>
            <input
              type="radio"
              name="deliveryAddress"
              checked={address === a._id}
              onChange={() => setAddress(a._id)}
            />
            {a.fullName}, {a.line1}, {a.city}
          </label>
        ))}

        <label className="radio">
          <input
            type="radio"
            name="deliveryAddress"
            checked={useNewAddress}
            onChange={() => setAddress('new')}
          />
          Use a new address
        </label>

        {useNewAddress && (
          <>
            <p>Enter your new address:</p>

            <div className="formgrid">
              {Object.keys(form).map(k => (
                <input
                  key={k}
                  required={!['line2', 'country'].includes(k)}
                  placeholder={k.replace(/([A-Z])/g, ' $1')}
                  value={form[k]}
                  onChange={e => setForm({
                    ...form,
                    [k]: e.target.value
                  })}
                />
              ))}
            </div>
          </>
        )}

        <h3>Payment method</h3>

        <label className="radio">
          <input
            type="radio"
            checked={method === 'COD'}
            onChange={() => setMethod('COD')}
          />
          Cash on Delivery
        </label>

        <label className="radio">
          <input
            type="radio"
            checked={method === 'RAZORPAY'}
            onChange={() => setMethod('RAZORPAY')}
          />
          Razorpay
        </label>

        
<div className="coupon-box">
  <input
    placeholder="Coupon code"
    value={coupon}
    onChange={e => {
      setCoupon(e.target.value);
      setCouponDiscount(0);
      setCouponMsg('');
    }}
  />

  <button type="button" onClick={applyCoupon}>
    Apply
  </button>
  {couponDiscount > 0 && (
  <button
    type="button"
    className="secondary"
    onClick={removeCoupon}
  >
    Remove Coupon
  </button>
)}

  <Notice message={couponMsg} />
</div>


        <button type="submit">Place order</button>
      </form>

      <Notice message={msg} />
    </section>
  );
  
}                                 


function Orders(){const[orders,set]=useState([]);useEffect(()=>{api.get('/orders/mine').then(x=>set(x.data))},[]);const cancel=async id=>{await api.post(`/orders/${id}/cancel`);set((await api.get('/orders/mine')).data)};return <><h1>Your orders</h1>{orders.map(o=><article className="panel" key={o._id}><div className="spread"><b>Order #{o._id.slice(-8)}</b><span className="pill">{o.status}</span></div><p>{new Date(o.createdAt).toLocaleString()} · {o.paymentMethod} · {o.paymentStatus}</p>{o.items.map((i,n)=><p key={n}>{i.name} × {i.quantity}</p>)}<b>Total ₹{o.total?.toFixed(2)}</b> <a href={`${import.meta.env.VITE_API_URL||'http://localhost:5000/api'}/orders/${o._id}/invoice`} onClick={e=>{e.preventDefault();api.get(`/orders/${o._id}/invoice`,{responseType:'blob'}).then(x=>{const u=URL.createObjectURL(x.data),a=document.createElement('a');a.href=u;a.download=`invoice-${o._id}.pdf`;a.click();URL.revokeObjectURL(u)})}}>Download invoice</a>{['Pending','Processing'].includes(o.status)&&o.paymentStatus!=='Paid'&&<button className="secondary" onClick={()=>cancel(o._id)}>Cancel order</button>}</article>)}</>}
function Profile(){const{user,setUser}=useAuth(),[msg,setMsg]=useState('');const[form,set]=useState({name:user?.name||'',phone:user?.phone||''});return <section className="formbox"><h1>My profile</h1><form onSubmit={async e=>{e.preventDefault();const x=await api.put('/auth/profile',form);setUser(x.data.user);setMsg('Profile updated')}}><input value={form.name} onChange={e=>set({...form,name:e.target.value})} required/><input placeholder="Phone" value={form.phone} onChange={e=>set({...form,phone:e.target.value})}/><button>Save profile</button></form><Notice message={msg}/><h3>Saved addresses</h3><AddressManager/></section>}

function AddressManager() {
  const [list, setList] = useState([]);
  const [f, sf] = useState({
    fullName: '',
    phone: '',
    line1: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India'
  });
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState('');

  const emptyForm = {
    fullName: '',
    phone: '',
    line1: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India'
  };

  const load = () => api.get("/user/addresses").then((x) => setList(x.data));

  useEffect(() => {
    load();
  }, []);

  const editAddress = a => {
    setEditingId(a._id);
    sf({
      fullName: a.fullName || '',
      phone: a.phone || '',
      line1: a.line1 || '',
      city: a.city || '',
      state: a.state || '',
      postalCode: a.postalCode || '',
      country: a.country || 'India'
    });
    setMsg('');
  };

  const saveAddress = async e => {
    e.preventDefault();

    try {
      await api.put(`/user/addresses/${editingId}`, f);
      setEditingId(null);
      sf(emptyForm);
      setMsg('Address updated successfully');
      load();
    } catch (e) {
      setMsg(e.response?.data?.message || 'Could not update address');
    }
  };

  const addAddress = async e => {
    e.preventDefault();

    try {
      await api.post('/user/addresses', f);
      sf(emptyForm);
      setMsg('Address added successfully');
      load();
    } catch (e) {
      setMsg(e.response?.data?.message || 'Could not add address');
    }
  };

  const deleteAddress = async id => {
    if (!window.confirm('Delete this address?')) return;

    try {
      await api.delete(`/user/addresses/${id}`);
      load();
      setMsg('Address deleted');
    } catch (e) {
      setMsg(e.response?.data?.message || 'Could not delete address');
    }
  };

  return (
    <>
      <form onSubmit={editingId ? saveAddress : addAddress}>
        {Object.keys(f).map(k => (
          <input
            key={k}
            required
            placeholder={k}
            value={f[k]}
            onChange={e => sf({ ...f, [k]: e.target.value })}
          />
        ))}

        <button type="submit">
          {editingId ? 'Save Changes' : 'Add address'}
        </button>

        {editingId && (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setEditingId(null);
              sf(emptyForm);
            }}
          >
            Cancel
          </button>
        )}
      </form>

      <Notice message={msg} />

      {list.map(a => (
        <p key={a._id}>
          {a.fullName} · {a.line1}, {a.city}{' '}
          <button
            type="button"
            className="secondary"
            onClick={() => editAddress(a)}
          >
            Edit
          </button>
          <button
            type="button"
            className="linkbtn"
            onClick={() => deleteAddress(a._id)}
          >
            Delete
          </button>
        </p>
      ))}
    </>
  );
}

function Wishlist(){const[list,set]=useState([]);const load=()=>api.get('/user/wishlist').then(x=>set(x.data));useEffect(()=>{load()},[]);return <><h1>Wishlist</h1><div className="grid">{list.map(p=><div key={p._id}><ProductCard p={p}/><button className="secondary" onClick={async()=>{await api.delete(`/user/wishlist/${p._id}`);load()}}>Remove</button></div>)}</div></>}
function Admin(){const[tab,setTab]=useState('dashboard'),[data,setData]=useState(null),[msg,setMsg]=useState('');const load=()=>{const path={dashboard:'/admin/dashboard',products:'/admin/products',categories:'/admin/categories',orders:'/orders/admin/all',users:'/admin/users',coupons:'/admin/coupons',reports:'/admin/reports'}[tab];api.get(path).then(x=>setData(x.data)).catch(e=>setMsg(e.response?.data?.message))};useEffect(()=>{load()},[tab]);return <><h1>Admin panel</h1><div className="tabs">{['dashboard','products','categories','orders','users','coupons','reports'].map(t=><button className={tab===t?'':'secondary'} key={t} onClick={()=>setTab(t)}>{t}</button>)}</div><Notice message={msg}/>
{tab === 'dashboard' && data && (
  <div className="stats">
    {Object.entries(data).map(([k, v]) => (
      <div className="stat" key={k}>
        <small>
  {{
    totalOrders: 'Total Orders',
    totalSales: 'Total Sales',
    totalUsers: 'Total Users',
    totalProducts: 'Total Products',
activeProducts: 'Active Products'
  }[k] || k}
</small>

<h2>
  {k === 'totalSales'
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2
      }).format(Number(v) || 0)
    : typeof v === 'number'
      ? v.toLocaleString('en-IN')
      : String(v ?? 0)}
</h2>
      </div>
    ))}
  </div>
)}
{tab==='products'&&<AdminProducts data={data} refresh={load}/>}{tab==='categories'&&<AdminCategories data={data} refresh={load}/>}{tab==='orders'&&<AdminOrders data={data} refresh={load}/>}{tab==='users'&&<AdminUsers data={data} refresh={load}/>}{tab==='coupons'&&<AdminCoupons data={data} refresh={load}/>}{tab==='reports'&&<AdminReports data={data} refresh={load}/>}</>}

function AdminCategories({ data, refresh }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const categories = Array.isArray(data)
    ? data
    : Array.isArray(data?.categories)
      ? data.categories
      : [];

  const addCategory = async (e) => {
    e.preventDefault();

    try {
      await api.post('/admin/categories', {
        name,
        description
      });

      setName('');
      setDescription('');
      refresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not add category');
    }
  };

  const editCategory = async (category) => {
    const newName = prompt('Category name', category.name);
    if (newName === null) return;

    const newDescription = prompt(
      'Description',
      category.description || ''
    );
    if (newDescription === null) return;

    try {
      await api.put(`/admin/categories/${category._id}`, {
        name: newName,
        description: newDescription
      });

      refresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update category');
    }
  };

  const deactivateCategory = async (id) => {
    if (!window.confirm('Deactivate this category?')) return;

    try {
      await api.delete(`/admin/categories/${id}`);
      refresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not deactivate category');
    }
  };
  const reactivateCategory = async (category) => {
  try {
    await api.put(`/admin/categories/${category._id}`, {
      name: category.name,
      description: category.description || '',
      isActive: true
    });

    refresh();
  } catch (err) {
    alert(err.response?.data?.message || 'Could not reactivate category');
  }
};

  return (
    <>
      <form className="inlineform" onSubmit={addCategory}>
        <input
          required
          placeholder="Category name"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <input
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />

        <button type="submit">Add category</button>
      </form>

      {categories.map(category => (
        <div className="spread panel" key={category._id}>
          <span>
            {category.name} · {category.isActive ? 'Active' : 'Inactive'}
          </span>

          <span>
  <button
    type="button"
    className="secondary"
    onClick={() => editCategory(category)}
  >
    Edit
  </button>

  {category.isActive ? (
    <button
      type="button"
      className="secondary"
      onClick={() => deactivateCategory(category._id)}
    >
      Deactivate
    </button>
  ) : (
    <button
      type="button"
      onClick={() => reactivateCategory(category)}
    >
      Reactivate
    </button>
  )}
</span>
        </div>
      ))}
    </>
  );
}

function AdminProducts({ data, refresh }) {
  const [f, set] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: ''
  });

  const [cats, setCats] = useState([]);
  const [files, setFiles] = useState([]);
  const [editingId, setEditingId] = useState(null);

const [editForm, setEditForm] = useState({
  name: '',
  description: '',
  price: '',
  stock: '',
  category: ''
});

  const products = Array.isArray(data)
    ? data
    : Array.isArray(data?.products)
      ? data.products
      : Array.isArray(data?.data)
        ? data.data
        : [];

  useEffect(() => {
  api.get('/admin/categories')
    .then(x => {
      const categories = Array.isArray(x.data) ? x.data : [];
      setCats(categories.filter(c => c.isActive === true));
    })
    .catch(() => setCats([]));
}, []);

  const submit = async e => {
    e.preventDefault();

    if (files.length < 1 || files.length > 3) {
      alert('Select between 1 and 3 images');
      return;
    }

    try {
      const d = new FormData();

      Object.entries(f).forEach(([k, v]) => d.append(k, v));
      [...files].forEach(x => d.append('images', x));

      await api.post('/admin/products', d);

      set({
        name: '',
        description: '',
        price: '',
        stock: '',
        category: ''
      });

      setFiles([]);
      refresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not add product');
    }
  };

  const editProduct = p => {
  setEditingId(p._id);

  setEditForm({
    name: p.name || '',
    description: p.description || '',
    price: p.price ?? '',
    stock: p.stock ?? '',
    category: p.category?._id || p.category || ''
  });
};

const saveEdit = async e => {
  e.preventDefault();

  try {
    await api.put(`/admin/products/${editingId}`, {
      ...editForm,
      price: Number(editForm.price),
      stock: Number(editForm.stock)
    });

    setEditingId(null);

    setEditForm({
      name: '',
      description: '',
      price: '',
      stock: '',
      category: ''
    });

    refresh();
  } catch (err) {
    alert(err.response?.data?.message || 'Could not update product');
  }
};

  const deactivateProduct = async id => {
    if (!window.confirm('Deactivate this product?')) return;

    try {
      await api.delete(`/admin/products/${id}`);
      refresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not deactivate product');
    }
  };
    const reactivateProduct = async id => {
    try {
      await api.patch(`/admin/products/${id}/activate`);
      refresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not reactivate product');
    }
  };

  return (
    <>
      <form className="inlineform" onSubmit={submit}>
        <input
          required
          placeholder="Product name"
          value={f.name}
          onChange={e => set({ ...f, name: e.target.value })}
        />

        <input
          required
          placeholder="Description"
          value={f.description}
          onChange={e => set({ ...f, description: e.target.value })}
        />

        <input
          required
          type="number"
          min="0"
          placeholder="Price"
          value={f.price}
          onChange={e => set({ ...f, price: e.target.value })}
        />

        <input
          required
          type="number"
          min="0"
          placeholder="Stock"
          value={f.stock}
          onChange={e => set({ ...f, stock: e.target.value })}
        />

        <select
          required
          value={f.category}
          onChange={e => set({ ...f, category: e.target.value })}
        >
          <option value="">Category</option>
          {cats.map(c => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          required
          onChange={e => setFiles(e.target.files)}
        />

        <small>Upload 1–3 images (max 5 MB each)</small>
        <button type="submit">Add product</button>
      </form>
{editingId && (
  <form className="inlineform" onSubmit={saveEdit}>
    <h2>Edit Product</h2>

    <input
      required
      placeholder="Product name"
      value={editForm.name}
      onChange={e =>
        setEditForm({ ...editForm, name: e.target.value })
      }
    />

    <input
      required
      placeholder="Description"
      value={editForm.description}
      onChange={e =>
        setEditForm({ ...editForm, description: e.target.value })
      }
    />

    <input
      required
      type="number"
      min="0"
      step="0.01"
      placeholder="Price"
      value={editForm.price}
      onChange={e =>
        setEditForm({ ...editForm, price: e.target.value })
      }
    />

    <input
      required
      type="number"
      min="0"
      step="1"
      placeholder="Stock"
      value={editForm.stock}
      onChange={e =>
        setEditForm({ ...editForm, stock: e.target.value })
      }
    />

    <select
      required
      value={editForm.category}
      onChange={e =>
        setEditForm({ ...editForm, category: e.target.value })
      }
    >
      <option value="">Select category</option>
      {cats.map(c => (
        <option key={c._id} value={c._id}>
          {c.name}
        </option>
      ))}
    </select>

    <button type="submit">Save Changes</button>

    <button
      type="button"
      className="secondary"
      onClick={() => setEditingId(null)}
    >
      Cancel
    </button>
  </form>
)}
      {products.map(p => (
  <div className="spread panel" key={p._id}>
    <span>
      {p.name} · ₹{p.price} · Stock {p.stock} ·
      {p.isActive ? ' Active' : ' Inactive'}
    </span>

    <span>
      <button
        type="button"
        className="secondary"
        onClick={() => editProduct(p)}
      >
        Edit
      </button>

      {p.isActive ? (
        <button
          type="button"
          className="secondary"
          onClick={() => deactivateProduct(p._id)}
        >
          Deactivate
        </button>
      ) : (
        <button
          type="button"
          onClick={() => reactivateProduct(p._id)}
        >
          Reactivate
        </button>
      )}
    </span>
  </div>
))}
    </>
  );
}

function AdminOrders({ data, refresh }) {
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingId, setLoadingId] = useState('');

  const orders = Array.isArray(data)
    ? data
    : Array.isArray(data?.orders)
      ? data.orders
      : Array.isArray(data?.data)
        ? data.data
        : [];

  const updateStatus = async (id, status) => {
    try {
      setError('');
      await api.patch(`/orders/admin/${id}/status`, { status });
      if (selectedOrder?._id === id) {
        const updated = await api.get(`/orders/admin/${id}`);
        setSelectedOrder(updated.data);
      }
      refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update order status');
    }
  };

  const viewDetails = async id => {
    try {
      setError('');
      setLoadingId(id);
      const response = await api.get(`/orders/admin/${id}`);
      setSelectedOrder(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load order details');
    } finally {
      setLoadingId('');
    }
  };

  return (
    <>
      {error && <Notice message={error} />}
      {orders.length === 0 ? (
        <p className="muted">No orders found.</p>
      ) : (
        orders.map(order => (
          <div className="panel spread" key={order._id}>
            <div>
              <b>{order.user?.name || 'Customer'} · ₹{Number(order.total || 0).toFixed(2)}</b>
              <p>{order._id} · {order.status} · {order.paymentStatus}</p>
              <small>Payment method: {order.paymentMethod}</small>
              <div>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => viewDetails(order._id)}
                  disabled={loadingId === order._id}
                >
                  {loadingId === order._id ? 'Loading…' : 'View details'}
                </button>
              </div>
            </div>
            <select
              aria-label={`Update order ${order._id} status`}
              value={order.status}
              onChange={e => updateStatus(order._id, e.target.value)}
              disabled={order.status === 'Cancelled'}
            >
              {['Pending', 'Processing', 'Shipped', 'Delivered'].map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        ))
      )}

      {selectedOrder && (
        <section className="panel">
          <div className="spread">
            <h2>Order details — #{selectedOrder._id.slice(-8)}</h2>
            <button type="button" className="secondary" onClick={() => setSelectedOrder(null)}>
              Close
            </button>
          </div>
          <p><b>Customer:</b> {selectedOrder.user?.name || 'Customer'} ({selectedOrder.user?.email || 'No email'})</p>
          <p><b>Order date:</b> {new Date(selectedOrder.createdAt).toLocaleString()}</p>
          <p><b>Status:</b> {selectedOrder.status} · <b>Payment:</b> {selectedOrder.paymentMethod} / {selectedOrder.paymentStatus}</p>
          <h3>Items</h3>
          {(selectedOrder.items || []).map((item, index) => (
            <div className="spread" key={`${item.product || item.name}-${index}`}>
              <span>{item.name} × {item.quantity}</span>
              <b>₹{(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}</b>
            </div>
          ))}
          <hr />
          <p><b>Subtotal:</b> ₹{Number(selectedOrder.subtotal || 0).toFixed(2)}</p>
          <p><b>Discount:</b> -₹{Number(selectedOrder.discount || 0).toFixed(2)}</p>
          <h3>Total: ₹{Number(selectedOrder.total || 0).toFixed(2)}</h3>
          <h3>Delivery address</h3>
          <p>
            {selectedOrder.address?.fullName}<br />
            {selectedOrder.address?.phone}<br />
            {selectedOrder.address?.line1}
            {selectedOrder.address?.line2 ? `, ${selectedOrder.address.line2}` : ''}<br />
            {selectedOrder.address?.city}, {selectedOrder.address?.state} {selectedOrder.address?.postalCode}<br />
            {selectedOrder.address?.country}
          </p>
        </section>
      )}
    </>
  );
}

function AdminUsers({ data, refresh }) {
  const [error, setError] = useState('');

  const users = Array.isArray(data)
    ? data
    : Array.isArray(data?.users)
      ? data.users
      : Array.isArray(data?.data)
        ? data.data
        : [];

  const toggleBlock = async (user) => {
    const action = user.isBlocked ? 'unblock' : 'block';

    if (!window.confirm(`Are you sure you want to ${action} ${user.name}?`)) {
      return;
    }

    try {
      setError('');

      await api.patch(`/admin/users/${user._id}/block`, {
        blocked: !user.isBlocked
      });

      refresh();
    } catch (err) {
      setError(
        err.response?.data?.message || `Could not ${action} user`
      );
    }
  };

  return (
    <>
      {error && <Notice message={error} />}

      {users.length === 0 ? (
        <p className="muted">No users found.</p>
      ) : (
        users.map(user => (
          <div className="panel spread" key={user._id}>
            <div>
              <b>{user.name}</b>
              <p>{user.email}</p>
              <small>
                Status: {user.isBlocked ? 'Blocked' : 'Active'}
              </small>
            </div>

            <button
              className="secondary"
              onClick={() => toggleBlock(user)}
              disabled={user.role === 'admin'}
            >
              {user.isBlocked ? 'Unblock' : 'Block'}
            </button>
          </div>
        ))
      )}
    </>
  );
}


function AdminCoupons({ data, refresh }) {
  const [f, set] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    minOrderAmount: 0,
    maxDiscount: '',
    usageLimit: ''
  });

  const [msg, setMsg] = useState('');

  // Safely extract coupons from different API response formats.
  const coupons = Array.isArray(data)
    ? data
    : Array.isArray(data?.coupons)
      ? data.coupons
      : Array.isArray(data?.data)
        ? data.data
        : [];

  const createCoupon = async e => {
    e.preventDefault();
    setMsg('');

    try {
      await api.post('/admin/coupons', f);
      set({
        code: '',
        discountType: 'percentage',
        discountValue: '',
        minOrderAmount: 0,
        maxDiscount: '',
        usageLimit: ''
      });
      await refresh();
      setMsg('Coupon created successfully.');
    } catch (error) {
      setMsg(error.response?.data?.message || 'Could not create coupon.');
    }
  };

  const editCoupon = async c => {
    const discountValue = prompt('Discount value', c.discountValue);
    if (discountValue === null) return;

    const minOrderAmount = prompt(
      'Minimum order amount',
      c.minOrderAmount
    );
    if (minOrderAmount === null) return;

    if (
      discountValue.trim() === '' ||
      minOrderAmount.trim() === '' ||
      Number(discountValue) < 0 ||
      Number(minOrderAmount) < 0
    ) {
      setMsg('Please enter valid discount and minimum order values.');
      return;
    }

    try {
      await api.put(`/admin/coupons/${c._id}`, {
        discountValue: Number(discountValue),
        minOrderAmount: Number(minOrderAmount)
      });

      await refresh();
      setMsg('Coupon updated successfully.');
    } catch (error) {
      setMsg(error.response?.data?.message || 'Could not update coupon.');
    }
  };

  const deactivateCoupon = async id => {
    if (!window.confirm('Are you sure you want to deactivate this coupon?')) {
      return;
    }

    try {
      await api.patch(`/admin/coupons/${id}/deactivate`);
      await refresh();
      setMsg('Coupon deactivated successfully.');
    } catch (error) {
      setMsg(error.response?.data?.message || 'Could not deactivate coupon.');
    }
  };

  return (
    <>
      <form className="inlineform" onSubmit={createCoupon}>
        <input
          required
          placeholder="Code"
          value={f.code}
          onChange={e => set({ ...f, code: e.target.value.toUpperCase() })}
        />

        <select
          value={f.discountType}
          onChange={e => set({ ...f, discountType: e.target.value })}
        >
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed ₹</option>
        </select>

        <input
          required
          type="number"
          min="0"
          placeholder="Discount"
          value={f.discountValue}
          onChange={e => set({ ...f, discountValue: e.target.value })}
        />

        <input
          type="number"
          min="0"
          placeholder="Min order"
          value={f.minOrderAmount}
          onChange={e => set({ ...f, minOrderAmount: e.target.value })}
        />

        <button type="submit">Create coupon</button>
      </form>

      {msg && <p>{msg}</p>}

      {coupons.length === 0 ? (
        <p>No coupons found. Create your first coupon above.</p>
      ) : (
        coupons.map(c => (
          <div className="panel spread" key={c._id}>
            <div>
              <b>{c.code}</b>
              {' · '}
              {c.discountValue}
              {' '}
              {c.discountType}
              {' · '}
              {c.isActive ? 'Active' : 'Inactive'}
            </div>

            <span>
              <button
                className="secondary"
                onClick={() => editCoupon(c)}
                disabled={!c.isActive}
              >
                Edit
              </button>

              {' '}

              <button
                className="secondary"
                onClick={() => deactivateCoupon(c._id)}
                disabled={!c.isActive}
              >
                Deactivate
              </button>
            </span>
          </div>
        ))
      )}
    </>
  );
}

function AdminReports({data}){const[from,setFrom]=useState(''),[to,setTo]=useState(''),[report,setReport]=useState(data);useEffect(()=>setReport(data),[data]);return <div className="panel"><h3>Sales report</h3><form className="inlineform" onSubmit={async e=>{e.preventDefault();const x=await api.get('/admin/reports',{params:{from,to}});setReport(x.data)}}><input type="date" value={from} onChange={e=>setFrom(e.target.value)}/><input type="date" value={to} onChange={e=>setTo(e.target.value)}/><button>Apply date range</button></form><p>Orders: {report?.totals?.orders||0} · Sales: ₹{report?.totals?.sales||0}</p>{report?.rows?.map(r=><p key={r._id}>{r._id}: {r.orders} orders · ₹{r.sales}</p>)}</div>}
function Guard({admin=false,children}){const{user}=useAuth();if(!user)return <Navigate to="/login"/>;if(admin&&user.role!=='admin')return <Navigate to="/"/>;return children}
export default function App(){return <AuthProvider><Layout><Routes><Route path="/" element={<Home/>}/><Route path="/product/:id" element={<ProductDetail/>}/><Route path="/login" element={<AuthPage/>}/><Route path="/register" element={<AuthPage register/>}/><Route path="/forgot" element={<Forgot/>}/><Route path="/cart" element={<Guard><CartPage/></Guard>}/><Route path="/checkout" element={<Guard><Checkout/></Guard>}/><Route path="/orders" element={<Guard><Orders/></Guard>}/><Route path="/wishlist" element={<Guard><Wishlist/></Guard>}/><Route path="/profile" element={<Guard><Profile/></Guard>}/><Route path="/admin" element={<Guard admin><Admin/></Guard>}/><Route path="*" element={<h1>Page not found</h1>}/></Routes></Layout></AuthProvider>}




