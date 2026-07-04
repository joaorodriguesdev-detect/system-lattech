'use client';
import { useState, useEffect } from 'react';
import { Star, X, ThumbsUp, Clock, Send } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api'; 

interface Review {
  id: number;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

// 👇 Agora ele recebe o ID certo da empresa dinamicamente!
interface ReviewsSummaryProps {
  companyId: number | null;
}

export default function ReviewsSummary({ companyId }: ReviewsSummaryProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  const fetchReviews = async () => {
    if (!companyId) return; 
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reviews/?company_id=${companyId}`, {
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(Array.isArray(data) ? data : []);
      }
    } catch {
      // silencia o erro
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchReviews();
    }
  }, [companyId]);

  const openModal = async () => {
    setShowModal(true);
    setShowForm(false);
    setSuccessMsg('');
    await fetchReviews(); 
  };

  const handleSubmit = async () => {
    if (!companyId) return;
    
    if (!customerName.trim() || rating === 0 || !comment.trim()) {
      alert('Preencha todos os campos.');
      return;
    }
    if (comment.length > 50) {
      alert('O comentário deve ter no máximo 50 caracteres.');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reviews/?company_id=${companyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          rating,
          comment: comment.trim(),
        }),
      });
      
      if (res.ok) {
        setSuccessMsg('Avaliação enviada para aprovação!');
        setShowForm(false);
        setCustomerName('');
        setRating(0);
        setComment('');
        await fetchReviews();
      } else {
        const err = await res.json();
        alert(err.detail || 'Erro ao enviar avaliação.');
      }
    } catch {
      alert('Erro de conexão com o servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  const average = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  return (
    <>
      <section className="relative overflow-hidden bg-black border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between transition-all duration-300 hover:scale-[1.02] hover:border-white/[0.12] active:scale-[0.99] cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-400">
            <Star size={22} fill="currentColor" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Avaliações do Público</h3>
            <p className="text-xs text-zinc-400">
              {loading ? 'Carregando...' : `${average} de ${reviews.length} avaliações`}
            </p>
          </div>
        </div>
        <button
          onClick={openModal}
          className="text-xs font-semibold bg-zinc-800 px-2.5 py-1 rounded-lg text-zinc-300 border border-zinc-700/50 hover:bg-zinc-700 transition"
        >
          Ver todas
        </button>
      </section>

      {showModal && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
          <div className="bg-black border border-zinc-800 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Star size={20} className="text-amber-400" fill="currentColor" />
                Avaliações
              </h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white transition">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[280px]">
              {loading ? (
                <p className="text-center text-zinc-500 py-8">Carregando...</p>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8">
                  <ThumbsUp size={40} className="mx-auto text-zinc-600 mb-3" />
                  <p className="text-zinc-400 font-medium">Nenhuma avaliação ainda</p>
                  <p className="text-zinc-600 text-sm mt-1">Seja o primeiro a avaliar!</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="bg-zinc-800/40 p-4 rounded-xl border border-zinc-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-sm">{review.customer_name}</p>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            className={star <= review.rating ? 'text-amber-400' : 'text-zinc-600'}
                            fill={star <= review.rating ? 'currentColor' : 'none'}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-zinc-300">{review.comment}</p>
                  </div>
                ))
              )}
            </div>

            {showForm ? (
              <div className="p-5 border-t border-zinc-800 space-y-4">
                <input
                  type="text"
                  placeholder="Seu nome..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  maxLength={50}
                  className="w-full bg-black p-3 rounded-xl border border-zinc-700 text-sm focus:outline-none focus:border-amber-500"
                />
                
                <div className="flex items-center gap-1">
                  <span className="text-xs text-zinc-400 mr-2">Nota:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition"
                    >
                      <Star
                        size={22}
                        className={
                          star <= (hoverRating || rating)
                            ? 'text-amber-400'
                            : 'text-zinc-600'
                        }
                        fill={star <= (hoverRating || rating) ? 'currentColor' : 'none'}
                      />
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <textarea
                    placeholder="Sua avaliação (máx 50 caracteres)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={50}
                    rows={2}
                    className="w-full bg-black p-3 rounded-xl border border-zinc-700 text-sm focus:outline-none focus:border-amber-500 resize-none"
                  />
                  <span className="absolute bottom-2 right-3 text-xs text-zinc-500">
                    {comment.length}/50
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl text-sm font-semibold border border-zinc-700 hover:bg-zinc-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
                  >
                    <Send size={15} />
                    {submitting ? 'Enviando...' : 'Enviar Avaliação'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 border-t border-zinc-800">
                {successMsg && (
                  <p className="text-green-400 text-xs text-center mb-3">{successMsg}</p>
                )}
                <button
                  onClick={() => { setShowForm(true); setSuccessMsg(''); }}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
                >
                  <Clock size={16} />
                  Avaliar
                </button>
                <p className="text-center text-zinc-600 text-[10px] mt-2">
                  Obrigado pelo seu Fedback
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}