export enum EStatusTradeCSFLOAT {
  QUEUED = "queued",
  PENDING = "pending",
  VERIFIED = "verified",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum EContractStateCSFloat {
  SOLD = "sold",
  LISTED = "listed",
  DELISTED = "delisted",
  REFUNDED = "refunded",
}

export enum EContractTypeCSFloat {
  BUY_NOW = "buy_now",
  AUCTION = "auction",
}

export enum ETradeOfferStateCSFloat {
  Invalid = 1,
  Active = 2,
  Accepted = 3,
  Countered = 4,
  Expired = 5,
  Canceled = 6,
  Declined = 7,
  InvalidItems = 8,
  CreatedNeedsConfirmation = 9,
  CancelledBySecondFactor = 10,
  InEscrow = 11,
}
