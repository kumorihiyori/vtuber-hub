import { useState, type FormEvent } from 'react';
import { CalendarDays, BarChart3, Sparkles, Search, Users, Eye, Radio, CircleDollarSign, Plus, ExternalLink, Youtube } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { generateGeminiText } from './lib/gemini';

const analytics = [
  { name: '10/01', subs: 51200 }, { name: '10/08', subs: 51800 },
  { name: '10/15', subs: 52400 }, { name: '10/22', subs: 53100 },
  { name: '10/29', subs: 53800 }, { name: '11/05', subs: 54400 },
];
const initialEvents = [
  { title: '【朝雑談】おはよう雲の上！今週の予定発表', date: '2026-11-10', time: '08:00 - 09:30', category: '雑談', status: '完了' },
  { title: '【Apex Legends】ランク耐久！ソロダイヤ目指す', date: '2026-11-11', time: '21:00 - 24:00', category: 'ゲーム', status: '予定' },
  { title: '【ASMR】耳かき＆ささやき声でぐっすり睡眠導入', date: '2026-11-13', time: '23:00 - 01:00', category: 'ASMR', status: '予定' },
];
const tabs = [
  { id: 'analytics', label: 'アナリティクス', icon: BarChart3 },
  { id: 'schedule', label: 'スケジュール', icon: CalendarDays },
  { id: 'ai', label: 'AIアシスタント', icon: Sparkles },
  { id: 'community', label: 'コミュニティ', icon: Users },
] as const;
type Tab = typeof tabs[number]['id'];
type Event = typeof initialEvents[number];

export default function VtuberHub() {
  const [tab, setTab] = useState<Tab>('analytics');
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  function addEvent(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setEvents([...events, { title: title.trim(), date, time: '21:00 - 23:00', category: '配信', status: '予定' }]);
    setTitle('');
  }

  async function onGenerateAI() {
    if (!prompt.trim()) {
      setAnswer('先に内容を入力してください。');
      return;
    }

    setIsGenerating(true);
    setAnswer('Geminiが文章を作成しています…');
    try {
      const text = await generateGeminiText(
        `あなたはVTuberの運営アシスタントです。以下のテーマについて、親しみやすく魅力的な文章を日本語で作成してください。\n\nテーマ: ${prompt.trim()}`,
      );
      setAnswer(text);
    } catch (error) {
      setAnswer(error instanceof Error ? error.message : 'AI生成に失敗しました。');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#14110f] text-[#e6dfd5]">
      <header className="sticky top-0 z-10 border-b border-[#3b322c] bg-[#1c1815]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3"><span className="text-2xl">☁️</span><div><h1 className="font-serif font-bold">曇ひより / Creator Salon Hub</h1><p className="text-xs text-[#a39585]">VTuber 活動管理ダッシュボード</p></div></div>
          <span className="rounded-full border border-[#5c4937] bg-[#2b221b] px-3 py-1 text-[10px] text-[#d4b584]">サンプルデータ</span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-[#3b322c] bg-[#1c1815] p-2">
          {tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === id ? 'bg-[#8c6d46] text-[#14110f]' : 'text-[#a39585] hover:bg-[#2b2420]'}`}><Icon size={16}/>{label}</button>)}
        </nav>

        {tab === 'analytics' && <section className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'チャンネル登録者数', value: '5.4万人', note: '+1,200 (今月)', icon: Users },
              { label: '月間総再生回数', value: '184万回', note: '+18.4%', icon: Eye },
              { label: '平均同時接続者数', value: '1,450人', note: '最高 3,200人', icon: Radio },
              { label: '平均スパチャ収益', value: '￥42,000', note: '1配信あたり', icon: CircleDollarSign },
            ].map(({ label, value, note, icon: Icon }) => <div key={label} className="rounded-2xl border border-[#3b322c] bg-[#1c1815] p-5"><div className="flex justify-between text-sm text-[#a39585]"><span>{label}</span><Icon size={17} className="text-[#d4b584]"/></div><p className="mt-3 font-serif text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-[#8cb07d]">{note}</p></div>)}
          </div>
          <div className="rounded-2xl border border-[#3b322c] bg-[#1c1815] p-5"><h2 className="font-serif font-semibold">チャンネル登録者数の推移</h2><p className="mb-4 text-xs text-[#a39585]">直近6週間・サンプルデータ</p><div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={analytics}><defs><linearGradient id="subs" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#c8a573" stopOpacity={0.4}/><stop offset="95%" stopColor="#c8a573" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#2e2723" strokeDasharray="3 3"/><XAxis dataKey="name" stroke="#807265"/><YAxis stroke="#807265" domain={['dataMin - 1000', 'dataMax + 1000']}/><Tooltip contentStyle={{ background: '#14110f', borderColor: '#3b322c', borderRadius: 12 }}/><Area type="monotone" dataKey="subs" name="登録者数" stroke="#c8a573" fill="url(#subs)"/></AreaChart></ResponsiveContainer></div></div>
        </section>}

        {tab === 'schedule' && <section className="grid gap-5 lg:grid-cols-3">
          <form onSubmit={addEvent} className="space-y-3 rounded-2xl border border-[#3b322c] bg-[#1c1815] p-5"><h2 className="font-serif font-bold">配信予定を追加</h2><label className="block text-xs text-[#c4b5a5]">タイトル<input value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 w-full rounded-lg border border-[#3b322c] bg-[#120f0d] p-3 text-sm text-white" placeholder="配信タイトル"/></label><label className="block text-xs text-[#c4b5a5]">日付<input type="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 w-full rounded-lg border border-[#3b322c] bg-[#120f0d] p-3 text-sm text-white"/></label><button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#a66363] p-3 text-sm font-bold text-[#14110f]"><Plus size={16}/>予定を追加</button></form>
          <div className="space-y-3 lg:col-span-2"><h2 className="font-serif font-semibold">配信スケジュール</h2>{events.map((event, i) => <article key={`${event.date}-${i}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#3b322c] bg-[#1c1815] p-4"><div><h3 className="text-sm font-bold">{event.title}</h3><p className="mt-2 text-xs text-[#a39585]">📅 {event.date}　⏰ {event.time}　・{event.category}</p></div><span className="rounded-full border border-[#4d4023] bg-[#2b2518] px-3 py-1 text-xs text-[#d4a859]">{event.status}</span></article>)}</div>
        </section>}

        {tab === 'ai' && <section className="grid gap-5 lg:grid-cols-3"><div className="space-y-3 rounded-2xl border border-[#3b322c] bg-[#1c1815] p-5"><h2 className="flex items-center gap-2 font-serif font-bold"><Sparkles size={18} className="text-[#d4b584]"/>AIアシスタント</h2><p className="text-xs leading-5 text-[#a39585]">企画や告知文の下書きをGeminiで生成します。</p><textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={5} className="w-full rounded-xl border border-[#3b322c] bg-[#120f0d] p-3 text-sm" placeholder="例：今夜のASMR配信の告知文を考えて"/><button onClick={onGenerateAI} disabled={isGenerating} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8c6d46] p-3 text-sm font-bold text-[#14110f] disabled:opacity-60"><Sparkles size={16}/>{isGenerating ? '生成中...' : '下書きを生成'}</button></div><div className="rounded-2xl border border-[#3b322c] bg-[#1c1815] p-5 lg:col-span-2"><h2 className="font-serif font-bold">下書き</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#d8cfc4]">{answer || '入力した内容の下書きがここに表示されます。'}</p></div></section>}

        {tab === 'community' && <section className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-[#3b322c] bg-[#1c1815] p-5"><h2 className="flex items-center gap-2 font-serif font-bold"><Search size={17}/>エゴサ・コミュニティ</h2><p className="mt-3 text-sm text-[#a39585]">監視キーワード: #曇ひより、#曇ひより見ろ、#くもりあ</p><div className="mt-4 rounded-xl bg-[#120f0d] p-4 text-sm">ファン投稿や質問をここにまとめるためのスペースです。外部SNSとの自動連携は未設定です。</div></div><div className="rounded-2xl border border-[#3b322c] bg-[#1c1815] p-5"><h2 className="flex items-center gap-2 font-serif font-bold"><Youtube size={17}/>外部サービス</h2><p className="mt-3 text-sm text-[#a39585]">YouTube、Discord、マシュマロなどのリンクを追加できます。</p><a href="https://marshmallow-qa.com/" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#3b322c] px-3 py-2 text-sm text-[#d4b584] hover:bg-[#2b2420]">マシュマロを開く <ExternalLink size={14}/></a></div></section>}
        <p className="text-center text-xs text-[#807265]">このページの数値・投稿は表示確認用のサンプルです。実際のYouTube/SNSデータとは連携していません。</p>
      </main>
    </div>
  );
}
