import { Entity, JoinColumn, OneToOne } from "typeorm";
import { User } from "./user.entity";

import { BaseMarket } from "../models/base-market";

@Entity()
export class MarketCSGO extends BaseMarket {
  @OneToOne(() => User, (user) => user.marketcsgo, {
    nullable: false,
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn()
  user: User;

  canSell: boolean;
}
