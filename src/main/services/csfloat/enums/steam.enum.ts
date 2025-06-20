export enum ETradeStatusSteam {
  Init = 0,
  PreCommitted = 1,
  Committed = 2,
  Complete = 3,
  Failed = 4,
  PartialSupportRollback = 5,
  FullSupportRollback = 6,
  SupportRollback_Selective = 7,
  RollbackFailed = 8,
  RollbackAbandoned = 9,
  InEscrow = 10,
  EscrowRollback = 11,
}

export enum AppId {
  CSGO = 730,
}
