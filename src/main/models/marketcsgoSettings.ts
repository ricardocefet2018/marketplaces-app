import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user";

@Entity()
export class MarketcsgoSettings extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, type: "text", default: "" })
  apiKey: string;

  @Column({ nullable: false, type: "boolean", default: false })
  state: boolean;

  // TODO limit this array to 1000(?) chars, default limitation on sqlite is 10^9 chars
  @Column({
    type: "simple-array",
    default: "",
  })
  sentTrades: string[];

  @OneToOne(() => User, (user) => user.marketcsgoSettings, {
    nullable: false,
  })
  @JoinColumn()
  user: User;

  @CreateDateColumn()
  createDate: Date;

  @UpdateDateColumn()
  updateDate: Date;
}
