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
export class WaxpeerSettings extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, type: "text", default: "" })
  apiKey: string;

  @Column({ nullable: true, default: false, type: "boolean" })
  state: boolean;

  // TODO limit this array to 1000(?) chars, default limitation on sqlite is 10^9 chars
  @Column({
    type: "simple-array",
    default: "",
  })
  sentTrades: string[];

  @OneToOne(() => User, (user) => user.waxpeerSettings, {
    nullable: false,
  })
  @JoinColumn()
  user: User;

  @CreateDateColumn()
  createDate: Date;

  @UpdateDateColumn()
  updateDate: Date;
}
