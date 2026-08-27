import type { UserRef } from "../../flavor/domain.js";

type RawAccount = {
  uuid?: string;
  account_id?: string;
  display_name?: string;
  nickname?: string;
  username?: string;
};

export const normalizeUser = (raw: unknown): UserRef => {
  const account = (raw ?? {}) as RawAccount;
  return {
    uuid: account.uuid,
    accountId: account.account_id,
    displayName: account.display_name ?? account.nickname ?? "unknown",
    nickname: account.nickname,
    username: account.username,
  };
};
