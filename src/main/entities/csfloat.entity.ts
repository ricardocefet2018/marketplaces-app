import { Entity, JoinColumn, OneToOne, Column } from "typeorm";
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

  @Column("boolean", { default: false })
  canSell = false;

  @Column({
    type: "simple-array",
    default: "",
  })
  notAccept: string[];
}
