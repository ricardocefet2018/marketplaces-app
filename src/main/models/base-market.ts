import {
  BaseEntity,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export class BaseMarket extends BaseEntity {
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

  @CreateDateColumn()
  createDate: Date;

  @UpdateDateColumn()
  updateDate: Date;
}
