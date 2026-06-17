/**
 * Roteamento Next.js — delega toda a lógica para src/features/mesa/MesaPage.tsx
 * O campaignId é lido via useParams() dentro do MesaPage.
 */
import MesaPage from '@/features/mesa/MesaPage';

export default function Page() {
  return <MesaPage />;
}
