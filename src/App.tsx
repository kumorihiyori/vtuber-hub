import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  Copy,
  Eye,
  Hash,
  Lightbulb,
  Lock,
  LogOut,
  MessageCircle,
  MessageSquare,
  Plus,
  Search,
  Send,
  Sparkles,
  ThumbsUp,
  TrendingUp,
  Trash2,
  Tv,
  Unlock,
  Users,
  Youtube,
} from 'lucide-react';

type Tab = 'analytics' | 'schedule' | 'ai_advisor' | 'discord';

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

const tabs = [
  { id: 'analytics', label: 'アナリティクス', icon: TrendingUp },
  { id: 'schedule', label: 'スケジュール', icon: Calendar },
  { id: 'ai_advisor', label: 'AIアドバイザー', icon: Sparkles },
  { id: 'discord', label: 'Discord', icon: MessageCircle },
] as const;

const initialEvents = [
  { id: 1, title: '【朝雑談】おはよう雲の上！今週の予定発表', time: '08:00 - 09:30', date: '2026-11-10', category: '雑談', status: '完了', ccv: 1250 },
  { id: 2, title: '【Apex Legends】ランク耐久！ソロダイヤ目指す', time: '21:00 - 24:00', date: '2026-11-11', category: 'ゲーム', status: '予定', ccv: 0 },
  { id: 3, title: '【ASMR】耳かき＆ささやき声でぐっすり睡眠導入', time: '23:00 - 01:00', date: '2026-11-13', category: 'ASMR', status: '予定', ccv: 0 },
  { id: 4, title: '【コラボ】雪城ひなたコラボ！爆笑パーティゲーム', time: '20:00 - 22:00', date: '2026-11-14', category: 'コラボ', status: '予定', ccv: 0 },
];

const initialMarshmallows = [
  { id: 'm1', content: 'ひよりちゃんいつも配信癒やされてます！今後挑戦してみたいゲームや配信企画はありますか？', date: '2026-11-09', read: false },
  { id: 'm2', content: '歌枠でよく歌うアニソン以外に、ボカロ曲の投稿予定はありますか？', date: '2026-11-08', read: true },
];

const initialDiscordServers = [
  { id: 'ds1', name: 'VTuber同業者交流・歌枠連絡会', members: 142, role: 'メンバー', unread: 3, category: '交流・コラボ' },
  { id: 'ds2', name: '大型Apex/FPSコラボ企画鯖', members: 68, role: '演者・コラボ参加者', unread: 0, category: '企画・イベント' },
  { id: 'ds3', name: 'ASMR・音声配信 技術情報交換会', members: 95, role: 'スピーカー', unread: 1, category: '技術・勉強会' },
];

const initialCollabRequests = [
  { id: 'c1', partner: '雪城ひなた (@hinata_v)', server: 'ひより＆雪城ひなた コラボ準備部屋', game: 'Apex Legends', date: '2026-11-14', status: '確定・準備中', discordChannel: '#配信オーバーレイ確認' },
  { id: 'c2', partner: '雨宮ミスト (@mist_amamiya)', server: 'VTuber同業者交流・歌枠連絡会', game: '【歌枠】アニソンデュエットコラボ', date: '2026-11-20', status: '日程調整中', discordChannel: '#DM相談中' },
];

function formatMetric(value: number | null | undefined, fallback = '未取得') {
  if (value == null) return fallback;
  return new Intl.NumberFormat('ja-JP').format(value);
}

export default function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('analytics');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState(initialEvents);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('21:00 - 23:00');
  const [newEventCategory, setNewEventCategory] = useState('雑談');
  const [aiMode, setAiMode] = useState<'channel_audit' | 'marshmallow_reply' | 'discord_dm' | 'title' | 'tweet'>('channel_audit');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponses, setAiResponses] = useState([
    {
      id: 1,
      type: 'channel_audit',
      title: '📜 AIチャンネル改善診断',
      content: 'ASMRと歌枠の安定した同接が強みです。今月はショート動画とコラボで新規追加入門を狙うと効果的です。',
      date: '2026-11-10 17:30',
    },
  ]);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      setLoading(true);
      try {
        const response = await fetch('/api/youtube/overview', { cache: 'no-store' });
        const data = (await response.json()) as Overview & { error?: string };
        if (!response.ok) throw new Error(data.error || 'YouTubeデータの取得に失敗しました。');
        if (!cancelled) setOverview(data);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'YouTubeデータの取得に失敗しました。');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('ログイン状態を確認できません。');
        return (await response.json()) as { authenticated: boolean };
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

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.reload();
  }

  async function handleAiGenerate() {
    setAiLoading(true);
    const basePrompt = (() => {
      if (aiMode === 'channel_audit') {
        return 'あなたはVTuber「曇ひより」専属のデータ分析官・マネージャーAIです。現在のチャンネル状況を踏まえて、今後1ヶ月で登録者数を伸ばす具体的な施策を3つ提案してください。';
      }
      if (aiMode === 'marshmallow_reply') {
        return `ファンからマシュマロで以下の件が届きました: 「${aiPrompt || 'ひよりちゃんが配信で挑戦してみたい企画はありますか？'}」 返信として、親しみやすく温かい語り口で回答案を作ってください。`;
      }
      if (aiMode === 'discord_dm') {
        return `同業者VTuberへのDiscordでのコラボ相談DMを作成してください。相手・内容: 「${aiPrompt || 'Apex Legendsコラボ配信の打診'}」`;
      }
      if (aiMode === 'title') {
        return `テーマ「${aiPrompt || '新作ゲーム配信 または 雑談'}」に関する高CTRなYouTube配信タイトル案を5つ作成してください。`;
      }
      return `配信内容「${aiPrompt || '今夜21時〜 ASMR睡眠導入配信'}」のX（Twitter）告知用ツイート文案を2つ作成してください。ハッシュタグ #曇ひより #ひより生放送 を含めること。`;
    })();

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: basePrompt }),
      });
      const data = (await response.json()) as { text?: string; error?: string };
      if (!response.ok) throw new Error(data.error || 'AI生成に失敗しました。');
      const generated = data.text ?? 'AIからの返答がありませんでした。';
      setAiResponses((current) => [{ id: Date.now(), type: aiMode, title: '📜 AI生成コンテンツ', content: generated, date: new Date().toLocaleString('ja-JP') }, ...current]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AI生成に失敗しました。');
    } finally {
      setAiLoading(false);
    }
  }

  const handleAddEvent = () => {
    if (!newEventTitle || !newEventDate) return;
    setEvents((current) => [{
      id: Date.now(),
      title: newEventTitle,
      time: newEventTime || '21:00 - 23:00',
      date: newEventDate,
      category: newEventCategory,
      status: '予定',
      ccv: 0,
    }, ...current]);
    setNewEventTitle('');
    setNewEventDate('');
    setNewEventTime('21:00 - 23:00');
    setNewEventCategory('雑談');
  };

  const copyToClipboard = async (text: string, id: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (authenticated === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#14110f] text-[#e6dfd5]">
        <div className="rounded-2xl border border-[#3b322c] bg-[#1c1815] px-6 py-5 text-sm text-[#c4b39e]">読み込み中...</div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#14110f] px-4 text-[#e6dfd5]">
        <section className="w-full max-w-md rounded-3xl border border-[#3b322c] bg-[#1c1815] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#8c6d46] to-[#d4b584] text-[#1c1815]">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="font-serif text-2xl font-bold">Creator Salon Hub</h1>
          <p className="mt-3 text-sm text-[#c4b39e]">オーナーのGoogleアカウントでログインしてください。</p>
          {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
          <a href="/api/google/login" className="mt-6 inline-flex rounded-xl bg-[#d4b584] px-5 py-3 font-semibold text-[#14110f]">Googleでログイン</a>
        </section>
      </main>
    );
  }

  const analyticsCards = overview ? [
    { label: 'チャンネル登録者数', value: overview.subscriberCount == null ? '非公開' : `${formatMetric(overview.subscriberCount)}人`, note: 'YouTube 公開統計', icon: Users },
    { label: '総再生回数', value: formatMetric(overview.viewCount), note: 'チャンネル累計', icon: Eye },
    { label: '動画本数', value: formatMetric(overview.videoCount), note: '公開統計', icon: Tv },
    { label: '直近28日間の再生数', value: formatMetric(overview.periodViews), note: `${overview.periodStart}〜${overview.periodEnd}`, icon: TrendingUp },
  ] : [];

  const chartData = overview?.daily ?? [
    { date: 'N/A', views: 0, minutesWatched: 0 },
  ];

  return (
    <div className="min-h-screen bg-[#14110f] text-[#e6dfd5]">
      <header className="sticky top-0 z-10 border-b border-[#3b322c] bg-[#1c1815]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">☁️</span>
            <div>
              <h1 className="font-serif font-bold">曇ひより / Creator Salon Hub</h1>
              <p className="text-xs text-[#a3958a]">{overview?.channelTitle ?? 'YouTube Analytics'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 rounded-lg border border-[#5c4937] bg-[#2b221b] px-3 py-2 text-sm text-[#d4b584]">
            <LogOut className="h-4 w-4" />ログアウト
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-[#3b322c] bg-[#1c1815] p-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${activeTab === id ? 'bg-[#d4b584] text-[#14110f]' : 'text-[#c4b39e]'}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        {error && (
          <section className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">
            {error}
          </section>
        )}

        {activeTab === 'analytics' && (
          <section className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {analyticsCards.length ? analyticsCards.map(({ label, value, note, icon: Icon }) => (
                <article key={label} className="rounded-2xl border border-[#3b322c] bg-[#1c1815] p-5">
                  <div className="flex items-center justify-between text-sm text-[#a3958a]">
                    <span>{label}</span>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="mt-3 text-2xl font-bold">{value}</div>
                  <p className="mt-1 text-xs text-[#c4b39e]">{note}</p>
                </article>
              )) : (
                <div className="col-span-full rounded-2xl border border-[#3b322c] bg-[#1c1815] p-5 text-sm text-[#a3958a]">{loading ? 'データ取得中...' : 'YouTubeデータが取得できていません。'}</div>
              )}
            </div>

            <div className="rounded-2xl border border-[#3b322c] bg-[#1c1815] p-5">
              <h2 className="font-serif text-lg font-semibold">日別再生数</h2>
              <p className="mb-4 text-xs text-[#a3958a]">{overview ? `${overview.periodStart}〜${overview.periodEnd}` : '直近28日間'}</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d4b584" stopOpacity={0.55} />
                        <stop offset="95%" stopColor="#d4b584" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#3b322c" />
                    <XAxis dataKey="date" stroke="#a3958a" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#a3958a" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1c1815', border: '1px solid #3b322c' }} />
                    <Area type="monotone" dataKey="views" stroke="#d4b584" fill="url(#viewsFill)" name="再生数" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'schedule' && (
          <section className="grid gap-5 lg:grid-cols-3">
            <form className="space-y-4 rounded-2xl border border-[#3b322c] bg-[#1c1815] p-5" onSubmit={(e) => { e.preventDefault(); handleAddEvent(); }}>
              <h2 className="font-serif text-lg font-bold">配信予定を追加</h2>
              <div className="space-y-2">
                <label className="block text-xs text-[#a3958a]">タイトル</label>
                <input value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} className="w-full rounded-xl border border-[#3b322c] bg-[#201c1a] px-3 py-2 text-sm outline-none" placeholder="例: 夜会話＋ASMR" />
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-[#a3958a]">日付</label>
                <input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} className="w-full rounded-xl border border-[#3b322c] bg-[#201c1a] px-3 py-2 text-sm outline-none" />
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-[#a3958a]">時間</label>
                <input value={newEventTime} onChange={(e) => setNewEventTime(e.target.value)} className="w-full rounded-xl border border-[#3b322c] bg-[#201c1a] px-3 py-2 text-sm outline-none" />
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-[#a3958a]">カテゴリ</label>
                <select value={newEventCategory} onChange={(e) => setNewEventCategory(e.target.value)} className="w-full rounded-xl border border-[#3b322c] bg-[#201c1a] px-3 py-2 text-sm outline-none">
                  <option value="雑談">雑談</option>
                  <option value="ゲーム">ゲーム</option>
                  <option value="ASMR">ASMR</option>
                  <option value="歌枠">歌枠</option>
                  <option value="コラボ">コラボ</option>
                </select>
              </div>
              <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#d4b584] px-4 py-2 font-semibold text-[#14110f]">
                <Plus className="h-4 w-4" />追加する
              </button>
            </form>

            <div className="space-y-3 lg:col-span-2 rounded-2xl border border-[#3b322c] bg-[#1c1815] p-5">
              <h2 className="font-serif text-lg font-semibold">配信スケジュール</h2>
              {events.map((event) => (
                <article key={event.id} className="flex flex-col gap-2 rounded-2xl border border-[#3b322c] bg-[#201c1a] p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-[#f1e7dc]">{event.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#a3958a]">
                      <span>{event.date}</span>
                      <span>•</span>
                      <span>{event.time}</span>
                      <span>•</span>
                      <span>{event.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[#5c4937] bg-[#2b221b] px-2 py-1 text-[10px] text-[#d4b584]">{event.status}</span>
                    <span className="text-xs text-[#c4b39e]">同接 {event.ccv || 0}人</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'ai_advisor' && (
          <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-[#3b322c] bg-[#1c1815] p-5">
              <h2 className="font-serif text-lg font-semibold">AIアドバイザー</h2>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {(['channel_audit', 'marshmallow_reply', 'discord_dm', 'title', 'tweet'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setAiMode(mode)}
                    className={`rounded-full border px-3 py-1.5 ${aiMode === mode ? 'border-[#d4b584] bg-[#2b221b] text-[#d4b584]' : 'border-[#3b322c] text-[#c4b39e]'}`}
                  >
                    {mode === 'channel_audit' ? 'チャンネル診断' : mode === 'marshmallow_reply' ? 'マシュマロ回答' : mode === 'discord_dm' ? 'DM相談' : mode === 'title' ? 'タイトル案' : 'X告知'}
                  </button>
                ))}
              </div>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="mt-4 min-h-[140px] w-full rounded-xl border border-[#3b322c] bg-[#201c1a] p-3 text-sm outline-none"
                placeholder="AIに相談したい内容を入力してください..."
              />
              <button onClick={handleAiGenerate} disabled={aiLoading} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#d4b584] px-4 py-2 font-semibold text-[#14110f] disabled:opacity-60">
                <Sparkles className="h-4 w-4" />
                {aiLoading ? '生成中...' : '生成する'}
              </button>
            </div>

            <div className="space-y-3 rounded-2xl border border-[#3b322c] bg-[#1c1815] p-5">
              <h3 className="font-serif text-lg font-semibold">生成履歴</h3>
              {aiResponses.map((item) => (
                <article key={item.id} className="rounded-2xl border border-[#3b322c] bg-[#201c1a] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#f1e7dc]">{item.title}</p>
                    <button onClick={() => copyToClipboard(item.content, item.id)} className="inline-flex items-center gap-1 rounded-lg border border-[#5c4937] px-2 py-1 text-[10px] text-[#d4b584]">
                      {copiedId === item.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} コピー
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-[#a3958a]">{item.date}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#e6dfd5]">{item.content}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'discord' && (
          <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3 rounded-2xl border border-[#3b322c] bg-[#1c1815] p-5">
              <h2 className="font-serif text-lg font-semibold">Discord連携</h2>
              {initialDiscordServers.map((server) => (
                <article key={server.id} className="rounded-2xl border border-[#3b322c] bg-[#201c1a] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#f1e7dc]">{server.name}</p>
                      <p className="text-xs text-[#a3958a]">{server.category}</p>
                    </div>
                    <span className="rounded-full border border-[#5c4937] bg-[#2b221b] px-2 py-1 text-[10px] text-[#d4b584]">{server.role}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-[#c4b39e]">
                    <span>{server.members} members</span>
                    <span>{server.unread} unread</span>
                  </div>
                </article>
              ))}
            </div>

            <div className="space-y-3 rounded-2xl border border-[#3b322c] bg-[#1c1815] p-5">
              <h2 className="font-serif text-lg font-semibold">コラボ打診</h2>
              {initialCollabRequests.map((item) => (
                <article key={item.id} className="rounded-2xl border border-[#3b322c] bg-[#201c1a] p-4">
                  <p className="font-semibold text-[#f1e7dc]">{item.partner}</p>
                  <div className="mt-2 space-y-1 text-xs text-[#a3958a]">
                    <p>サーバー: {item.server}</p>
                    <p>ゲーム: {item.game}</p>
                    <p>日付: {item.date}</p>
                    <p>ステータス: {item.status}</p>
                    <p>チャンネル: {item.discordChannel}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <footer className="pb-6 text-center text-xs text-[#807265]">
          この画面は Google OAuth で本人認証済みのオーナー向けです。YouTube 実データとAI生成APIはサーバー側で保護されています。
        </footer>
      </main>
    </div>
  );
}
