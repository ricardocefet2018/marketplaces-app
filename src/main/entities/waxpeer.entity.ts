import { Entity, JoinColumn, OneToOne } from "typeorm";
import { BaseMarket } from "../models/base-market";
import { User } from "./user.entity";
@Entity()
export class Waxpeer extends BaseMarket {
  @OneToOne(() => User, (user) => user.waxpeer, {
    nullable: false,
  })
  @JoinColumn()
  user: User;
}
