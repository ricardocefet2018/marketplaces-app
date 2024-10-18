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
import { IUserSettings } from "../../shared/types";

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

  @OneToOne(() => User, (user) => user.userSettings, {
    nullable: false,
  })
  @JoinColumn()
  user: User;

  @CreateDateColumn()
  createDate: Date;

  @UpdateDateColumn()
  updateDate: Date;
}
