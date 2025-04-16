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

import { IUserSettings } from "../../shared/types";
import { User } from "./user.entity";

@Entity()
export class UserSettings extends BaseEntity implements IUserSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: false,
    type: "boolean",
    default: true,
  })
  acceptGifts: boolean;

  @Column({
    nullable: false,
    type: "text",
    default: "",
  })
  pendingTradesFilePath: string;

  @OneToOne(() => User, (user) => user.userSettings, {
    nullable: false,
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn()
  user: User;

  @CreateDateColumn()
  createDate: Date;

  @UpdateDateColumn()
  updateDate: Date;
}
