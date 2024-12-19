import { Entity, JoinColumn, OneToOne } from "typeorm";
import { BaseMarket } from "../models/base-market";
import { User } from "./user.entity";

@Entity()
export class Shadowpay extends BaseMarket {
  @OneToOne(() => User, (user) => user.shadowpay, {
    nullable: false,
  })
  @JoinColumn()
  user: User;
}
