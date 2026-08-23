'use client';

import { useState, useEffect, useMemo } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, FileText, Circle, ExternalLink, BarChart3, Globe, Clock } from 'lucide-react';
import { Skeleton } from '@/components/admin/Skeleton';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CAT_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#2563eb',
];

export default function CalendarPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showSocial, setShowSocial] = useState(true);

  useEffect(() => {
    fetch('/admin/api/calendar')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const catColorMap = useMemo(() => {
    if (!data) return {};
    const m = {};
    data.categories.forEach((c, i) => { m[c] = CAT_COLORS[i % CAT_COLORS.length]; });
    return m;
  }, [data]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();
  const today = new Date();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const days = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  function getPostsForDay(day) {
    if (!data || !day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayPosts = data.byDate[dateStr] || [];
    if (categoryFilter) return dayPosts.filter(p => p.category === categoryFilter);
    return dayPosts;
  }

  function getSocialForDay(day) {
    if (!data || !day || !showSocial) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return data.socialByDate[dateStr] || [];
  }

  function getMonthlyStats() {
    if (!data) return { count: 0, words: 0 };
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthPosts = data.posts.filter(p => p.date.startsWith(key));
    return { count: monthPosts.length };
  }

  const monthStats = getMonthlyStats();
  const selectedPosts = selectedDay ? getPostsForDay(selectedDay) : [];

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6"><CalendarDays className="w-5 h-5 text-slate-300" /><div><div className="h-6 w-36 bg-slate-200 dark:bg-dark-border rounded animate-pulse" /><div className="h-4 w-24 bg-slate-100 dark:bg-dark-border rounded animate-pulse mt-1" /></div></div>
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5">
          <div className="flex justify-between mb-4"><Skeleton className="h-5 w-32" /><div className="flex gap-2"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div></div>
          <div className="grid grid-cols-7 gap-1 mb-2">{[...Array(7)].map((_, i) => <Skeleton key={i} className="h-3 w-full" />)}</div>
          <div className="grid grid-cols-7 gap-1">{[...Array(35)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <CalendarDays className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">Publishing Calendar</h1>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">{data?.totalPosts || 0} total posts</p>
        </div>
      </div>

      {/* Year stats */}
      {data && (
        <div className="grid grid-cols-6 gap-3 mb-6">
          {Object.entries(data.yearly).sort().map(([year, cats]) => {
            const total = Object.values(cats).reduce((s, v) => s + v, 0);
            return (
              <div key={year} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-slate-900 dark:text-dark-text">{total}</div>
                <div className="text-xs text-slate-500">{year}</div>
                <div className="flex gap-0.5 justify-center mt-1.5">
                  {Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([cat, count]) => (
                    <div
                      key={cat}
                      className="h-1.5 rounded-full"
                      style={{ width: `${Math.max(2, (count / total) * 30)}px`, backgroundColor: catColorMap[cat] || '#94a3b8' }}
                      title={`${cat}: ${count}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category legend + filter + social toggle */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setCategoryFilter('')}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${!categoryFilter ? 'bg-slate-200 text-slate-800 dark:bg-dark-border dark:text-dark-text' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-dark-card dark:text-dark-muted dark:hover:bg-dark-border'}`}
        >
          All
        </button>
        {data?.categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat === categoryFilter ? '' : cat)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition ${cat === categoryFilter ? 'text-white' : 'text-slate-600 dark:text-dark-muted bg-slate-100 dark:bg-dark-card hover:bg-slate-200 dark:hover:bg-dark-border'}`}
            style={cat === categoryFilter ? { backgroundColor: catColorMap[cat] || '#6366f1' } : {}}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catColorMap[cat] || '#6366f1' }} />
            {cat}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowSocial(!showSocial)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition ${showSocial ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-slate-100 text-purple-800 dark:bg-dark-card dark:text-dark-muted'}`}
          >
            <Globe className="w-3 h-3" />
            Social ({data?.socialPending || 0})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
          {/* Month header */}
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-dark-border">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-border transition">
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>
              <div className="text-center">
                <div className="text-base font-bold text-slate-900 dark:text-dark-text">
                  {MONTHS[month]} {year}
                </div>
                <div className="text-xs text-slate-400">{monthStats.count} posts this month</div>
              </div>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-border transition">
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-slate-100 dark:border-dark-border">
              {DAYS.map(d => (
                <div key={d} className="py-2 text-center text-xs font-medium text-slate-400 dark:text-dark-muted">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                if (day === null) return <div key={`empty-${i}`} className="min-h-[100px] bg-slate-50/50 dark:bg-dark-bg/30" />;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayPosts = getPostsForDay(day);
                const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
                const isSelected = selectedDay === day;
                const isFuture = new Date(year, month, day) > today;

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`min-h-[100px] p-1.5 border-b border-r border-slate-100 dark:border-dark-border cursor-pointer transition relative
                      ${isSelected ? 'bg-brand-50 dark:bg-brand-900/10 ring-1 ring-inset ring-brand-400' : 'hover:bg-slate-50 dark:hover:bg-dark-border'}
                      ${isFuture ? 'opacity-50' : ''}
                    `}
                  >
                    <div className="flex items-center justify-center mb-1">
                      <span className={`text-xs w-6 h-6 rounded-full flex items-center justify-center font-medium
                        ${isToday ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-dark-muted'}
                        ${isSelected && !isToday ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400' : ''}
                      `}>
                        {day}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {dayPosts.slice(0, 3).map(p => (
                        <a
                          key={p.slug}
                          href={`/posts/${p.slug}`}
                          target="_blank"
                          onClick={e => e.stopPropagation()}
                          className="block text-[10px] leading-tight px-1 py-0.5 rounded truncate text-white font-medium hover:opacity-80 transition"
                          style={{ backgroundColor: catColorMap[p.category] || '#6366f1' }}
                          title={p.title}
                        >
                          {p.title}
                        </a>
                      ))}
                      {dayPosts.length === 0 && getSocialForDay(day).length > 0 && (
                        <div className="flex items-center justify-center gap-0.5 mt-1">
                          <Globe className="w-3 h-3 text-purple-400" />
                          <span className="text-[10px] text-purple-400">{getSocialForDay(day).length} social</span>
                        </div>
                      )}
                      {dayPosts.length > 0 && getSocialForDay(day).length > 0 && (
                        <Globe className="w-2.5 h-2.5 text-purple-400 mx-auto" />
                      )}
                      {dayPosts.length > 3 && (
                        <div className="text-[10px] text-slate-400 text-center">+{dayPosts.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar - Selected day posts */}
        <div className="xl:col-span-1">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4 sticky top-6">
            <h2 className="text-xs font-bold text-slate-900 dark:text-dark-text uppercase tracking-wider mb-3">
              {selectedDay
                ? `${MONTHS[month]} ${selectedDay}, ${year}`
                : 'Select a day'}
            </h2>

            {!selectedDay && (
              <p className="text-xs text-slate-400">Click on a day to see published posts.</p>
            )}

            {selectedPosts.length === 0 && selectedDay && (
              <div className="flex flex-col items-center py-6 text-slate-400">
                <FileText className="w-6 h-6 mb-2" />
                <p className="text-xs">No posts published on this day</p>
              </div>
            )}

            {selectedDay && selectedPosts.length === 0 && getSocialForDay(selectedDay).length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 text-xs text-purple-600 mb-2">
                  <Globe className="w-3 h-3" />
                  <span className="font-medium">Scheduled Social Posts</span>
                </div>
                <div className="space-y-1">
                  {getSocialForDay(selectedDay).map(s => (
                    <div key={s.id} className="flex items-center gap-2 text-xs text-purple-800 py-1 px-2 rounded-lg bg-purple-50 dark:bg-purple-900/10">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span className="font-mono">{s.scheduledDate.slice(11, 16)}</span>
                      <span className="text-slate-400">{s.platforms?.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {selectedPosts.map(p => (
                <a
                  key={p.slug}
                  href={`/posts/${p.slug}`}
                  target="_blank"
                  className="block p-2 rounded-lg border border-slate-100 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-border transition group"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catColorMap[p.category] || '#6366f1' }} />
                    <span className="text-[10px] text-slate-500">{p.category}</span>
                  </div>
                  <div className="text-xs font-medium text-slate-900 dark:text-dark-text group-hover:text-brand-600 flex items-start gap-1">
                    {p.title}
                    <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 text-slate-300 group-hover:text-brand-400" />
                  </div>
                  {p.lastUpdated && (
                    <div className="text-[10px] text-slate-400 mt-0.5">Updated: {p.lastUpdated.slice(0, 10)}</div>
                  )}
                </a>
              ))}
            </div>

            {/* Quick stats */}
            {data && (
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-dark-border space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <BarChart3 className="w-3 h-3" />
                  <span>Published: <strong className="text-slate-700 dark:text-dark-text">{data.posts.length}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Globe className="w-3 h-3" />
                  <span>Social scheduled: <strong className="text-amber-600">{data.socialPending}</strong></span>
                </div>
                {data.noDate.length > 0 && (
                  <div className="text-xs text-amber-600">({data.noDate.length} posts without dates)</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
