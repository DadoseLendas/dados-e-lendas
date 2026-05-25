"use client";
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/ui/navbar';
import Footer from '@/app/components/ui/footer';
import { ChevronLeft, Sword, Crown, Keyboard, MessageSquare, Dice1, Map, BookOpen, Users, Shield, Ruler, Eye } from 'lucide-react';

type Section = {
  id: string;
  icon: React.ReactNode;
  label: string;
};

const sections: Section[] = [
  { id: 'visao-geral',  icon: <Eye size={14} />,           label: 'Visão Geral' },
  { id: 'jogador',      icon: <Sword size={14} />,         label: 'Para Jogadores' },
  { id: 'mestre',       icon: <Crown size={14} />,         label: 'Para Mestres' },
  { id: 'mesa',         icon: <Map size={14} />,           label: 'Mesa Virtual' },
  { id: 'atalhos',      icon: <Keyboard size={14} />,      label: 'Atalhos de Teclado' },
  { id: 'dados',        icon: <Dice1 size={14} />,         label: 'Rolagem de Dados' },
  { id: 'chat',         icon: <MessageSquare size={14} />, label: 'Chat & Comandos' },
];

function SectionTitle({ id, icon, title, subtitle }: { id: string; icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div id={id} className="mb-8 scroll-mt-24">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-[#00ff66]">{icon}</span>
        <h2 className="text-[#f1e5ac] text-2xl font-serif italic uppercase tracking-wide">{title}</h2>
      </div>
      <div className="w-16 h-0.5 bg-[#00ff66]/40 mb-3" />
      {subtitle && <p className="text-[#6a7a6a] text-sm leading-relaxed">{subtitle}</p>}
    </div>
  );
}

function Card({ title, children, accent = '#00ff66' }: { title?: string; children: React.ReactNode; accent?: string }) {
  return (
    <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-xl p-5 hover:border-[#00ff66]/20 transition-all">
      {title && <h3 className="font-black uppercase text-[12px] tracking-widest mb-3" style={{ color: accent }}>{title}</h3>}
      {children}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center bg-[#0f1f0f] border border-[#2a3a2a] text-[#00ff66] font-black text-[11px] uppercase px-2.5 py-1 rounded-md shadow-[0_2px_0_#1a2a1a] tracking-wider min-w-[32px]">
      {children}
    </kbd>
  );
}

function ShortcutRow({ keys, label, note }: { keys: React.ReactNode[]; label: string; note?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#1a2a1a]/60 last:border-0">
      <div>
        <span className="text-[13px] text-gray-300">{label}</span>
        {note && <span className="ml-2 text-[10px] text-[#4a5a4a] uppercase tracking-wider">{note}</span>}
      </div>
      <div className="flex items-center gap-1">
        {keys.map((k, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-[#2a3a2a] text-[10px] font-black">+</span>}
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <code className="block bg-black/60 border border-[#1a2a1a] rounded-lg px-4 py-2.5 text-[#00ff66] font-mono text-[13px] tracking-wide">
      {children}
    </code>
  );
}

export default function TutorialPage() {
  const router = useRouter();

  return (
    <main className="bg-[#050a05] text-white min-h-screen flex flex-col font-sans overflow-x-hidden">
      <Navbar />

      <div className="flex-grow w-full max-w-[1200px] mx-auto py-16 px-6 flex gap-10">

        <aside className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-24 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3a4a3a] mb-4">Conteúdo</p>
            {sections.map(s => (
              <a key={s.id} href={`#${s.id}`} className="flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-wider text-[#4a5a4a] hover:text-[#00ff66] transition-colors py-1.5 px-2 rounded-lg hover:bg-[#00ff66]/5">
                <span className="text-[#2a4a2a]">{s.icon}</span>
                {s.label}
              </a>
            ))}
          </div>
        </aside>

        <div className="flex-1 max-w-[780px]">

          <button onClick={() => router.push('/')} className="group flex items-center gap-2 text-[#00ff66] mb-12 hover:text-[#f1e5ac] transition-all uppercase text-[10px] font-black tracking-[0.4em]">
            <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            Voltar
          </button>

          <header className="mb-16">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen size={15} className="text-[#00ff66]" />
              <span className="text-[#00ff66] text-[10px] font-black tracking-[0.5em] uppercase">Guia Completo</span>
            </div>
            <h1 className="text-[#f1e5ac] text-5xl md:text-6xl font-serif italic uppercase mb-5 tracking-tighter leading-tight">
              Como Jogar
            </h1>
            <div className="w-20 h-1 bg-[#00ff66] shadow-[0_0_12px_#00ff66] mb-7" />
            <p className="text-[#6a7a6a] text-lg leading-relaxed font-serif italic max-w-2xl">
              Tudo que você precisa saber para jogar D&amp;D 5e na plataforma, de jogadores iniciantes a mestres experientes!
            </p>
          </header>

          {/* VISÃO GERAL */}
          <section className="mb-16">
            <SectionTitle id="visao-geral" icon={<Eye size={18} />} title="Visão Geral" subtitle="Dados e Lendas é uma mesa virtual completa para D&D 5e. Você pode ser um Jogador, controlando seu personagem, ou um Mestre, criando e conduzindo a aventura." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card title="Jogador" accent="#00ff66">
                <ul className="space-y-2 text-[13px] text-[#8a9a8a]">
                  <li className="flex items-start gap-2"><span className="text-[#00ff66] mt-0.5">→</span>Crie e gerencie seus personagens em <strong className="text-gray-300">Personagens</strong></li>
                  <li className="flex items-start gap-2"><span className="text-[#00ff66] mt-0.5">→</span>Entre em campanhas com o código do Mestre</li>
                  <li className="flex items-start gap-2"><span className="text-[#00ff66] mt-0.5">→</span>Role dados, use habilidades e interaja no chat</li>
                  <li className="flex items-start gap-2"><span className="text-[#00ff66] mt-0.5">→</span>Mova seu token no mapa em tempo real</li>
                </ul>
              </Card>
              <Card title="Mestre" accent="#f1e5ac">
                <ul className="space-y-2 text-[13px] text-[#8a9a8a]">
                  <li className="flex items-start gap-2"><span className="text-[#f1e5ac] mt-0.5">→</span>Crie campanhas em <strong className="text-gray-300">Campanhas</strong></li>
                  <li className="flex items-start gap-2"><span className="text-[#f1e5ac] mt-0.5">→</span>Faça upload de mapas e gerencie tokens</li>
                  <li className="flex items-start gap-2"><span className="text-[#f1e5ac] mt-0.5">→</span>Role dados secretos que só você vê</li>
                  <li className="flex items-start gap-2"><span className="text-[#f1e5ac] mt-0.5">→</span>Controle iniciativa, monstros e NPCs</li>
                </ul>
              </Card>
            </div>
          </section>

          {/* PARA JOGADORES */}
          <section className="mb-16">
            <SectionTitle id="jogador" icon={<Sword size={18} />} title="Para Jogadores" />
            <div className="space-y-4">
              <Card title="1. Criando seu Personagem">
                <p className="text-[13px] text-[#8a9a8a] mb-3">Vá até <strong className="text-gray-300">Personagens</strong> no menu e clique em <strong className="text-[#00ff66]">Criar Novo</strong>. Você terá acesso a três abas:</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { t: 'Ficha', d: 'Atributos, classe, raça, HP, salvaguardas e perícias.' },
                    { t: 'Grimório', d: 'Magias conhecidas, slots por nível e detalhes de cada magia.' },
                    { t: 'Inventário', d: 'Armas, armaduras, consumíveis, itens e dinheiro (PL/PO/PP/PC).' },
                  ].map(item => (
                    <div key={item.t} className="bg-black/40 border border-[#1a2a1a] rounded-lg p-3">
                      <p className="text-[#00ff66] text-[11px] font-black uppercase tracking-wider mb-1">{item.t}</p>
                      <p className="text-[11px] text-[#5a6a5a] leading-relaxed">{item.d}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="2. Entrando numa Campanha">
                <p className="text-[13px] text-[#8a9a8a]">O Mestre compartilha um código ou link da campanha. Em <strong className="text-gray-300">Campanhas</strong>, clique em <strong className="text-[#00ff66]">Entrar</strong> e insira o código. Após entrar, selecione o personagem que usará nessa campanha.</p>
              </Card>

              <Card title="3. Dentro da Mesa">
                <p className="text-[13px] text-[#8a9a8a] mb-3">Na mesa de jogo você pode:</p>
                <ul className="space-y-1.5 text-[13px] text-[#8a9a8a]">
                  <li className="flex items-start gap-2"><span className="text-[#00ff66]">→</span>Mover seu token no mapa com <strong className="text-gray-300">WASD</strong> ou clicando e arrastando</li>
                  <li className="flex items-start gap-2"><span className="text-[#00ff66]">→</span>Abrir sua ficha com <Kbd>F</Kbd> ou clicando no ícone lateral</li>
                  <li className="flex items-start gap-2"><span className="text-[#00ff66]">→</span>Abrir o grimório com <Kbd>G</Kbd></li>
                  <li className="flex items-start gap-2"><span className="text-[#00ff66]">→</span>Rolar dados pelos botões do chat ou pelo comando <code className="text-[#00ff66] bg-black/40 px-1.5 py-0.5 rounded text-[11px]">/r</code></li>
                  <li className="flex items-start gap-2"><span className="text-[#00ff66]">→</span>Clicar em atributos e perícias na ficha para rolar com vantagem/desvantagem</li>
                </ul>
              </Card>

              <Card title="4. Sistema de Dinheiro">
                <p className="text-[13px] text-[#8a9a8a] mb-3">O dinheiro fica na aba Inventário. As moedas seguem a tabela oficial do D&D 5e:</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { c: 'PC', n: 'Cobre',   v: 'menor unidade', color: 'text-[#e07020]', border: 'border-[#e07020]/30' },
                    { c: 'PP', n: 'Prata',   v: '10 PC = 1 PP',  color: 'text-[#c0c8d8]', border: 'border-[#c0c8d8]/30' },
                    { c: 'PO', n: 'Ouro',    v: '10 PP = 1 PO',  color: 'text-[#ffd700]', border: 'border-[#ffd700]/30' },
                    { c: 'PL', n: 'Platina', v: '10 PO = 1 PL',  color: 'text-[#e8e8ff]', border: 'border-[#e8e8ff]/30' },
                  ].map(m => (
                    <div key={m.c} className={`border rounded-lg p-2.5 text-center ${m.border}`}>
                      <p className={`text-base font-black ${m.color}`}>{m.c}</p>
                      <p className={`text-[10px] font-black uppercase ${m.color} opacity-70`}>{m.n}</p>
                      <p className="text-[9px] text-[#3a4a3a] mt-1">{m.v}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </section>

          {/* PARA MESTRES */}
          <section className="mb-16">
            <SectionTitle id="mestre" icon={<Crown size={18} />} title="Para Mestres" subtitle="Como Mestre você tem acesso a ferramentas exclusivas: upload de mapas, criação de tokens, gerenciamento de monstros e rolagens secretas." />
            <div className="space-y-4">
              <Card title="Criando uma Campanha">
                <p className="text-[13px] text-[#8a9a8a]">Vá em <strong className="text-gray-300">Campanhas → Criar Nova</strong>. Defina nome, imagem de capa e descrição. Após criar, compartilhe o código da campanha com seus jogadores.</p>
              </Card>
              <Card title="Gerenciando o Mapa">
                <ul className="space-y-1.5 text-[13px] text-[#8a9a8a]">
                  <li className="flex items-start gap-2"><span className="text-[#f1e5ac]">→</span>Clique em <strong className="text-gray-300">Editor de Mapa</strong> para fazer upload de imagem de fundo</li>
                  <li className="flex items-start gap-2"><span className="text-[#f1e5ac]">→</span>Ajuste o tamanho da grade (padrão: 5 pés por quadrado)</li>
                  <li className="flex items-start gap-2"><span className="text-[#f1e5ac]">→</span>Personalize cor, opacidade, espessura e estilo da grade</li>
                  <li className="flex items-start gap-2"><span className="text-[#f1e5ac]">→</span>Use zoom com scroll do mouse e arraste o mapa com clique + arrastar</li>
                </ul>
              </Card>
              <Card title="Gerenciando Tokens">
                <ul className="space-y-1.5 text-[13px] text-[#8a9a8a]">
                  <li className="flex items-start gap-2"><span className="text-[#f1e5ac]">→</span>Abra a <strong className="text-gray-300">Biblioteca de Tokens</strong> para adicionar monstros e NPCs</li>
                  <li className="flex items-start gap-2"><span className="text-[#f1e5ac]">→</span>Arraste tokens para o mapa ou posicione com clique</li>
                  <li className="flex items-start gap-2"><span className="text-[#f1e5ac]">→</span>Clique duplo em um token para abrir sua ficha de monstro</li>
                  <li className="flex items-start gap-2"><span className="text-[#f1e5ac]">→</span>Delete tokens pressionando <Kbd>Del</Kbd></li>
                </ul>
              </Card>
              <Card title="Rolagens Secretas">
                <p className="text-[13px] text-[#8a9a8a]">Com o toggle <strong className="text-[#f1e5ac]">Secreto</strong> ativado, apenas você (Mestre) vê o resultado. Os jogadores veem somente que uma rolagem secreta foi feita.</p>
              </Card>
            </div>
          </section>

          {/* MESA VIRTUAL */}
          <section className="mb-16">
            <SectionTitle id="mesa" icon={<Map size={18} />} title="Mesa Virtual" subtitle="A mesa é o coração do jogo. Tudo acontece em tempo real — todos os jogadores e o Mestre veem as mesmas mudanças instantaneamente." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: <Map size={15} />,    t: 'Mapa',    d: 'Mapa de fundo com grade personalizável. Faça zoom com scroll e navegue arrastando com o botão do mouse.' },
                { icon: <Users size={15} />,  t: 'Tokens',  d: 'Representações visuais de personagens e criaturas. Cada jogador controla o próprio token.' },
                { icon: <Shield size={15} />, t: 'Fichas',  d: 'Abra a ficha do seu personagem sem sair da mesa. Atualizações de HP são salvas em tempo real.' },
                { icon: <Ruler size={15} />,    t: 'Régua',   d: 'Meça distâncias no mapa em pés e metros. Ative na barra inferior e clique+arraste para medir.' },
              ].map(item => (
                <Card key={item.t}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[#00ff66]">{item.icon}</span>
                    <h3 className="font-black uppercase text-[12px] tracking-widest text-[#00ff66]">{item.t}</h3>
                  </div>
                  <p className="text-[13px] text-[#6a7a6a] leading-relaxed">{item.d}</p>
                </Card>
              ))}
            </div>
          </section>

          {/* ATALHOS DE TECLADO */}
          <section className="mb-16">
            <SectionTitle id="atalhos" icon={<Keyboard size={18} />} title="Atalhos de Teclado" subtitle="Atalhos funcionam dentro da mesa de campanha quando você não está digitando em um campo de texto." />
            <div className="space-y-4">
              <Card title="Movimento do Token">
                <ShortcutRow keys={[<Kbd key="w">W</Kbd>, <Kbd key="a">A</Kbd>, <Kbd key="s">S</Kbd>, <Kbd key="d">D</Kbd>]} label="Mover token (cima / esquerda / baixo / direita)" note="1 quadrado por vez" />
              </Card>
              <Card title="Fichas">
                <ShortcutRow keys={[<Kbd key="f">F</Kbd>]} label="Abrir / fechar ficha do personagem" />
                <ShortcutRow keys={[<Kbd key="g">G</Kbd>]} label="Abrir / fechar grimório" />
              </Card>
              <Card title="Mapa & Interface">
                <ShortcutRow keys={[<Kbd key="scroll">Scroll ↑↓</Kbd>]} label="Zoom in / Zoom out no mapa" />
                <ShortcutRow keys={[<Kbd key="mid">Botão do meio</Kbd>]} label="Arrastar o mapa (pan)" />
                <ShortcutRow keys={[<Kbd key="del">Del</Kbd>]} label="Deletar token selecionado" note="Apenas Mestre" />
              </Card>
            </div>
          </section>

          {/* ROLAGEM DE DADOS */}
          <section className="mb-16">
            <SectionTitle id="dados" icon={<Dice1 size={18} />} title="Rolagem de Dados" subtitle="Existem três formas de rolar dados na plataforma." />
            <div className="space-y-4">
              <Card title="1. Botões de Dado no Chat">
                <p className="text-[13px] text-[#8a9a8a] mb-3">Na parte inferior do chat há botões coloridos. Clique em qualquer um para rolar imediatamente:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { d: 'D20',  color: 'bg-red-600' },
                    { d: 'D12',  color: 'bg-orange-600' },
                    { d: 'D10',  color: 'bg-yellow-600' },
                    { d: 'D8',   color: 'bg-green-600' },
                    { d: 'D6',   color: 'bg-blue-600' },
                    { d: 'D4',   color: 'bg-purple-600' },
                    { d: 'D100', color: 'bg-pink-700' },
                  ].map(b => (
                    <span key={b.d} className={`${b.color} text-white text-[11px] font-black uppercase px-3 py-1.5 rounded-lg`}>{b.d}</span>
                  ))}
                </div>
              </Card>

              <Card title="2. Comando /r no Chat">
                <p className="text-[13px] text-[#8a9a8a] mb-3">Digite no chat usando a fórmula padrão de dados:</p>
                <CodeBlock>/r (quantidade)d(tipo do dado)</CodeBlock>
                <p className="text-[12px] text-[#4a5a4a] mt-2 mb-3">Com modificador:</p>
                <CodeBlock>/r (quantidade)d(tipo do dado)+(modificador)</CodeBlock>
                <p className="text-[12px] text-[#4a5a4a] font-black uppercase tracking-wider mt-5 mb-3">Exemplos:</p>
                <div className="space-y-0">
                  {[
                    { cmd: '/r 1d20',   desc: 'Rola 1 dado de 20 faces' },
                    { cmd: '/r 1d20+5', desc: 'Rola 1d20 e adiciona +5' },
                    { cmd: '/r 2d6+3',  desc: 'Rola 2 dados de 6 e adiciona +3' },
                    { cmd: '/r 4d6',    desc: 'Rola 4 dados de 6 (geração de atributos)' },
                    { cmd: '/r 1d8-1',  desc: 'Rola 1d8 e subtrai 1' },
                    { cmd: '/r 1d100',  desc: 'Rola percentual (d%)' },
                  ].map(ex => (
                    <div key={ex.cmd} className="flex items-center gap-4 py-2 border-b border-[#1a2a1a]/50 last:border-0">
                      <code className="text-[#00ff66] font-mono text-[13px] bg-black/40 px-2.5 py-1 rounded min-w-[120px]">{ex.cmd}</code>
                      <span className="text-[12px] text-[#6a7a6a]">{ex.desc}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="3. Rolagem pela Ficha">
                <p className="text-[13px] text-[#8a9a8a] mb-3">Clique em qualquer <strong className="text-gray-300">atributo</strong>, <strong className="text-gray-300">perícia</strong> ou <strong className="text-gray-300">salvaguarda</strong> na ficha. Um popup aparece com três opções:</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="border-2 border-red-900/40 bg-red-900/10 rounded-xl p-3 text-center">
                    <p className="text-red-400 font-black text-[11px] uppercase tracking-wider mb-1">Desvantagem</p>
                    <p className="text-[11px] text-[#5a6a5a]">Rola 2d20, usa o <strong className="text-red-400">menor</strong></p>
                  </div>
                  <div className="border-2 border-[#00ff66]/40 bg-[#00ff66]/10 rounded-xl p-3 text-center">
                    <p className="text-[#00ff66] font-black text-[11px] uppercase tracking-wider mb-1">Normal</p>
                    <p className="text-[11px] text-[#5a6a5a]">Rola 1d20 + modificador</p>
                  </div>
                  <div className="border-2 border-emerald-700/40 bg-emerald-900/10 rounded-xl p-3 text-center">
                    <p className="text-emerald-400 font-black text-[11px] uppercase tracking-wider mb-1">Vantagem</p>
                    <p className="text-[11px] text-[#5a6a5a]">Rola 2d20, usa o <strong className="text-emerald-400">maior</strong></p>
                  </div>
                </div>
                <p className="text-[12px] text-[#4a5a4a] mt-3">O resultado aparece no chat para todos verem.</p>
              </Card>
            </div>
          </section>

          {/* CHAT & COMANDOS */}
          <section className="mb-10">
            <SectionTitle id="chat" icon={<MessageSquare size={18} />} title="Chat & Comandos" subtitle="O chat tem duas abas: Campanha (todos veem) e Fichas (rolagens de atributos do personagem)." />
            <div className="space-y-4">
              <Card title="Enviar Mensagem">
                <p className="text-[13px] text-[#8a9a8a]">Digite no campo de texto e pressione <Kbd>Enter</Kbd> ou clique no botão enviar.</p>
              </Card>
              <Card title="Todos os Comandos">
                <div className="space-y-0">
                  {[
                    { cmd: '/r NdN',    desc: 'Rola dados. Ex: /r 2d6+3' },
                    { cmd: '/r NdN+X',  desc: 'Rola dados com modificador positivo' },
                    { cmd: '/r NdN-X',  desc: 'Rola dados com modificador negativo' },
                  ].map(ex => (
                    <div key={ex.cmd} className="flex items-center gap-4 py-2.5 border-b border-[#1a2a1a]/50 last:border-0">
                      <code className="text-[#00ff66] font-mono text-[13px] bg-black/40 px-2.5 py-1 rounded min-w-[130px]">{ex.cmd}</code>
                      <span className="text-[12px] text-[#6a7a6a]">{ex.desc}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card title="Rolagem Secreta">
                <p className="text-[13px] text-[#8a9a8a]">No popup de rolagem, há um ícone de <strong className="text-gray-300">olho</strong>. Ative para que apenas o Mestre veja o resultado. Útil para Furtividade, Enganação e percepções secretas.</p>
              </Card>
            </div>
          </section>

        </div>
      </div>

      <Footer />
    </main>
  );
}