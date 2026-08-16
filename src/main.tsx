import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './cloud-status.css';

type Measurements = { chest: number; waist: number; hip: number; shoulder: number; sleeve: number };
type Variant = Measurements & { id: number; name: string; sku: string; size: string; colour: string; stock: number };

const variants: Variant[] = [
  { id: 1, name: 'Everyday Oxford', sku: 'OX-BLU-M', size: 'M', colour: 'Harbour blue', stock: 7, chest: 108, waist: 104, hip: 106, shoulder: 45, sleeve: 63 },
  { id: 2, name: 'Everyday Oxford', sku: 'OX-BLU-L', size: 'L', colour: 'Harbour blue', stock: 0, chest: 114, waist: 110, hip: 112, shoulder: 47, sleeve: 64 },
  { id: 3, name: 'Soft Twill Shirt', sku: 'TW-SND-M', size: 'M', colour: 'Warm sand', stock: 3, chest: 111, waist: 107, hip: 110, shoulder: 46, sleeve: 62 },
];

const initialBody: Measurements = { chest: 99, waist: 86, hip: 100, shoulder: 44, sleeve: 61 };
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

function scoreFit(body: Measurements, garment: Variant) {
  const chestEase = garment.chest - body.chest;
  const waistEase = garment.waist - body.waist;
  if (garment.stock <= 0) return { label: 'Unavailable', tone: 'muted', score: 0, note: 'This exact size is currently out of stock.' };
  if (chestEase >= 8 && chestEase <= 13 && waistEase >= 10 && waistEase <= 23) {
    return { label: 'Best fit', tone: 'good', score: 94, note: `${chestEase} cm chest ease gives you a balanced regular fit.` };
  }
  if (chestEase >= 5 && chestEase <= 16) return { label: 'Close match', tone: 'warn', score: 81, note: `${chestEase} cm chest ease; fit may feel slightly closer or looser.` };
  return { label: 'Not recommended', tone: 'bad', score: 55, note: 'The garment ease falls outside your selected fit range.' };
}

function Mark({ children }: { children: React.ReactNode }) { return <span className="mark">{children}</span>; }

function App() {
  const [view, setView] = useState<'recommendations' | 'profile' | 'seller'>('recommendations');
  const [body, setBody] = useState(initialBody);
  const [draft, setDraft] = useState(initialBody);
  const [notice, setNotice] = useState('');
  const [inventory, setInventory] = useState(variants);
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const recommendations = useMemo(() => inventory.map(v => ({ ...v, fit: scoreFit(body, v) })).sort((a, b) => b.fit.score - a.fit.score), [body, inventory]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/health`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('API unavailable');
        setApiStatus('connected');
      })
      .catch(error => {
        if (error.name !== 'AbortError') setApiStatus('offline');
      });
    return () => controller.abort();
  }, []);

  function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setBody(draft); setNotice('Profile updated — recommendations recalculated.');
    window.setTimeout(() => setNotice(''), 3000);
  }

  function adjustStock(id: number, delta: number) {
    setInventory(items => items.map(item => item.id === id ? { ...item, stock: Math.max(0, item.stock + delta) } : item));
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#"><span className="brand-symbol">Z</span><span>Zimutail<small>Fit workspace</small></span></a>
      <nav aria-label="Main navigation">
        <button className={view === 'recommendations' ? 'active' : ''} onClick={() => setView('recommendations')}><span>✦</span> Recommendations</button>
        <button className={view === 'profile' ? 'active' : ''} onClick={() => setView('profile')}><span>◎</span> My measurements</button>
        <button className={view === 'seller' ? 'active' : ''} onClick={() => setView('seller')}><span>▦</span> Seller inventory</button>
      </nav>
      <div className="privacy-card"><span>⌾</span><strong>Your measurements stay yours.</strong><p>Review, update or delete them any time.</p></div>
      <div className="user"><div className="avatar">AK</div><div><strong>Arun Kumar</strong><small>Personal profile</small></div><button aria-label="Account menu">•••</button></div>
    </aside>

    <main>
      <header><div><p className="eyebrow">FIRST RELEASE · LIVE PROTOTYPE</p><h1>{view === 'recommendations' ? 'Your fit shortlist' : view === 'profile' ? 'Body measurements' : 'Seller inventory'}</h1></div><div className="header-tools"><div className={`api-pill ${apiStatus}`}><span className="pulse"/> {apiStatus === 'connected' ? 'Cloud API connected' : apiStatus === 'offline' ? 'API unavailable' : 'Connecting API'}</div><div className="profile-pill"><span className="pulse"/> Profile complete <b>92%</b></div></div></header>
      {notice && <div className="toast">✓ {notice}</div>}

      {view === 'recommendations' && <>
        <section className="hero-panel">
          <div><p className="eyebrow light">PERSONALISED FOR ARUN</p><h2>Three shirts, compared to your body—not a generic size chart.</h2><p>We use garment measurements, your regular-fit preference and live stock to explain every match.</p></div>
          <div className="metric"><strong>{recommendations.filter(r => r.stock > 0).length}</strong><span>in-stock matches</span></div>
        </section>
        <div className="section-heading"><div><h2>Recommended now</h2><p>Only variants available to purchase are ranked.</p></div><button className="text-button" onClick={() => setView('profile')}>Edit measurements →</button></div>
        <div className="cards">
          {recommendations.map((item, index) => <article className={`product-card ${item.stock === 0 ? 'disabled' : ''}`} key={item.id}>
            <div className={`garment art-${index}`}><span className="size">{item.size}</span><div className="shirt">♙</div></div>
            <div className="card-content"><div className="card-top"><span className={`fit ${item.fit.tone}`}>{item.fit.label}</span><span className="confidence">{item.fit.score}% match</span></div><h3>{item.name}</h3><p className="subtle">{item.colour} · Size {item.size}</p><div className="fit-note"><Mark>{item.chest - body.chest} cm</Mark><span>{item.fit.note}</span></div><div className="card-footer"><span>{item.stock > 0 ? `${item.stock} available` : 'Out of stock'}</span><button disabled={item.stock === 0}>View fit details</button></div></div>
          </article>)}
        </div>
      </>}

      {view === 'profile' && <section className="two-column">
        <form className="form-card" onSubmit={saveProfile}><div className="form-heading"><div><p className="eyebrow">MANUAL PROFILE</p><h2>Your upper-body measurements</h2></div><span className="method">Tape measured</span></div><p>Enter body measurements—not garment measurements. All values are in centimetres.</p><div className="form-grid">{(Object.keys(draft) as (keyof Measurements)[]).map(key => <label key={key}><span>{key[0].toUpperCase()+key.slice(1)}</span><div className="input-wrap"><input min="20" max="250" step="0.5" type="number" value={draft[key]} onChange={e => setDraft({ ...draft, [key]: Number(e.target.value) })}/><small>cm</small></div></label>)}</div><div className="form-actions"><button type="button" className="secondary" onClick={() => setDraft(body)}>Reset</button><button type="submit">Save and recalculate</button></div></form>
        <aside className="guide-card"><div className="body-figure">⌇<span className="line chest-line">Chest</span><span className="line waist-line">Waist</span><span className="line hip-line">Hip</span></div><h3>Measure over light clothing</h3><p>Keep the tape level and comfortably close to your body. Don’t pull it tight.</p><button className="text-button">Open measuring guide →</button></aside>
      </section>}

      {view === 'seller' && <section className="inventory-card"><div className="inventory-summary"><div><p className="eyebrow">CATALOGUE VISIBILITY</p><h2>Variant-level stock</h2><p>Out-of-stock sizes are immediately excluded from customer recommendations.</p></div><div className="stock-total"><strong>{inventory.reduce((sum, item) => sum + item.stock, 0)}</strong><span>units available</span></div></div><div className="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Variant</th><th>Status</th><th>Available</th><th>Quick adjust</th></tr></thead><tbody>{inventory.map(item => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.colour}</small></td><td><code>{item.sku}</code></td><td>Size {item.size}</td><td><span className={`status ${item.stock ? 'available' : 'out'}`}><i/>{item.stock ? 'Visible' : 'Hidden'}</span></td><td><strong>{item.stock}</strong></td><td><div className="stepper"><button onClick={() => adjustStock(item.id, -1)} aria-label={`Remove one ${item.sku}`}>−</button><span>{item.stock}</span><button onClick={() => adjustStock(item.id, 1)} aria-label={`Add one ${item.sku}`}>+</button></div></td></tr>)}</tbody></table></div></section>}
    </main>
  </div>
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
