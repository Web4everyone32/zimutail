import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './cloud-status.css';
import './release.css';

type FitPreference = 'slim' | 'regular' | 'relaxed';
type Measurements = { chest: number; waist: number; hip: number; shoulder: number; sleeve: number };
type BodyProfile = Measurements & { fit_preference: FitPreference };
type Variant = Measurements & {
  id: number;
  name: string;
  sku: string;
  size: string;
  colour: string;
  stock: number;
  reserved: number;
  version: number;
};
type FitTone = 'good' | 'warn' | 'bad';
type FitView = { label: string; tone: FitTone; score: number; chestEase: number; waistEase: number; note: string };
type Recommendation = Variant & { fit: FitView };
type ApiRecommendation = {
  variant: Variant;
  result: 'Best fit' | 'Close match' | 'Not recommended';
  chest_ease_cm: number;
  waist_ease_cm: number;
  score: number;
  reason: string;
  rule_version: string;
};

const fallbackVariants: Variant[] = [
  { id: 1, name: 'Everyday Oxford', sku: 'OX-BLU-M', size: 'M', colour: 'Harbour blue', stock: 7, reserved: 0, version: 1, chest: 108, waist: 104, hip: 106, shoulder: 45, sleeve: 63 },
  { id: 2, name: 'Everyday Oxford', sku: 'OX-BLU-L', size: 'L', colour: 'Harbour blue', stock: 0, reserved: 0, version: 1, chest: 114, waist: 110, hip: 112, shoulder: 47, sleeve: 64 },
  { id: 3, name: 'Soft Twill Shirt', sku: 'TW-SND-M', size: 'M', colour: 'Warm sand', stock: 3, reserved: 0, version: 1, chest: 111, waist: 107, hip: 110, shoulder: 46, sleeve: 62 },
];

const initialBody: BodyProfile = { chest: 99, waist: 86, hip: 100, shoulder: 44, sleeve: 61, fit_preference: 'regular' };
const API_URL = import.meta.env.PROD
  ? 'https://zimutail-api-44czinycoa-as.a.run.app/api/v1'
  : import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function toneFor(result: ApiRecommendation['result']): FitTone {
  return result === 'Best fit' ? 'good' : result === 'Close match' ? 'warn' : 'bad';
}

function fromApi(result: ApiRecommendation): Recommendation {
  return {
    ...result.variant,
    fit: {
      label: result.result,
      tone: toneFor(result.result),
      score: result.score,
      chestEase: result.chest_ease_cm,
      waistEase: result.waist_ease_cm,
      note: result.reason,
    },
  };
}

function scoreLocal(body: BodyProfile, garment: Variant): FitView {
  const chestEase = garment.chest - body.chest;
  const waistEase = garment.waist - body.waist;
  const targets = {
    slim: { chest: [5, 10], waist: [6, 15] },
    regular: { chest: [8, 13], waist: [10, 23] },
    relaxed: { chest: [13, 20], waist: [16, 30] },
  }[body.fit_preference];
  const chestMatches = chestEase >= targets.chest[0] && chestEase <= targets.chest[1];
  const waistMatches = waistEase >= targets.waist[0] && waistEase <= targets.waist[1];
  if (chestMatches && waistMatches) {
    return { label: 'Best fit', tone: 'good', score: 94, chestEase, waistEase, note: `${chestEase} cm chest ease matches your ${body.fit_preference} preference.` };
  }
  if (chestEase >= targets.chest[0] - 4 && chestEase <= targets.chest[1] + 4) {
    return { label: 'Close match', tone: 'warn', score: 79, chestEase, waistEase, note: `${chestEase} cm chest ease is close; the feel may be slightly tighter or looser.` };
  }
  return { label: 'Not recommended', tone: 'bad', score: 52, chestEase, waistEase, note: `The garment ease falls outside your ${body.fit_preference} fit range.` };
}

function Mark({ children }: { children: React.ReactNode }) {
  return <span className="mark">{children}</span>;
}

function App() {
  const [view, setView] = useState<'recommendations' | 'profile' | 'seller'>('recommendations');
  const [body, setBody] = useState(initialBody);
  const [draft, setDraft] = useState(initialBody);
  const [notice, setNotice] = useState('');
  const [inventory, setInventory] = useState(fallbackVariants);
  const [cloudRecommendations, setCloudRecommendations] = useState<Recommendation[]>([]);
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [isLoadingFits, setIsLoadingFits] = useState(true);
  const [savingVariantId, setSavingVariantId] = useState<number | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);

  const localRecommendations = useMemo(
    () => inventory.filter(item => item.stock > 0).map(item => ({ ...item, fit: scoreLocal(body, item) })).sort((a, b) => b.fit.score - a.fit.score),
    [body, inventory],
  );
  const recommendations = apiStatus === 'connected' ? cloudRecommendations : localRecommendations;

  async function getRecommendations(profile: BodyProfile): Promise<Recommendation[]> {
    const results = await apiRequest<ApiRecommendation[]>('/fit/recommendations', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
    return results.map(fromApi);
  }

  useEffect(() => {
    let active = true;
    async function connect() {
      try {
        await apiRequest<{ status: string }>('/health');
        const [variants, fits] = await Promise.all([
          apiRequest<Variant[]>('/catalogue/variants'),
          getRecommendations(initialBody),
        ]);
        if (!active) return;
        setInventory(variants);
        setCloudRecommendations(fits);
        setApiStatus('connected');
      } catch {
        if (!active) return;
        setApiStatus('offline');
        setInventory(fallbackVariants);
      } finally {
        if (active) setIsLoadingFits(false);
      }
    }
    connect();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedRecommendation) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedRecommendation(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [selectedRecommendation]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    const nextBody = { ...draft };
    setBody(nextBody);
    setIsLoadingFits(true);
    try {
      if (apiStatus === 'connected') setCloudRecommendations(await getRecommendations(nextBody));
      setNotice('Profile updated — recommendations recalculated.');
    } catch (error) {
      setApiStatus('offline');
      setNotice(`Cloud sync paused — ${error instanceof Error ? error.message : 'using local fit rules'}.`);
    } finally {
      setIsLoadingFits(false);
      window.setTimeout(() => setNotice(''), 3500);
    }
  }

  async function adjustStock(id: number, delta: number) {
    const current = inventory.find(item => item.id === id);
    if (!current || savingVariantId !== null) return;

    if (apiStatus !== 'connected') {
      setInventory(items => items.map(item => item.id === id ? { ...item, stock: Math.max(0, item.stock + delta), version: item.version + 1 } : item));
      setNotice('Demo inventory updated locally. Reconnect the API to persist it.');
      window.setTimeout(() => setNotice(''), 3500);
      return;
    }

    setSavingVariantId(id);
    try {
      const updated = await apiRequest<Variant>(`/inventory/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ delta, expected_version: current.version }),
      });
      setInventory(items => items.map(item => item.id === id ? updated : item));
      setCloudRecommendations(await getRecommendations(body));
      setNotice(`${updated.sku} is now ${updated.stock > 0 ? `visible with ${updated.stock} available` : 'hidden from recommendations'}.`);
    } catch (error) {
      try {
        setInventory(await apiRequest<Variant[]>('/catalogue/variants'));
        setCloudRecommendations(await getRecommendations(body));
      } catch {
        setApiStatus('offline');
      }
      setNotice(`Inventory was refreshed — ${error instanceof Error ? error.message : 'the update could not be saved'}.`);
    } finally {
      setSavingVariantId(null);
      window.setTimeout(() => setNotice(''), 3500);
    }
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
      <header><div><p className="eyebrow">SECOND RELEASE · LIVE DATA LOOP</p><h1>{view === 'recommendations' ? 'Your fit shortlist' : view === 'profile' ? 'Body measurements' : 'Seller inventory'}</h1></div><div className="header-tools"><div className={`api-pill ${apiStatus}`} title={apiStatus === 'connected' ? 'Recommendations and inventory are synced with the cloud API.' : 'The interface is using local demo data.'}><span className="pulse"/> {apiStatus === 'connected' ? 'Cloud data synced' : apiStatus === 'offline' ? 'Offline demo mode' : 'Connecting cloud data'}</div><div className="profile-pill"><span className="pulse"/> Profile complete <b>92%</b></div></div></header>
      {notice && <div className="toast" role="status">✓ {notice}</div>}

      {view === 'recommendations' && <>
        <section className="hero-panel">
          <div><p className="eyebrow light">PERSONALISED FOR ARUN · {body.fit_preference.toUpperCase()} FIT</p><h2>Available shirts, compared to your body—not a generic size chart.</h2><p>Every match uses garment measurements, your fit preference and the latest sellable stock.</p></div>
          <div className="metric"><strong>{recommendations.length}</strong><span>in-stock matches</span></div>
        </section>
        <div className="section-heading"><div><h2>Recommended now</h2><p>{apiStatus === 'connected' ? 'Ranked by the FastAPI fit engine and filtered by live inventory.' : 'Previewed with local fit rules until the cloud API reconnects.'}</p></div><button className="text-button" onClick={() => setView('profile')}>Edit measurements →</button></div>
        {isLoadingFits ? <div className="empty-state">Recalculating your available fits…</div> : recommendations.length === 0 ? <div className="empty-state"><strong>No sellable match is available right now.</strong><span>The seller can restore a suitable size from the inventory workspace.</span></div> : <div className="cards">
          {recommendations.map((item, index) => <article className="product-card" key={item.id}>
            <div className={`garment art-${index % 3}`}><span className="size">{item.size}</span><div className="shirt" aria-hidden="true">♙</div></div>
            <div className="card-content"><div className="card-top"><span className={`fit ${item.fit.tone}`}>{item.fit.label}</span><span className="confidence">{item.fit.score}% match</span></div><h3>{item.name}</h3><p className="subtle">{item.colour} · Size {item.size}</p><div className="fit-note"><Mark>{item.fit.chestEase} cm</Mark><span>{item.fit.note}</span></div><div className="card-footer"><span>{item.stock} available</span><button type="button" onClick={() => setSelectedRecommendation(item)} aria-label={`View fit details for ${item.name}, size ${item.size}`}>View fit details</button></div></div>
          </article>)}
        </div>}
      </>}

      {view === 'profile' && <section className="two-column">
        <form className="form-card" onSubmit={saveProfile}><div className="form-heading"><div><p className="eyebrow">MANUAL PROFILE</p><h2>Your upper-body measurements</h2></div><span className="method">Tape measured</span></div><p>Enter body measurements—not garment measurements. All values are in centimetres.</p><div className="preference-field"><span>How should clothes feel?</span><div className="preference-options">{(['slim', 'regular', 'relaxed'] as FitPreference[]).map(preference => <button type="button" className={draft.fit_preference === preference ? 'selected' : ''} onClick={() => setDraft({ ...draft, fit_preference: preference })} key={preference}>{preference[0].toUpperCase() + preference.slice(1)}</button>)}</div></div><div className="form-grid">{(Object.keys(initialBody).filter(key => key !== 'fit_preference') as (keyof Measurements)[]).map(key => <label key={key}><span>{key[0].toUpperCase()+key.slice(1)}</span><div className="input-wrap"><input min="20" max="250" step="0.5" type="number" value={draft[key]} onChange={event => setDraft({ ...draft, [key]: Number(event.target.value) })}/><small>cm</small></div></label>)}</div><div className="form-actions"><button type="button" className="secondary" onClick={() => setDraft(body)}>Reset</button><button type="submit" disabled={isLoadingFits}>{isLoadingFits ? 'Recalculating…' : 'Save and recalculate'}</button></div></form>
        <aside className="guide-card"><div className="body-figure">⌇<span className="line chest-line">Chest</span><span className="line waist-line">Waist</span><span className="line hip-line">Hip</span></div><h3>Measure over light clothing</h3><p>Keep the tape level and comfortably close to your body. Don’t pull it tight.</p><button className="text-button">Open measuring guide →</button></aside>
      </section>}

      {view === 'seller' && <section className="inventory-card"><div className="inventory-summary"><div><p className="eyebrow">CATALOGUE VISIBILITY · {apiStatus === 'connected' ? 'NEON PERSISTED' : 'LOCAL DEMO'}</p><h2>Variant-level stock</h2><p>When a size reaches zero, the cloud fit engine immediately removes it from customer recommendations.</p></div><div className="stock-total"><strong>{inventory.reduce((sum, item) => sum + item.stock, 0)}</strong><span>units available</span></div></div><div className="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Variant</th><th>Status</th><th>Available</th><th>Quick adjust</th></tr></thead><tbody>{inventory.map(item => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.colour}</small></td><td><code>{item.sku}</code></td><td>Size {item.size}</td><td><span className={`status ${item.stock ? 'available' : 'out'}`}><i/>{item.stock ? 'Visible' : 'Hidden'}</span></td><td><strong>{item.stock}</strong>{item.reserved > 0 && <small>{item.reserved} reserved</small>}</td><td><div className="stepper"><button disabled={savingVariantId !== null || item.stock === 0} onClick={() => adjustStock(item.id, -1)} aria-label={`Remove one ${item.sku}`}>−</button><span>{savingVariantId === item.id ? '…' : item.stock}</span><button disabled={savingVariantId !== null} onClick={() => adjustStock(item.id, 1)} aria-label={`Add one ${item.sku}`}>+</button></div></td></tr>)}</tbody></table></div></section>}
    </main>

    {selectedRecommendation && <div className="fit-modal-backdrop" onMouseDown={() => setSelectedRecommendation(null)}>
      <section className="fit-modal" role="dialog" aria-modal="true" aria-labelledby="fit-modal-title" onMouseDown={event => event.stopPropagation()}>
        <div className="fit-modal-heading">
          <div><p className="eyebrow">PERSONALISED FIT BREAKDOWN</p><h2 id="fit-modal-title">Why size {selectedRecommendation.size} fits you</h2><p>{selectedRecommendation.name} · {selectedRecommendation.colour}</p></div>
          <button type="button" className="modal-close" onClick={() => setSelectedRecommendation(null)} aria-label="Close fit details">×</button>
        </div>
        <div className="fit-verdict">
          <span className={`fit ${selectedRecommendation.fit.tone}`}>{selectedRecommendation.fit.label}</span>
          <strong>{selectedRecommendation.fit.score}% match</strong>
          <p>{selectedRecommendation.fit.note}</p>
        </div>
        <div className="ease-summary">
          <div><span>Chest ease</span><strong>{selectedRecommendation.fit.chestEase} cm</strong><small>Room beyond your chest</small></div>
          <div><span>Waist ease</span><strong>{selectedRecommendation.fit.waistEase} cm</strong><small>Room beyond your waist</small></div>
          <div><span>Availability</span><strong>{selectedRecommendation.stock}</strong><small>units ready to sell</small></div>
        </div>
        <div className="measurement-comparison">
          <h3>Your body vs. this garment</h3>
          <div className="comparison-header"><span>Measurement</span><span>You</span><span>Garment</span></div>
          {(['chest', 'waist', 'hip', 'shoulder', 'sleeve'] as (keyof Measurements)[]).map(key => <div className="comparison-row" key={key}>
            <span>{key[0].toUpperCase() + key.slice(1)}</span><strong>{body[key]} cm</strong><strong>{selectedRecommendation[key]} cm</strong>
          </div>)}
        </div>
        <div className="fit-modal-actions">
          <button type="button" className="secondary" onClick={() => { setSelectedRecommendation(null); setView('profile'); }}>Edit my measurements</button>
          <button type="button" onClick={() => setSelectedRecommendation(null)}>Done</button>
        </div>
      </section>
    </div>}
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
