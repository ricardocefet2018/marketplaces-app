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
export class ShadowpaySettings extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, type: "text", default: "" })
  apiKey: string;

  @Column({ nullable: false, type: "boolean", default: false })
  state: boolean;

  @Column({
    type: "simple-array",
    default: "",
  })
  sentTrades: string[];

  @OneToOne(() => User, (user) => user.shadowpaySettings, {
    nullable: false,
  })
  @JoinColumn()
  user: User;

  @CreateDateColumn()
  createDate: Date;

  @UpdateDateColumn()
  updateDate: Date;
}
