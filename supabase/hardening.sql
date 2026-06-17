-- =====================================================================
-- Dados & Lendas — HARDENING DE RLS + LGPD (consolidado)
-- Fecha os achados da auditoria que dependem do BANCO:
--   T-04 (IDOR tokens/characters), T-06 (mensagens secretas server-side),
--   T-11 (registro de consentimento), T-14 (retenção/anonimização),
--   + realtime do chat, entrar-por-código sem vazar códigos, DM edita ficha.
-- Idempotente. Rode inteiro no SQL Editor do Supabase.
-- =====================================================================

BEGIN;

-- RLS ligado (no-op se já estiver)
ALTER TABLE public.chat_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_tokens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns        ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- Funções SECURITY DEFINER (evitam recursão de RLS)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_campaign_members(p_campaign uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.campaign_members m
                 WHERE m.campaign_id = p_campaign AND m.user_id = (SELECT auth.uid()))
      OR EXISTS (SELECT 1 FROM public.campaigns c
                 WHERE c.id = p_campaign AND c.dm_id = (SELECT auth.uid()));
$fn$;

CREATE OR REPLACE FUNCTION public.is_campaign_dm(p_campaign uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.campaigns c
                 WHERE c.id = p_campaign AND c.dm_id = (SELECT auth.uid()));
$fn$;

CREATE OR REPLACE FUNCTION public.find_campaign_by_code(p_code text)
RETURNS TABLE (id uuid, name text, code text, dm_id uuid, image_url text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $fn$
  SELECT c.id, c.name, c.code, c.dm_id, c.image_url, c.created_at
  FROM public.campaigns c WHERE c.code = upper(trim(p_code)) LIMIT 1;
$fn$;
REVOKE ALL ON FUNCTION public.find_campaign_by_code(text) FROM public;
GRANT EXECUTE ON FUNCTION public.find_campaign_by_code(text) TO authenticated;

-- ---------------------------------------------------------------------
-- T-06: CHAT — leitura segura. Precisa ser membro/DM da campanha E
--       (mensagem pública OU própria OU você é o DM). Fecha o vazamento
--       de rolagens secretas via API direta.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir leitura pública do chat"      ON public.chat_messages;
DROP POLICY IF EXISTS "Permitir envio de mensagens"           ON public.chat_messages;
DROP POLICY IF EXISTS "Leitura restrita aos membros e mestre" ON public.chat_messages;
DROP POLICY IF EXISTS "Envio restrito aos membros e mestre"   ON public.chat_messages;
DROP POLICY IF EXISTS "chat_select_secure" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_insert_member" ON public.chat_messages;

CREATE POLICY "chat_select_secure" ON public.chat_messages
  FOR SELECT TO authenticated USING (
    (
      EXISTS (SELECT 1 FROM public.campaign_members cm
              WHERE cm.campaign_id = chat_messages.campaign_id AND cm.user_id = auth.uid())
      OR public.is_campaign_dm(chat_messages.campaign_id)
    )
    AND (
      is_secret = false
      OR sender_id = auth.uid()
      OR public.is_campaign_dm(chat_messages.campaign_id)
    )
  );

CREATE POLICY "chat_insert_member" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (
    (sender_id = auth.uid() OR sender_id IS NULL)
    AND (
      EXISTS (SELECT 1 FROM public.campaign_members cm
              WHERE cm.campaign_id = chat_messages.campaign_id AND cm.user_id = auth.uid())
      OR public.is_campaign_dm(chat_messages.campaign_id)
    )
  );

-- ---------------------------------------------------------------------
-- T-04: CAMPAIGN_TOKENS — só membro/DM da campanha lê/escreve; só DM deleta.
--       (RLS é a camada definitiva mesmo quando o client filtra só por id.)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Ver tokens"        ON public.campaign_tokens;
DROP POLICY IF EXISTS "Gerenciar tokens"  ON public.campaign_tokens;
DROP POLICY IF EXISTS "ler tokens"        ON public.campaign_tokens;
DROP POLICY IF EXISTS "inserir tokens"    ON public.campaign_tokens;
DROP POLICY IF EXISTS "atualizar tokens"  ON public.campaign_tokens;
DROP POLICY IF EXISTS "deletar tokens"    ON public.campaign_tokens;

CREATE POLICY "ler tokens" ON public.campaign_tokens
  FOR SELECT TO authenticated USING (public.can_view_campaign_members(campaign_id));
CREATE POLICY "inserir tokens" ON public.campaign_tokens
  FOR INSERT TO authenticated WITH CHECK (public.can_view_campaign_members(campaign_id));
CREATE POLICY "atualizar tokens" ON public.campaign_tokens
  FOR UPDATE TO authenticated USING (public.can_view_campaign_members(campaign_id));
CREATE POLICY "deletar tokens" ON public.campaign_tokens
  FOR DELETE TO authenticated USING (public.is_campaign_dm(campaign_id));

-- ---------------------------------------------------------------------
-- T-04: CHARACTERS — dono controla; DM da campanha pode ver e editar a
--       ficha do jogador (atributos/vida/CA).
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Dono controla personagem"            ON public.characters;
DROP POLICY IF EXISTS "delete_own_characters"               ON public.characters;
DROP POLICY IF EXISTS "DM pode ver personagens da campanha" ON public.characters;
DROP POLICY IF EXISTS "characters_select_own" ON public.characters;
DROP POLICY IF EXISTS "characters_select_dm"  ON public.characters;
DROP POLICY IF EXISTS "characters_insert_own" ON public.characters;
DROP POLICY IF EXISTS "characters_update_own" ON public.characters;
DROP POLICY IF EXISTS "characters_update_dm"  ON public.characters;
DROP POLICY IF EXISTS "characters_delete_own" ON public.characters;

CREATE POLICY "characters_select_own" ON public.characters
  FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "characters_select_dm" ON public.characters
  FOR SELECT TO authenticated USING (
    id IN (SELECT cm.current_character_id FROM public.campaign_members cm
           JOIN public.campaigns c ON c.id = cm.campaign_id
           WHERE c.dm_id = auth.uid() AND cm.current_character_id IS NOT NULL));
CREATE POLICY "characters_insert_own" ON public.characters
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "characters_update_own" ON public.characters
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "characters_update_dm" ON public.characters
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaign_members cm JOIN public.campaigns c ON c.id = cm.campaign_id
                 WHERE cm.current_character_id = characters.id AND c.dm_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.campaign_members cm JOIN public.campaigns c ON c.id = cm.campaign_id
                 WHERE cm.current_character_id = characters.id AND c.dm_id = auth.uid()));
CREATE POLICY "characters_delete_own" ON public.characters
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ---------------------------------------------------------------------
-- CAMPAIGN_MEMBERS — ver co-membros da mesma campanha; remover leitura aberta
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Visualização de membros pública para logados" ON public.campaign_members;
DROP POLICY IF EXISTS "campaign_members_select_same_campaign" ON public.campaign_members;
CREATE POLICY "campaign_members_select_same_campaign" ON public.campaign_members
  FOR SELECT TO authenticated USING (public.can_view_campaign_members(campaign_id));

-- ---------------------------------------------------------------------
-- CAMPAIGNS — fecha vazamento de CÓDIGOS (entrar-por-código usa a RPC)
-- ---------------------------------------------------------------------
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='campaigns'
      AND policyname IN ('usuarios podem ler campanhas','Campaigns: owner or member select','campaigns_select_member_or_dm')) THEN
    CREATE POLICY "campaigns_select_member_or_dm" ON public.campaigns
      FOR SELECT TO authenticated USING (
        dm_id = auth.uid()
        OR id IN (SELECT campaign_id FROM public.campaign_members WHERE user_id = auth.uid()));
  END IF;
END
$do$;
DROP POLICY IF EXISTS "Qualquer um logado vê campanhas" ON public.campaigns;

-- ---------------------------------------------------------------------
-- T-11 (LGPD Art. 8°): colunas para registrar o consentimento
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version     text DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS consent_ip        text;

COMMIT;

-- ---------------------------------------------------------------------
-- T-14 (LGPD Art. 15): anonimização de chat antigo (>12 meses).
--   Rode a função sob demanda, ou agende com pg_cron (se habilitado).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.anonymize_old_chat()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $ret$
  UPDATE public.chat_messages
  SET user_name = 'Aventureiro', sender_id = NULL
  WHERE created_at < now() - interval '12 months' AND sender_id IS NOT NULL;
$ret$;
-- Agendamento opcional (requer extensão pg_cron em Database > Extensions):
-- SELECT cron.schedule('anonimiza-chat-antigo','0 3 * * 0', $$SELECT public.anonymize_old_chat()$$);

-- ---------------------------------------------------------------------
-- Realtime: chat_messages na publicação (rolagens de ficha sem reload)
-- ---------------------------------------------------------------------
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='chat_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END
$do$;

-- =====================================================================
-- Conferência:
--   SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE tablename IN ('chat_messages','campaign_tokens','campaign_members','characters','campaigns')
--   ORDER BY tablename, cmd;
-- =====================================================================
