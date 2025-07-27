import { RecordEntry } from "../history/interface";

export interface LevelUpData {
  characterId: string;
  userId: string;
  level: {
    old: {
      value: number;
    };
    new: {
      value: number;
    };
  };
}

export interface LevelUpReply {
  data: LevelUpData;
  historyRecord: RecordEntry;
}

export interface LevelupRequest {
  initialLevel: number;
}
