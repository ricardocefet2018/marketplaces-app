import { Entity, JoinColumn, OneToOne, Column } from "typeorm";
import { BaseMarket } from "../models/base-market";
import { User } from "./user.entity";

@Entity()
export class Waxpeer extends BaseMarket {
  @OneToOne(() => User, (user) => user.waxpeer, {
    nullable: false,
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn()
  user: User;

  @Column("boolean", { default: false })
  canSell = false;
}
