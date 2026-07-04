'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

interface Review {
  id: number;
  customer_name: string;
  rating: number;
  comment: string;
  status: string;
}

export default function AvaliacoesView() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [loadingAllReviews, setLoadingAllReviews] = useState(false);

  const fetchAllReviews = async () => {
    if (!token) return;
    setLoadingAllReviews(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reviews/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAllReviews(await res.json());
    } catch {
      // Silencioso
    } finally {
      setLoadingAllReviews(false);
    }
  };

  useEffect(() => {
    fetchAllReviews();
  }, []);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#121214] border border-white/[0.05] rounded-3xl p-6 md:p-8">
        <h2 className="text-white text-xl font-bold mb-6">Reputação e Avaliações</h2>

        {loadingAllReviews ? (
          <div className="flex justify-center py-10">

            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : allReviews.length === 0 ? (
          <p className="text-center text-zinc-500 py-10">Nenhuma avaliação recebida.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allReviews.map((review) => (
              <div key={review.id} className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">

                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-sky-400 font-bold text-sm">
                      {review.customer_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-semibold text-zinc-100 block">{review.customer_name}</span>
                      <div className="flex gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={star <= review.rating ? 'text-amber-400' : 'text-zinc-700'}
                            fill={star <= review.rating ? 'currentColor' : 'none'}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-md border
                    ${review.status === 'approved'

                      ? 'bg-sky-400/10 text-sky-400 border-sky-400/20'
                      : review.status === 'pending'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {review.status === 'approved' ? 'Pública' : review.status === 'pending' ? 'Oculta' : 'Rejeitada'}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 italic">&ldquo;{review.comment}&rdquo;</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

