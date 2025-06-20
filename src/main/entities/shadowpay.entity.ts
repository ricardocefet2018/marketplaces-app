import { Entity, JoinColumn, OneToOne, Column } from "typeorm";
import { BaseMarket } from "../models/base-market";
import { User } from "./user.entity";

@Entity()
export class Shadowpay extends BaseMarket {
  @OneToOne(() => User, (user) => user.shadowpay, {
    nullable: false,
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn()
  user: User;

  @Column("boolean", { default: false })
  canSell = false;
}
