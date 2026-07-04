'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

export default function PostagensView({ token }: { token: string }) {
  const [showPostForm, setShowPostForm] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);

  const fetchFeedPosts = async () => {
    setLoadingFeed(true);
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const companyId = userData.company_id; 

      const res = await fetch(`${API_BASE_URL}/feed/?company_id=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setFeedPosts(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Erro ao buscar feed", e);
    } finally {
      setLoadingFeed(false);
    }
  };

  useEffect(() => {
    fetchFeedPosts();
  }, [token]);

  const handlePostSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      alert('Selecione uma imagem para publicar.');
      return;
    }
    setPosting(true);
    
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const formData = new FormData();
    formData.append('barber_id', String(userData.id)); 
    formData.append('company_id', String(userData.company_id)); // 🔥 Garante que o backend saiba de qual empresa é!
    formData.append('image', imageFile);
    if (caption) formData.append('caption', caption); // 🔥 Só envia legenda se não estiver vazia

    try {
      const res = await fetch(`${API_BASE_URL}/feed/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }, // O navegador define o multipart/form-data automaticamente
        body: formData, // 🔥 FALTAVA ESTA LINHA AQUI!
      });
      if (!res.ok) {
        const err = await res.json();
        // 🔥 Agora desvendamos o [object Object]:
        const errMsg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail || err);
        alert(`❌ Erro do Servidor: ${errMsg}`);
      } else {
        await fetchFeedPosts(); 
        setShowPostForm(false);
        setImageFile(null);
        setImagePreview('');
        setCaption('');
      }
    } catch {
      alert('Erro de conexão com o servidor.');
    } finally {
      setPosting(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!confirm('Tem certeza que deseja apagar este post?')) return;
    setDeletingPostId(postId);
    try {
      const res = await fetch(`${API_BASE_URL}/feed/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFeedPosts((prev) => prev.filter((p: any) => p.id !== postId));
      } else {
        alert('Erro ao deletar post');
      }
    } catch {
      alert('Erro de conexão ao deletar post');
    } finally {
      setDeletingPostId(null);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#121214] border border-white/[0.05] rounded-3xl p-6 md:p-8 mb-6">
        
        {/* HEADER DA ABA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-white text-xl font-bold">Portfólio & Feed</h2>
            <p className="text-zinc-500 text-sm mt-1">Mostre seu trabalho para os clientes.</p>
          </div>
          <button
            onClick={() => setShowPostForm(!showPostForm)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition shadow-lg"
          >
            {showPostForm ? <X size={16} /> : <Plus size={16} />}
            {showPostForm ? 'Cancelar' : 'Nova Foto'}
          </button>
        </div>

        {/* FORMULÁRIO DE POSTAGEM */}
        {showPostForm && (
          <form onSubmit={handlePostSubmit} className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-2">Upload da Imagem</label>
                <input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImageFile(file);
                  if (file) setImagePreview(URL.createObjectURL(file));
                  else setImagePreview('');
                }} className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-500/10 file:text-sky-400 hover:file:bg-blue-500/20 cursor-pointer" />
                
                {imagePreview && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-white/10 bg-[#050505] max-h-48 flex items-center justify-center">
                    <img src={imagePreview} alt="Preview" className="max-h-48 object-contain" />
                  </div>
                )}
              </div>
              
              <div className="flex flex-col justify-between">
                <div>
                  <label className="block text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-2">Legenda / Estilo</label>
                  <textarea 
                    rows={4}
                    placeholder="Descreva o corte, os produtos usados..." 
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="bg-[#050505] border border-white/10 rounded-xl p-4 text-sm text-white w-full focus:border-blue-500 outline-none transition resize-none" 
                  />
                </div>
                <div className="flex justify-end mt-4">
                  <button disabled={posting}
                    className="w-full bg-white text-black hover:bg-zinc-200 text-sm font-bold px-6 py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {posting ? (
                      <><span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>Enviando...</>
                    ) : 'Publicar no Feed'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* LISTAGEM DOS POSTS */}
        {loadingFeed ? (
          <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : feedPosts.length === 0 ? (
          <p className="text-center text-zinc-500 py-10">Seu feed está vazio. Adicione trabalhos!</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {feedPosts.map((post: any) => (
              <div key={post.id} className="group relative rounded-2xl overflow-hidden border border-white/5 bg-[#0A0A0A] aspect-square">
                {/* Imagem de Fundo */}
                <img src={post.image_url} alt="Post" className="w-full h-full object-cover transition duration-500 group-hover:scale-105" />
                
                {/* 🔥 NOVO: Botão de Apagar Fixo no Topo Direito */}
                <button 
                  onClick={() => handleDeletePost(post.id)} 
                  disabled={deletingPostId === post.id}
                  title="Eliminar Fotografia"
                  className="absolute top-3 right-3 bg-black/50 hover:bg-rose-600 backdrop-blur-md border border-white/10 text-white p-2.5 rounded-xl transition-all duration-300 disabled:opacity-50 z-10"
                >
                  <Trash2 size={16} className={deletingPostId === post.id ? "animate-pulse" : ""} />
                </button>

                {/* Legenda (Oculta até o hover) */}
                {post.caption && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col justify-end p-4 pointer-events-none">
                    <p className="text-xs text-white line-clamp-3 mb-2">{post.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
      </div>
    </div>
  );
}