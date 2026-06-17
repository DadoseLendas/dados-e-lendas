-- ============================================================
-- DADOS & LENDAS — POLÍTICAS RLS COMPLETAS
-- Baseado no schema real do projeto (07/06/2026)
-- 
-- COMO APLICAR:
--   Supabase Dashboard → SQL Editor → colar e executar.
--
-- IMPORTANTE: Verifique se não há políticas conflitantes antes.
-- Para listar existentes: SELECT * FROM pg_policies;
-- ============================================================

-- ============================================================
-- 1. TABELA: profiles
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler perfis (necessário para exibir nomes no chat/mesa)
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Usuário só pode inserir/atualizar/deletar o próprio perfil
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (id = auth.uid());

-- ============================================================
-- 2. TABELA: characters
-- ============================================================
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- Dono lê os próprios personagens
CREATE POLICY "characters_select_own"
  ON public.characters FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- DM pode ler personagens de membros de suas campanhas (para exibir fichas na mesa)
CREATE POLICY "characters_select_dm"
  ON public.characters FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT cm.current_character_id
      FROM public.campaign_members cm
      JOIN public.campaigns cp ON cp.id = cm.campaign_id
      WHERE cp.dm_id = auth.uid()
        AND cm.current_character_id IS NOT NULL
    )
  );

CREATE POLICY "characters_insert_own"
  ON public.characters FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "characters_update_own"
  ON public.characters FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "characters_delete_own"
  ON public.characters FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================
-- 3. TABELA: campaigns
-- ============================================================
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- DM ou membro pode ler a campanha
CREATE POLICY "campaigns_select_member_or_dm"
  ON public.campaigns FOR SELECT
  TO authenticated
  USING (
    dm_id = auth.uid()
    OR id IN (
      SELECT campaign_id FROM public.campaign_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "campaigns_insert_own"
  ON public.campaigns FOR INSERT
  TO authenticated
  WITH CHECK (dm_id = auth.uid());

CREATE POLICY "campaigns_update_dm"
  ON public.campaigns FOR UPDATE
  TO authenticated
  USING (dm_id = auth.uid());

CREATE POLICY "campaigns_delete_dm"
  ON public.campaigns FOR DELETE
  TO authenticated
  USING (dm_id = auth.uid());

-- ============================================================
-- 4. TABELA: campaign_members
-- ============================================================
ALTER TABLE public.campaign_members ENABLE ROW LEVEL SECURITY;

-- Membro vê seu próprio registro; DM vê todos os membros de suas campanhas
CREATE POLICY "campaign_members_select"
  ON public.campaign_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR campaign_id IN (
      SELECT id FROM public.campaigns WHERE dm_id = auth.uid()
    )
  );

-- Usuário entra em campanha (INSERT com user_id = auth.uid())
CREATE POLICY "campaign_members_insert_own"
  ON public.campaign_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Membro atualiza apenas o próprio registro (ex: trocar personagem vinculado)
CREATE POLICY "campaign_members_update_own"
  ON public.campaign_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Membro sai da campanha ou DM remove membro
CREATE POLICY "campaign_members_delete"
  ON public.campaign_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR campaign_id IN (
      SELECT id FROM public.campaigns WHERE dm_id = auth.uid()
    )
  );

-- ============================================================
-- 5. TABELA: campaign_tokens
-- ============================================================
ALTER TABLE public.campaign_tokens ENABLE ROW LEVEL SECURITY;

-- DM e membros leem os tokens da campanha
CREATE POLICY "campaign_tokens_select_members"
  ON public.campaign_tokens FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE dm_id = auth.uid()
      UNION
      SELECT campaign_id FROM public.campaign_members WHERE user_id = auth.uid()
    )
  );

-- Apenas DM cria/atualiza/deleta tokens
CREATE POLICY "campaign_tokens_insert_dm"
  ON public.campaign_tokens FOR INSERT
  TO authenticated
  WITH CHECK (
    campaign_id IN (SELECT id FROM public.campaigns WHERE dm_id = auth.uid())
  );

CREATE POLICY "campaign_tokens_update_dm"
  ON public.campaign_tokens FOR UPDATE
  TO authenticated
  USING (
    campaign_id IN (SELECT id FROM public.campaigns WHERE dm_id = auth.uid())
  );

CREATE POLICY "campaign_tokens_delete_dm"
  ON public.campaign_tokens FOR DELETE
  TO authenticated
  USING (
    campaign_id IN (SELECT id FROM public.campaigns WHERE dm_id = auth.uid())
  );

-- ============================================================
-- 6. TABELA: chat_messages
-- ============================================================
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Membros e DM leem mensagens públicas da campanha;
-- mensagens secretas (is_secret=true) só o remetente e o DM veem
CREATE POLICY "chat_messages_select"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    -- Deve ser membro ou DM da campanha
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE dm_id = auth.uid()
      UNION
      SELECT campaign_id FROM public.campaign_members WHERE user_id = auth.uid()
    )
    -- Filtra mensagens secretas
    AND (
      is_secret = false
      OR sender_id = auth.uid()
      OR campaign_id IN (SELECT id FROM public.campaigns WHERE dm_id = auth.uid())
    )
  );

-- Apenas membros/DM da campanha enviam mensagens como si mesmos
CREATE POLICY "chat_messages_insert"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND campaign_id IN (
      SELECT id FROM public.campaigns WHERE dm_id = auth.uid()
      UNION
      SELECT campaign_id FROM public.campaign_members WHERE user_id = auth.uid()
    )
  );

-- Usuário não deve alterar mensagens enviadas (integridade do histórico)
-- UPDATE e DELETE não são permitidos por padrão (sem política = bloqueado quando RLS ativo)

-- ============================================================
-- 7. TABELA: campaign_books
-- ============================================================
ALTER TABLE public.campaign_books ENABLE ROW LEVEL SECURITY;

-- Membros e DM leem os livros da campanha
CREATE POLICY "campaign_books_select"
  ON public.campaign_books FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE dm_id = auth.uid()
      UNION
      SELECT campaign_id FROM public.campaign_members WHERE user_id = auth.uid()
    )
  );

-- Apenas DM adiciona livros
CREATE POLICY "campaign_books_insert_dm"
  ON public.campaign_books FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND campaign_id IN (SELECT id FROM public.campaigns WHERE dm_id = auth.uid())
  );

CREATE POLICY "campaign_books_delete_dm"
  ON public.campaign_books FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR campaign_id IN (SELECT id FROM public.campaigns WHERE dm_id = auth.uid())
  );

-- ============================================================
-- 8. TABELA: campaign_logs
-- ============================================================
ALTER TABLE public.campaign_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaign_logs_select"
  ON public.campaign_logs FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE dm_id = auth.uid()
      UNION
      SELECT campaign_id FROM public.campaign_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "campaign_logs_insert"
  ON public.campaign_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    player_id = auth.uid()
    AND campaign_id IN (
      SELECT id FROM public.campaigns WHERE dm_id = auth.uid()
      UNION
      SELECT campaign_id FROM public.campaign_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 9. TABELA: spell_catalog
-- ============================================================
ALTER TABLE public.spell_catalog ENABLE ROW LEVEL SECURITY;

-- Magias globais (campaign_id IS NULL, visibility='global') são públicas para todos
-- Magias de campanha são visíveis apenas para membros/DM daquela campanha
-- Magias do próprio usuário são sempre visíveis
CREATE POLICY "spell_catalog_select"
  ON public.spell_catalog FOR SELECT
  TO authenticated
  USING (
    visibility = 'global'
    OR created_by = auth.uid()
    OR campaign_id IN (
      SELECT id FROM public.campaigns WHERE dm_id = auth.uid()
      UNION
      SELECT campaign_id FROM public.campaign_members WHERE user_id = auth.uid()
    )
  );

-- Qualquer usuário autenticado pode criar magia (global ou de campanha onde é DM)
CREATE POLICY "spell_catalog_insert"
  ON public.spell_catalog FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      campaign_id IS NULL  -- magia global
      OR campaign_id IN (SELECT id FROM public.campaigns WHERE dm_id = auth.uid())
    )
  );

CREATE POLICY "spell_catalog_update_own"
  ON public.spell_catalog FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "spell_catalog_delete_own"
  ON public.spell_catalog FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- ============================================================
-- 10. ALTER TABLE: adicionar colunas LGPD em profiles
--     (registro de consentimento — LGPD Art. 8°)
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version TEXT DEFAULT '1.0';

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
