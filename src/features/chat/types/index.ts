export interface Message {
  id: string;
  campaign_id?: string;
  user_name: string;
  sender_id?: string;
  receiver_id?: string | null;
  text: string;
  is_roll: boolean;
  is_secret: boolean;
  channel: string;
  created_at: string;
  dice_type?: string | null;
}

export interface PlayerInfo {
  userId: string;
  displayName: string;
  characterName: string | null;
}

export type RollResult = { values: number[]; finalValue: number };
