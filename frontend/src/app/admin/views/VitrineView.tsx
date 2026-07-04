'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Plus, X, ShoppingBag, Trash2, Image as ImageIcon } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  tag: string;
  image_url: string;
}

// 🔥 REMOVIDO A DEPENDÊNCIA DA PROP. AGORA ELE É AUTOSSUFICIENTE.
export default function VitrineView() {
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  
  // States do formulário
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodTag, setProdTag] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchProducts = async () => {
    // 🔥 BUSCA O TOKEN FRESCO DIRETO DO NAVEGADOR
    const currentToken = localStorage.getItem('access_token');
    if (!currentToken) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/products`, {
        headers: { Authorization: `Bearer ${currentToken}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setAdminProducts(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Erro ao buscar produtos", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    
    // 🔥 BUSCA O TOKEN FRESCO NA HORA DE SALVAR
    const currentToken = localStorage.getItem('access_token');
    if (!currentToken) {
      alert("Sessão expirada. Faça login novamente.");
      return;
    }

    if (!prodName.trim() || !prodPrice || !imageFile) {
      alert("Preencha o nome, preço e selecione uma imagem!");
      return;
    }
    setSaving(true);
    
    const formData = new FormData();
    formData.append('name', prodName);
    formData.append('price', prodPrice);
    if (prodDesc) formData.append('description', prodDesc);
    if (prodTag) formData.append('tag', prodTag);
    formData.append('image', imageFile);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}` },
        body: formData,
      });

      if (res.ok) {
        await fetchProducts();
        setShowProductForm(false);
        resetForm();
      } else {
        const err = await res.json();
        const errMsg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
        alert(`Erro do Servidor: ${errMsg}`);
      }
    } catch {
      alert('Erro ao conectar com o servidor.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Excluir este produto da vitrine definitivamente?')) return;
    
    const currentToken = localStorage.getItem('access_token');
    if (!currentToken) return;

    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.ok) {
        setAdminProducts(prev => prev.filter(p => p.id !== id));
      } else {
        alert("Erro ao excluir o produto");
      }
    } catch {
      alert("Erro ao conectar com o servidor");
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setProdName('');
    setProdPrice('');
    setProdDesc('');
    setProdTag('');
    setImageFile(null);
    setImagePreview('');
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#121214] border border-white/[0.05] rounded-3xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-white text-xl font-bold flex items-center gap-2">
            </h2>
            <p className="text-zinc-500 text-sm mt-1">Gerencie os produtos oferecidos e mostre fotos reais.</p>
          </div>
                    <button
            onClick={() => {
              if (showProductForm) {
                setShowProductForm(false);
                resetForm();
              } else {
                setShowProductForm(true);
              }
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition shadow-lg"
          >
            {showProductForm ? <X size={16} /> : <Plus size={16} />}
            {showProductForm ? 'Cancelar' : 'Adicionar Produto'}
          </button>
        </div>

        {showProductForm && (
          <form onSubmit={handleSaveProduct} className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Coluna da Imagem */}
              <div>
                <label className="block text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-2">Foto do Produto</label>
                <div className="w-full aspect-square border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center bg-[#121214] overflow-hidden relative mb-4">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <ImageIcon size={32} className="mx-auto text-zinc-600 mb-2" />
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Nenhuma foto selecionada</p>
                    </div>
                  )}
                </div>
                <input type="file" accept="image/*" required onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImageFile(file);
                  if (file) setImagePreview(URL.createObjectURL(file));
                  else setImagePreview('');
                }} className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-500/10 file:text-sky-400 hover:file:bg-blue-500/20 cursor-pointer" />
              </div>
              {/* Coluna dos Dados */}
              <div className="flex flex-col justify-between gap-5">
                <div>
                  <label className="block text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-2">Nome do Produto</label>
                  <input type="text" required value={prodName} onChange={(e) => setProdName(e.target.value)}
                    placeholder="Ex: Pomada Efeito Matte"
                    className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition" />
                </div>
                <div>
                  <input type="number" step="0.01" min="0" required value={prodPrice} onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="45.90"
                    className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition" />
                </div>
                <div>
                                    <label className="block text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-2">Descrição Curta</label>
                    <input type="text" placeholder="Alta fixação e efeito seco" value={prodDesc} onChange={(e) => setProdDesc(e.target.value)}
                    className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-2">Etiqueta (Opcional)</label>
                  <input type="text" value={prodTag} onChange={(e) => setProdTag(e.target.value)}
                    className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition" />
                </div>

                                <div className="flex justify-end pt-2">
                  <button disabled={saving} className="w-full bg-white text-black hover:bg-zinc-200 text-sm font-bold px-8 py-3.5 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? 'Salvando...' : 'Publicar Produto'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : adminProducts.length === 0 ? (
          <div className="text-center py-20 bg-[#0A0A0A] rounded-2xl border border-dashed border-white/10">
            <ShoppingBag size={40} className="mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400 text-sm">Sua vitrine está vazia.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {adminProducts.map((prod) => (
              <div key={prod.id} className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-4 relative group">
                <div className="w-full aspect-square rounded-2xl bg-[#050505] overflow-hidden mb-4 relative">
                  <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  
                  {prod.tag && (
                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg z-10">
                      <span className="text-[9px] font-bold text-white uppercase tracking-widest">{prod.tag}</span>
                    </div>
                  )}

                  {/* Botão de excluir flutuante no estilo do Feed */}
                  <button 
                    onClick={() => handleDeleteProduct(prod.id)} 
                    disabled={deletingId === prod.id}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-rose-600 backdrop-blur-md border border-white/10 text-white p-2 rounded-xl transition-all duration-300 disabled:opacity-50 z-10"
                  >
                    <Trash2 size={14} className={deletingId === prod.id ? "animate-pulse" : ""} />
                  </button>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-zinc-100 line-clamp-1">{prod.name}</h3>
                  <p className="text-[10px] text-zinc-500 line-clamp-2 min-h-[30px]">{prod.description || 'Sem descrição'}</p>
                  <p className="text-sm font-extrabold text-sky-400 pt-1">R$ {Number(prod.price).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

