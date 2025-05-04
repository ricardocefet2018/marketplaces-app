import { Entity, JoinColumn, OneToOne } from "typeorm";
import { User } from "./user.entity";
import { BaseMarket } from "../models/base-market";

@Entity()
export class CSFloat extends BaseMarket {
  @OneToOne(() => User, (user) => user.csfloat, {
    nullable: false,
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn()
  user: User;

  canSell: boolean = false;
}
