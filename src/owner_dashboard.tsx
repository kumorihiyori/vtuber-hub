import { useEffect, useState } from 'react';
import { BarChart3, Eye, LogOut, Users, Video, Youtube } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Overview = {
  channelTitle: string;
  subscriberCount: number | null;
  viewCount: number;
  videoCount: number;
  periodStart: string;
  periodEnd: string;
  periodViews: number;
  periodMinutesWatched: number;
  daily: Array<{ date: string; views: number; minutesWatched: number }>;
};

function number(value: number | null | undefined) {
  return value == null ? '非公開' : new Intl.NumberFormat('ja-JP').format(value);
}

export default function OwnerDashboard() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      setLoading(true);
      try {
        const response = await fetch('/api/youtube/overview', { cache: 'no-store' });
        const data = await response.json() as Overview & { error?: string };
        if (!response.ok) throw new Error(data.error || 'YouTubeデータを取得できませんでした。');
        if (!cancelled) setOverview(data);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'YouTubeデータを取得できませんでした。');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('ログイン状態を確認できません。');
        return response.json() as Promise<{ authenticated: boolean }>;
      })
      .then((data) => {
        if (cancelled) return;
        setAuthenticated(data.authenticated);
        if (data.authenticated) void loadOverview();
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setAuthenticated(false);
          setError(cause instanceof Error ? cause.message : 'ログイン状態を確認できません。');
        }
      });

    return () => { cancelled = true; };
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.reload();
  }

  if (authenticated === null) {
    return <main className="flex min-h-screen items-center justify-center bg-[#14110f] text-[#e6dfd5]">読み込み中...</main>;
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#14110f] px-4 text-[#e6dfd5]">
        <section className="w-full max-w-md rounded-2xl border border-[#3b322c] bg-[#1c1815] p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#2b221b] text-[#d4b584]"><Youtube /></div>
          <h1 className="font-serif text-2xl font-bold">Creator Salon Hub</h1>
          <p className="mt-3 text-sm text-[#c4b39e]">オーナーのGoogleアカウントでログインしてください。</p>
          {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
          <a href="/api/google/login" className="mt-6 inline-flex rounded-xl bg-[#d4b584] px-5 py-3 font-semibold text-[#14110f]">Googleでログイン</a>
        </section>
      </main>
    );
  }

  const cards = overview ? [
    { label: 'チャンネル登録者数', value: number(overview.subscriberCount), note: 'YouTubeの公開統計', icon: Users },
    { label: 'チャンネル総再生数', value: number(overview.viewCount), note: '公開統計の累計', icon: Eye },
    { label: '動画本数', value: number(overview.videoCount), note: '公開統計', icon: Video },
    { label: '直近28日間の再生数', value: number(overview.periodViews), note: `${overview.periodStart} 〜 ${overview.periodEnd}`, icon: BarChart3 },
  ] : [];

  return (
    <div className="min-h-screen bg-[#14110f] text-[#e6dfd5]">
      <header className="sticky top-0 z-10 border-b border-[#3b322c] bg-[#1c1815]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3"><span className="text-2xl">☁️</span><div><h1 className="font-serif font-bold">曇ひより / Creator Salon Hub</h1><p className="text-xs text-[#a3958a]">{overview?.channelTitle ?? 'YouTube Analytics'}</p></div></div>
          <button onClick={logout} className="flex items-center gap-2 rounded-lg border border-[#5c4937] px-3 py-2 text-sm text-[#d4b584]"><LogOut className="h-4 w-4" />ログアウト</button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section className="rounded-2xl border border-[#3b322c] bg-[#1c1815] p-5">
          <h2 className="font-serif text-lg font-semibold">YouTube アナリティクス</h2>
          <p className="mt-1 text-xs text-[#a3958a]">YouTube APIから取得した実データです。直近28日間の指標は反映に遅れが生じることがあります。</p>
        </section>
        {loading && <p className="text-sm text-[#c4b39e]">YouTubeデータを読み込んでいます...</p>}
        {error && <section role="alert" className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">{error}<div><a className="mt-3 inline-block underline" href="/api/google/login">Google連携をやり直す</a></div></section>}
        {overview && <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ label, value, note, icon: Icon }) => <article key={label} className="rounded-2xl border border-[#3b322c] bg-[#1c1815] p-5"><div className="flex justify-between text-sm text-[#a3958a]"><span>{label}</span><Icon className="h-4 w-4" /></div><div className="mt-3 break-words text-2xl font-bold">{value}</div><p className="mt-1 text-xs text-[#c4b39e]">{note}</p></article>)}
          </section>
          <section className="rounded-2xl border border-[#3b322c] bg-[#1c1815] p-5">
            <h2 className="font-serif font-semibold">日別再生数</h2>
            <p className="mb-4 text-xs text-[#a3958a]">{overview.periodStart} 〜 {overview.periodEnd}</p>
            {overview.daily.length ? <div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={overview.daily}><CartesianGrid stroke="#3b322c" /><XAxis dataKey="date" stroke="#a3958a" tick={{ fontSize: 11 }} /><YAxis stroke="#a3958a" tick={{ fontSize: 11 }} /><Tooltip contentStyle={{ background: '#1c1815', border: '1px solid #3b322c' }} /><Area type="monotone" dataKey="views" name="再生数" stroke="#d4b584" fill="#d4b584" fillOpacity={0.2} /></AreaChart></ResponsiveContainer></div> : <p className="py-12 text-center text-sm text-[#a3958a]">この期間のアナリティクスデータはありません。</p>}
            <p className="mt-4 text-sm text-[#c4b39e]">直近28日間の総再生時間: {number(Math.round(overview.periodMinutesWatched / 60))} 時間</p>
          </section>
        </>}
        {!loading && !overview && !error && <p className="text-sm text-[#a3958a]">データがありません。</p>}
        <p className="text-center text-xs text-[#807265]">データはGoogle / YouTubeから取得し、サンプル値は表示していません。</p>
      </main>
    </div>
  );
}
