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

  @Column({ nullable: true, type: "text" })
  apiKey: string;

  @Column({ nullable: true, default: false, type: "boolean" })
  state: boolean;

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
