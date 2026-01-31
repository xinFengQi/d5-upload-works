/**
 * 投票相关类型定义
 */

export interface Vote {
  /** 投票 ID */
  id: string;
  /** 投票用户 ID */
  userId: string;
  /** 作品 ID */
  workId: string;
  /** 投票时间 */
  createdAt: number;
}

export interface VoteRecord {
  /** 作品 ID */
  workId: string;
  /** 投票用户 ID */
  userId: string;
  /** 投票时间 */
  createdAt: number;
}

export interface WorkWithVotes {
  /** 作品信息 */
  work: {
    id: string;
    userId: string;
    title: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    createdAt: number;
    updatedAt: number;
    /** 创作者名称 */
    creatorName?: string;
  };
  /** 得票数 */
  voteCount: number;
  /** 当前用户是否已投票 */
  hasVoted: boolean;
  /** 当前用户是否是该作品的创作者 */
  isOwner: boolean;
}

export interface VoteRequest {
  /** 作品 ID */
  workId: string;
}

export interface VoteStats {
  /** 作品 ID */
  workId: string;
  /** 得票数 */
  voteCount: number;
  /** 排名 */
  rank?: number;
}
