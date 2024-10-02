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

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, type: "text" })
  username: string;

  @Column("text")
  refreshToken: string;

  @Column({ nullable: true, type: "text" })
  proxy?: string;

  @CreateDateColumn()
  createDate: Date;

  @UpdateDateColumn()
  updateDate: Date;

  @OneToOne(() => WaxpeerSettings, (waxpeerSettings) => waxpeerSettings.user, {
    cascade: true,
    eager: true,
    nullable: false,
  })
  waxpeerSettings: WaxpeerSettings;

  public constructor(username?: string, proxy?: string) {
    super();
    this.username = username;
    this.proxy = proxy;
    this.waxpeerSettings = new WaxpeerSettings();
  }
}

@Entity()
export class WaxpeerSettings extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, type: "text" })
  apiKey: string;

  @Column({ nullable: true, default: false, type: "boolean" })
  state: boolean;

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
