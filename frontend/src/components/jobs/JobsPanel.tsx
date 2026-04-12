"use client";

import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

const CATEGORIES = [
  { id: 'it', label: 'IT va Dasturlash', icon: '💻', type: 'online' },
  { id: 'design', label: 'Dizayn va Media', icon: '🎨', type: 'online' },
  { id: 'smm', label: 'SMM va Matn', icon: '✍️', type: 'online' },
  { id: 'education', label: "Ta'lim va O'quv", icon: '🎓', type: 'both' },
  { id: 'tech', label: 'Texnik Ustalar', icon: '🔧', type: 'offline' },
  { id: 'sales', label: 'Savdo va Xizmat', icon: '🛍', type: 'offline' },
  { id: 'logistics', label: 'Kuryer va Haydovchi', icon: '🚚', type: 'offline' },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app';

export default function JobsPanel() {
  const [activeTab, setActiveTab] = useState<'online' | 'offline'>('online');
  const [searchTerm, setSearchTerm] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  const [experts, setExperts] = useState<any[]>([]);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/jobs?type=${activeTab === 'online' ? 'online' : 'all'}`);
        if (response.ok) {
          const data = await response.json();
          const list = Array.isArray(data) ? data : data?.jobs || data?.data || [];
          setJobs(list);
          if (list.length > 0 && !selectedJob) setSelectedJob(list[0]);
        }
      } catch (error) {
        console.error('Failed to fetch jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [activeTab]);

  useEffect(() => {
    const fetchExperts = async () => {
      if (!searchTerm && activeTab !== 'online') return; // Only fetch experts if searching or in online tab (experts be mostly online)
      try {
        const url = `${API_URL}/api/users/search?expert=true${searchTerm ? `&q=${encodeURIComponent(searchTerm)}` : ''}`;
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setExperts(data);
        }
      } catch (e) {
        console.error('Failed to fetch experts in JobsPanel:', e);
      }
    };
    fetchExperts();
  }, [searchTerm, activeTab]);

  const filteredCategories = CATEGORIES.filter((c) => c.type === activeTab || c.type === 'both');

  const filteredJobs = jobs.filter(
    (job) =>
      (activeTab === 'online' ? job.type === 'online' : job.type === 'offline') &&
      (job.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full gap-4 overflow-hidden">
      {/* Header – ServicesList bilan bir xil uslub */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-white text-xl font-black uppercase tracking-tight">Ish qidirish</h2>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">
              Tasdiqlangan e'lonlar
            </p>
          </div>
        </div>
      </div>

      {/* Tablar */}
      <div className="flex gap-2 px-2">
        <button
          onClick={() => setActiveTab('online')}
          className={`flex-1 py-2.5 px-4 rounded-2xl text-sm font-bold transition-all ${
            activeTab === 'online'
              ? 'bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 shadow-lg shadow-emerald-500/10'
              : 'bg-white/5 border border-white/10 hover:bg-white/10 text-white/50'
          }`}
        >
          Online
        </button>
        <button
          onClick={() => setActiveTab('offline')}
          className={`flex-1 py-2.5 px-4 rounded-2xl text-sm font-bold transition-all ${
            activeTab === 'offline'
              ? 'bg-purple-500/30 border border-purple-400/50 text-purple-200 shadow-lg shadow-purple-500/10'
              : 'bg-white/5 border border-white/10 hover:bg-white/10 text-white/50'
          }`}
        >
          Joyda
        </button>
      </div>

      {/* Qidiruv – ServicesList uslubi */}
      <GlassCard className="!p-3 flex items-center gap-3 bg-white/10 border-white/15">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ish yoki mutaxassis qidirish..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-emerald-500 outline-none"
          />
        </div>
      </GlassCard>

      {/* Kontent – scroll qiluvchi */}
      <GlassCard className="flex-1 min-h-0 flex flex-col !p-0 overflow-hidden rounded-[24px] bg-white/10 border-white/20 shadow-2xl">
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-4">
          {/* Kategoriyalar */}
          <div className="space-y-2">
            <h3 className="text-white/50 text-[10px] font-black uppercase tracking-[0.25em]">Kategoriyalar</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredCategories.map((cat) => (
                <button
                  key={cat.id}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 flex items-center gap-3 transition-colors text-left"
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-sm font-medium text-white/80 truncate">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mutaxassislar (Ekspertlar) */}
          {(experts.length > 0) && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <h3 className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.25em]">Top mutaxassislar</h3>
              <div className="flex flex-col gap-3">
                {experts.slice(0, 5).map((exp) => (
                  <GlassCard
                    key={exp.id}
                    hoverEffect={true}
                    className="!p-4 !rounded-2xl !bg-emerald-500/5 border-emerald-500/20 hover:!bg-emerald-500/10 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500/30 bg-white/10 flex-shrink-0">
                        {exp.avatar_url ? (
                          <img src={exp.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold">{exp.name?.[0]}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center gap-2">
                          <h4 className="font-bold text-white text-sm truncate">{exp.name} {exp.surname}</h4>
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold uppercase">Mutaxassis</span>
                        </div>
                        <p className="text-[11px] text-emerald-400 font-medium truncate">{exp.profession}</p>
                        <div className="flex justify-between items-center mt-1">
                           <span className="text-[10px] text-white/40">{exp.experience_years || 0} yil tajriba</span>
                           <span className="text-[10px] text-emerald-300 font-bold">{exp.hourly_rate || exp.service_price || 0} MALI</span>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}

          {/* Ish e'lonlari */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <h3 className="text-white/70 text-[10px] font-black uppercase tracking-[0.25em]">So&apos;nggi e&apos;lonlar</h3>
            {loading ? (
              <div className="py-10 text-center text-white/40 text-sm">Yuklanmoqda...</div>
            ) : filteredJobs.length > 0 ? (
              <div className="space-y-3">
                {filteredJobs.map((job) => (
                  <GlassCard
                    key={job.id}
                    hoverEffect={true}
                    onClick={() => setSelectedJob(job)}
                    className={`!p-4 !rounded-2xl cursor-pointer transition-all ${
                      selectedJob?.id === job.id
                        ? '!bg-emerald-500/20 border-emerald-400/40'
                        : '!bg-white/5 border-white/10 hover:!bg-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-white text-sm truncate flex-1">{job.title || 'Ish'}</h4>
                      <span className="text-emerald-300 text-xs font-bold whitespace-nowrap">
                        {job.price || job.budget || '—'} MALI
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/50 mt-1">
                      <span>{job.user?.name || job.creator?.name || '—'}</span>
                      <span>•</span>
                      <span className="capitalize">{job.category || job.type || '—'}</span>
                    </div>
                  </GlassCard>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-white/40 text-sm">
                Hozircha e&apos;lonlar yo&apos;q
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
