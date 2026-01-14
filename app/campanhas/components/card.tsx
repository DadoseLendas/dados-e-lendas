interface CardProps {
  titulo: string;
  data: string;
  papel: string;
  imagem: string;
}

export default function Card({ titulo, data, papel, imagem }: CardProps) {
  return (
    <div 
      className="relative h-44 rounded-2xl bg-cover bg-center p-5 flex flex-col justify-between border border-zinc-800 shadow-lg group overflow-hidden"
      style={{ backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 100%), url('${imagem}')` }}
    >
      <div className="text-white z-10">
        <h2 className="text-xl font-serif font-bold tracking-wide">{titulo}</h2>
        <p className="text-xs text-zinc-400 mt-1">
          Iniciada em: {data} | <span className="font-bold text-zinc-200">{papel}</span>
        </p>
      </div>
      <button className="self-end z-10 bg-white text-black px-6 py-1.5 rounded-lg text-sm font-bold hover:bg-zinc-200 transition-colors">
        Acessar
      </button>
      {/* Efeito de brilho ao passar o mouse */}
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}